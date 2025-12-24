/**
 * Hook para conectar y manejar WebSocket de Node-RED
 * 
 * Se conecta automáticamente al montar y se desconecta al desmontar.
 * Actualiza el store de Zustand con los estados de runtime de los nodos.
 */

import { useEffect, useRef, useState } from 'react'
import { getWebSocketClient, type NodeRedWebSocketEvent } from '@/api/websocket'
import { getObservabilityWebSocketClient, isObservabilityAvailable } from '@/api/observabilityWebSocket'
import type { ObservabilityEvent } from '@/types/observability'
import { useCanvasStore } from '@/state/canvasStore'
import { mapNodeRedStatusToRuntimeState } from '@/utils/runtimeStatusMapper'
import { wsLogger } from '@/utils/logger'
import { isTriggerNode, shouldStartNewFrame, shouldEndFrame, createPayloadPreview } from '@/utils/executionFrameManager'
import { BoundedQueue, EventCoalescer, extractNodeIdFromEvent as extractNodeIdFromBackpressure } from '@/utils/backpressure'
import { getPerformanceMonitor } from '@/utils/performance'
import type { FrameStartEvent, NodeInputEvent, NodeOutputEvent, FrameEndEvent, NodeExecutionData } from '@/types/observability'
import {
  mapFrameStartToExecutionFrame,
  mapNodeInputToSnapshot,
  mapNodeOutputToSnapshot,
  mapFrameEndToStats,
  createNodeExecutionData,
  mapSemanticsToRuntimeState,
} from '@/utils/observabilityMapper'
// import type { Edge } from 'reactflow' // No usado actualmente

/**
 * Hook para conectar al WebSocket de Node-RED y recibir eventos de runtime
 * 
 * @param enabled Si está habilitado (por defecto true)
 * @returns Estado de conexión del WebSocket
 */
export function useNodeRedWebSocket(enabled: boolean = true) {
  const setNodeRuntimeState = useCanvasStore((state) => state.setNodeRuntimeState)
  const clearAllRuntimeStates = useCanvasStore((state) => state.clearAllRuntimeStates)
  const setWsConnected = useCanvasStore((state) => state.setWsConnected)
  const wsConnected = useCanvasStore((state) => state.wsConnected)
  const addExecutionLog = useCanvasStore((state) => state.addExecutionLog)
  const setActiveEdge = useCanvasStore((state) => state.setActiveEdge)
  const clearActiveEdges = useCanvasStore((state) => state.clearActiveEdges)
  const setAnimatedEdge = useCanvasStore((state) => state.setAnimatedEdge)
  const setWsEventQueueSize = useCanvasStore((state) => state.setWsEventQueueSize)
  const edges = useCanvasStore((state) => state.edges)
  const nodes = useCanvasStore((state) => state.nodes)
  const nodeRedNodes = useCanvasStore((state) => state.nodeRedNodes)
  
  // Execution Frames
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const executionFramesEnabled = useCanvasStore((state) => state.executionFramesEnabled)
  const startFrame = useCanvasStore((state) => state.startFrame)
  const endFrame = useCanvasStore((state) => state.endFrame)
  const addNodeSnapshot = useCanvasStore((state) => state.addNodeSnapshot)
  
  const clientRef = useRef<ReturnType<typeof getWebSocketClient> | null>(null)
  const observabilityClientRef = useRef<ReturnType<typeof getObservabilityWebSocketClient> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const observabilityUnsubscribeRef = useRef<(() => void) | null>(null)
  const nodeExecutionStartTimes = useRef<Map<string, number>>(new Map())
  const lastEventTimeRef = useRef<number>(Date.now())
  const frameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Estado para saber si estamos usando observability
  const [useObservability, setUseObservability] = useState<boolean | null>(null)
  
  // Backpressure: Cola acotada y coalescedor de eventos
  const eventQueue = useRef(new BoundedQueue<NodeRedWebSocketEvent>(1000))
  const eventCoalescer = useRef(new EventCoalescer())
  
  // Map para almacenar NodeExecutionData por frame y nodo (para observability)
  const frameNodesDataRef = useRef<Map<string, Map<string, NodeExecutionData>>>(new Map())
  
  // Cola global de edges para activación secuencial
  const globalEdgeQueue = useRef<Array<{ edgeId: string; source: string; target: string; timestamp: number }>>([])
  const isProcessingEdgeQueue = useRef<boolean>(false)
  const queuedEdgeIds = useRef<Set<string>>(new Set()) // Para dedupe
  const edgeActivationTimes = useRef<Map<string, number>>(new Map()) // Para rastrear cuándo se activó cada edge
  
  // Función helper para encolar edges (con dedupe solo por cola, no por estado verde)
  const enqueueEdge = (edgeId: string, source: string, target: string) => {
    // Evitar duplicados: solo verificar si ya está en la cola
    // NO bloquear si ya está verde (permite re-animación)
    if (queuedEdgeIds.current.has(edgeId)) {
      return // Ya está en la cola
    }
    
    // Agregar a la cola con timestamp para detectar flujos rápidos
    globalEdgeQueue.current.push({ edgeId, source, target, timestamp: Date.now() })
    queuedEdgeIds.current.add(edgeId)
    
    // Iniciar procesamiento si no está en curso
    processGlobalEdgeQueue()
  }
  
  // Función para procesar la cola global de edges secuencialmente
  const processGlobalEdgeQueue = () => {
    if (isProcessingEdgeQueue.current) return // Ya hay un procesamiento en curso
    if (globalEdgeQueue.current.length === 0) {
      // Si no hay más edges, limpiar el edge animado
      setAnimatedEdge(null)
      return
    }
    
    isProcessingEdgeQueue.current = true
    
    // Procesar todos los edges en la cola en el mismo tick
    // El último será el que muestre el punto animado
    while (globalEdgeQueue.current.length > 0) {
      const edge = globalEdgeQueue.current.shift()!
      queuedEdgeIds.current.delete(edge.edgeId) // Remover del set de encolados
      
      const activationTime = Date.now()
      const timeSinceEnqueue = activationTime - edge.timestamp
      
      console.log('✨ [WebSocket] Procesando edge de la cola global:', {
        edgeId: edge.edgeId,
        source: edge.source,
        target: edge.target,
        queueLength: globalEdgeQueue.current.length,
        timeSinceEnqueue
      })
      
      // ✅ Verde persistente (marcar como verde)
      setActiveEdge(edge.edgeId, true)
      edgeActivationTimes.current.set(edge.edgeId, activationTime)
      
      // ✅ SOLO UNO con punto animado (el último procesado en este tick)
      setAnimatedEdge(edge.edgeId)
    }
    
    isProcessingEdgeQueue.current = false
  }

  // Detectar disponibilidad del plugin de observability
  useEffect(() => {
    if (!enabled) return
    
    let mounted = true
    
    isObservabilityAvailable().then((available) => {
      if (mounted) {
        setUseObservability(available)
        wsLogger(`[Observability] Plugin ${available ? 'disponible' : 'no disponible'}, usando ${available ? 'observability' : 'WebSocket estándar'}`)
      }
    })
    
    return () => {
      mounted = false
    }
  }, [enabled])

  useEffect(() => {
    // console.log('🎣 [useNodeRedWebSocket] Hook montado, enabled:', enabled)
    
    if (!enabled) {
      wsLogger('WebSocket deshabilitado')
      // console.log('⚠️ [useNodeRedWebSocket] WebSocket deshabilitado')
      return
    }

    // Esperar a que se determine si usar observability
    if (useObservability === null) {
      return
    }

    // Obtener o crear el cliente WebSocket apropiado
    // Si observability está disponible, usarlo; sino usar WebSocket estándar
    let client: ReturnType<typeof getWebSocketClient> | null = null
    let observabilityClient: ReturnType<typeof getObservabilityWebSocketClient> | null = null
    
    if (useObservability) {
      observabilityClient = getObservabilityWebSocketClient()
      observabilityClientRef.current = observabilityClient
      wsLogger('[Observability] Usando plugin de observability')
    } else {
      client = getWebSocketClient()
      clientRef.current = client
      wsLogger('[WebSocket] Usando WebSocket estándar de Node-RED')
    }

    // Helper para encontrar edges conectados a un nodo (comentado por ahora)
    // const findEdgesForNode = (nodeId: string): Edge[] => {
    //   return edges.filter(e => e.source === nodeId || e.target === nodeId)
    // }

    // Helper para obtener información del nodo
    const getNodeInfo = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId)
      return {
        name: node?.data?.label || nodeId,
        type: node?.data?.nodeRedType || 'unknown',
        subflowDefinition: node?.data?.subflowDefinition,
      }
    }
    
    // Helper para obtener la definición de subflow desde una instancia
    const getSubflowDefinition = (nodeId: string, nodeType?: string) => {
      // Primero intentar desde el nodo React Flow
      const node = nodes.find(n => n.id === nodeId)
      if (node?.data?.subflowDefinition) {
        return node.data.subflowDefinition
      }
      
      // Si no, buscar en nodeRedNodes
      if (nodeType && nodeType.startsWith('subflow:')) {
        const subflowId = nodeType.replace('subflow:', '')
        const subflowDef = nodeRedNodes.find(
          (n): n is import('@/api/types').NodeRedSubflowDefinition => 
            n.type === 'subflow' && n.id === subflowId
        )
        return subflowDef || null
      }
      
      return null
    }

    // Helper para encontrar todos los edges en una cadena desde un nodo inicial
    const findEdgeChain = (startNodeId: string, visited: Set<string> = new Set()): string[] => {
      if (visited.has(startNodeId)) {
        return [] // Evitar ciclos infinitos
      }
      visited.add(startNodeId)
      
      const edgeChain: string[] = []
      const outgoingEdges = edges.filter(e => e.source === startNodeId)
      
      outgoingEdges.forEach(edge => {
        edgeChain.push(edge.id)
        // Recursivamente encontrar edges de los nodos destino
        const targetChain = findEdgeChain(edge.target, visited)
        edgeChain.push(...targetChain)
      })
      
      return edgeChain
    }

    // Helper para gestionar Execution Frames y guardar snapshots
    const handleFrameLogic = (event: NodeRedWebSocketEvent, nodeId: string | null, nodeType?: string) => {
      // Actualizar tiempo del último evento
      lastEventTimeRef.current = Date.now()

      // Limpiar timeout anterior
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current)
        frameTimeoutRef.current = null
      }

      // Obtener frame actual del store
      const currentFrameState = useCanvasStore.getState().currentFrame

      // Verificar si debemos crear un nuevo frame
      const shouldStart = shouldStartNewFrame(event, currentFrameState)
      if (shouldStart && executionFramesEnabled) {
        // Verificar si es un trigger node
        const isTrigger = nodeType ? isTriggerNode(nodeType) : false
        const triggerNodeId = isTrigger && nodeId ? nodeId : undefined
        const label = isTrigger ? `Triggered by ${nodeType}` : 'Manual execution'
        
        startFrame(triggerNodeId, label)
      }

      // Obtener frame actualizado después de posible creación (o usar el existente)
      let frame = useCanvasStore.getState().currentFrame
      
      // Si no hay frame pero tenemos datos, crear uno automáticamente para capturar los datos
      if (!frame && nodeId) {
        if (executionFramesEnabled) {
          const isTrigger = nodeType ? isTriggerNode(nodeType) : false
          const triggerNodeId = isTrigger ? nodeId : undefined
          const label = isTrigger ? `Triggered by ${nodeType}` : 'Auto frame'
          startFrame(triggerNodeId, label)
          frame = useCanvasStore.getState().currentFrame
        } else {
          // Si execution frames está deshabilitado, crear un frame temporal solo para snapshots
          // Usar un ID temporal que no se guarde en frames[]
          frame = {
            id: `temp-${Date.now()}`,
            startedAt: Date.now(),
            label: 'Temporary frame',
          }
        }
      }

      // Guardar snapshot si tenemos frame y nodeId
      if (frame && nodeId) {
        const payload = event.data?.msg?.payload || event.data?.payload || event.payload
        const payloadPreview = payload ? createPayloadPreview(payload) : undefined

        addNodeSnapshot({
          nodeId,
          frameId: frame.id,
          status: nodeType && isTriggerNode(nodeType) ? 'running' : 'idle',
          ts: Date.now(),
          summary: event.topic === 'debug' ? 'Debug event' : `Status: ${event.topic}`,
          payloadPreview,
        })
      }

      // Programar cierre del frame si no hay más eventos (solo si execution frames está habilitado)
      const frameForTimeout = useCanvasStore.getState().currentFrame
      if (frameForTimeout && executionFramesEnabled) {
        frameTimeoutRef.current = setTimeout(() => {
          const currentFrameState = useCanvasStore.getState().currentFrame
          if (currentFrameState && shouldEndFrame(currentFrameState, lastEventTimeRef.current, 5000)) {
            endFrame(currentFrameState.id)
          }
        }, 5000) // 5 segundos de timeout
      }
    }

    // Configurar coalescer para procesar eventos en batch
    eventCoalescer.current.setProcessCallback((events: NodeRedWebSocketEvent[]) => {
      // Procesar todos los eventos coalescidos
      events.forEach(event => {
        processEvent(event)
      })
    })

    // Handler interno que procesa eventos (llamado desde coalescer)
    const processEvent = (event: NodeRedWebSocketEvent) => {
      // Registrar evento para métricas de performance
      if (import.meta.env.DEV) {
        const monitor = getPerformanceMonitor()
        monitor.recordEvent()
      }
      
      try {
        // Node-RED envía eventos de status con topic 'status/nodeId'
        // El formato es: topic: 'status/function_running', data: { fill: 'green', ... }
        if (event.topic.startsWith('status/')) {
          const nodeId = event.topic.replace('status/', '')
          const statusData = event.data || event.payload
          
          // console.log('📊 [NODO] Estado recibido:', { nodeId, status: statusData })
          
          if (!nodeId) {
            return
          }

          // Obtener información del nodo para Execution Frames
          const nodeInfo = getNodeInfo(nodeId)
          
          // Gestionar Execution Frames
          handleFrameLogic(event, nodeId, nodeInfo.type)

          // Crear un objeto compatible con NodeRedStatusEvent
          const statusEvent = {
            id: nodeId,
            status: statusData
          }

          // Mapear el estado de Node-RED a estado visual
          const runtimeState = mapNodeRedStatusToRuntimeState(statusEvent)
          
          if (runtimeState) {
            setNodeRuntimeState(nodeId, runtimeState)
            
            // Guardar snapshot siempre (crear frame si no existe)
            let frame = useCanvasStore.getState().currentFrame
            if (!frame) {
              if (executionFramesEnabled) {
                const nodeInfo = getNodeInfo(nodeId)
                const isTrigger = nodeInfo.type ? isTriggerNode(nodeInfo.type) : false
                const triggerNodeId = isTrigger ? nodeId : undefined
                const label = isTrigger ? `Triggered by ${nodeInfo.type}` : 'Auto frame'
                startFrame(triggerNodeId, label)
                frame = useCanvasStore.getState().currentFrame
              } else {
                frame = {
                  id: `temp-${Date.now()}`,
                  startedAt: Date.now(),
                  label: 'Temporary frame',
                }
              }
            }
            
            if (frame) {
              const payload = statusData?.payload || statusData?.msg?.payload || statusData
              const payloadPreview = payload ? createPayloadPreview(payload) : undefined
              
              addNodeSnapshot({
                nodeId,
                frameId: frame.id,
                status: runtimeState,
                ts: Date.now(),
                summary: statusData?.text || `Status: ${runtimeState}`,
                payloadPreview,
              })
            }
            
            // Si el nodo está en estado "running", activar sus edges de salida
            if (runtimeState === 'running') {
              // Marcar inicio de ejecución
              if (!nodeExecutionStartTimes.current.has(nodeId)) {
                nodeExecutionStartTimes.current.set(nodeId, Date.now())
              }
              
              // Encolar edges de salida del nodo para activación secuencial
              const outgoingEdges = edges.filter(e => e.source === nodeId)
              if (outgoingEdges.length > 0) {
                console.log('✨ [WebSocket] Nodo en estado RUNNING - Encolando edges:', {
                  nodeId,
                  nodeName: getNodeInfo(nodeId).name,
                  edgesCount: outgoingEdges.length,
                  edgeIds: outgoingEdges.map(e => e.id),
                  targets: outgoingEdges.map(e => ({ target: e.target, targetName: getNodeInfo(e.target).name }))
                })
                
                // Encolar todos los edges (enqueueEdge maneja dedupe y procesamiento)
                outgoingEdges.forEach(edge => {
                  enqueueEdge(edge.id, edge.source, edge.target)
                })
              } else {
                console.log('⚠️ [WebSocket] Nodo running sin edges de salida:', {
                  nodeId,
                  nodeName: getNodeInfo(nodeId).name
                })
              }
            }
            
            // Agregar log de ejecución
            const nodeInfo = getNodeInfo(nodeId)
            const startTime = nodeExecutionStartTimes.current.get(nodeId)
            const duration = startTime ? Date.now() - startTime : undefined
            
            addExecutionLog({
              nodeId,
              nodeName: nodeInfo.name,
              nodeType: nodeInfo.type,
              level: runtimeState === 'error' ? 'error' : 
                     runtimeState === 'warning' ? 'warning' : 
                     runtimeState === 'running' ? 'info' : 'success',
              message: statusData?.text || `Estado: ${runtimeState}`,
              duration,
              data: statusData, // Incluir datos del status
            })
            
            wsLogger(`Estado actualizado para nodo ${nodeId}:`, runtimeState)
          } else {
            // Si no hay estado, limpiar
            setNodeRuntimeState(nodeId, null)
          }
        }
        // Eventos de debug (mensajes que pasan por los nodos)
        else if (event.topic === 'debug' && event.data) {
          const debugData = event.data
          console.log('🔍 [WebSocket] Procesando evento debug:', {
            debugData,
            node: debugData.node,
            nodeid: debugData.nodeid,
            id: debugData.id,
            msg: debugData.msg
          })
          
          // En eventos de debug, el mensaje está pasando por un nodo
          // Necesitamos activar TODA la cadena de edges desde el nodo fuente hasta el destino
          const targetNodeId = debugData.id // ID del nodo que recibe el mensaje
          const sourceNodeId = debugData.node || debugData.nodeid // ID del nodo que generó el mensaje
          
          // Extraer payload del mensaje
          const msgPayload = debugData.msg?.payload || debugData.msg
          const payloadPreview = msgPayload ? createPayloadPreview(msgPayload) : undefined
          
          // Gestionar Execution Frames y guardar snapshot para el nodo FUENTE (OUTPUT)
          if (sourceNodeId) {
            const sourceNodeInfo = getNodeInfo(sourceNodeId)
            handleFrameLogic(event, sourceNodeId, sourceNodeInfo.type)
            
            // Guardar snapshot del OUTPUT del nodo fuente
            const frame = useCanvasStore.getState().currentFrame
            if (frame || !executionFramesEnabled) {
              // Crear frame temporal si no existe
              let effectiveFrame = frame
              if (!effectiveFrame) {
                const tempFrameId = `temp-${Date.now()}`
                effectiveFrame = {
                  id: tempFrameId,
                  startedAt: Date.now(),
                  label: 'Auto frame',
                }
              }
              
              addNodeSnapshot({
                nodeId: sourceNodeId,
                frameId: effectiveFrame.id,
                status: 'idle',
                ts: Date.now(),
                summary: 'Output data',
                payloadPreview,
              })
            }
          }
          
          // Guardar snapshot para el nodo DESTINO (INPUT) - el que recibe el mensaje
          // Usar el mismo frame que el nodo fuente para mantener consistencia
          if (targetNodeId) {
            const targetNodeInfo = getNodeInfo(targetNodeId)
            
            // Obtener el frame actual (debería ser el mismo que se usó para el nodo fuente)
            let frame = useCanvasStore.getState().currentFrame
            
            // Si no hay frame, crear uno (esto no debería pasar normalmente)
            if (!frame) {
              if (executionFramesEnabled) {
                const isTrigger = targetNodeInfo.type ? isTriggerNode(targetNodeInfo.type) : false
                const triggerNodeId = isTrigger ? targetNodeId : undefined
                const label = isTrigger ? `Triggered by ${targetNodeInfo.type}` : 'Auto frame'
                startFrame(triggerNodeId, label)
                frame = useCanvasStore.getState().currentFrame
              } else {
                // Usar el mismo frame temporal que el nodo fuente si existe
                const sourceSnapshots = useCanvasStore.getState().nodeSnapshots.get(sourceNodeId || '') || []
                const sourceFrameId = sourceSnapshots.length > 0 ? sourceSnapshots[0].frameId : null
                frame = {
                  id: sourceFrameId || `temp-${Date.now()}`,
                  startedAt: Date.now(),
                  label: 'Temporary frame',
                }
              }
            }
            
            // Guardar snapshot del INPUT del nodo destino
            if (frame) {
              addNodeSnapshot({
                nodeId: targetNodeId,
                frameId: frame.id,
                status: 'running',
                ts: Date.now(),
                summary: 'Input data',
                payloadPreview,
              })
            }
          }
          
          console.log('🔍 [WebSocket] Procesando evento debug - activando cadena completa:', {
            sourceNodeId,
            targetNodeId,
            sourceName: sourceNodeId ? getNodeInfo(sourceNodeId).name : 'unknown',
            targetName: getNodeInfo(targetNodeId).name
          })
          
          // Si tenemos el nodo fuente, activar toda la cadena desde él
          if (sourceNodeId && sourceNodeId !== targetNodeId) {
            const edgeChain = findEdgeChain(sourceNodeId)
            console.log('🔗 [WebSocket] Cadena de edges encontrada:', {
              startNode: sourceNodeId,
              chainLength: edgeChain.length,
              edgeIds: edgeChain
            })
            
            // Encolar todos los edges de la cadena (la cola los procesará secuencialmente)
            edgeChain.forEach((edgeId) => {
              const edge = edges.find(e => e.id === edgeId)
              if (edge) {
                console.log('✨ [WebSocket] Encolando edge en cadena:', {
                  edgeId: edge.id,
                  source: edge.source,
                  target: edge.target,
                  sourceName: getNodeInfo(edge.source).name,
                  targetName: getNodeInfo(edge.target).name
                })
                enqueueEdge(edge.id, edge.source, edge.target)
              }
            })
          } else {
            // Si no hay nodo fuente, solo activar edges que llegan al nodo destino
            const incomingEdges = edges.filter(e => e.target === targetNodeId)
            console.log('🔍 [WebSocket] Sin nodo fuente - encolando edges de entrada:', {
              targetNodeId,
              incomingEdgesCount: incomingEdges.length
            })
            
            incomingEdges.forEach(edge => {
              enqueueEdge(edge.id, edge.source, edge.target)
            })
          }
          
          // Agregar log de debug
          if (sourceNodeId && sourceNodeId !== targetNodeId) {
            // Usar sourceNodeId (el nodo que generó el mensaje)
            const sourceNodeInfo = getNodeInfo(sourceNodeId)
            addExecutionLog({
              nodeId: sourceNodeId,
              nodeName: sourceNodeInfo.name,
              nodeType: sourceNodeInfo.type,
              level: 'info',
              message: debugData.msg?.payload 
                ? `Payload: ${typeof debugData.msg.payload === 'string' ? debugData.msg.payload : JSON.stringify(debugData.msg.payload)}`
                : `Debug: ${JSON.stringify(debugData.msg || debugData)}`,
              data: debugData.msg,
            })
          } else {
            // Si no hay sourceNodeId, usar el nodo target para el log
            const targetNodeInfo = getNodeInfo(targetNodeId)
            addExecutionLog({
              nodeId: targetNodeId,
              nodeName: targetNodeInfo.name,
              nodeType: targetNodeInfo.type,
              level: 'info',
              message: debugData.msg?.payload 
                ? `Payload: ${typeof debugData.msg.payload === 'string' ? debugData.msg.payload : JSON.stringify(debugData.msg.payload)}`
                : `Debug: ${JSON.stringify(debugData.msg || debugData)}`,
              data: debugData.msg,
            })
          }
        }
        // Eventos de error
        else if (event.topic === 'error' && event.data) {
          const errorData = event.data
          const nodeId = errorData.id || errorData.node?.id
          
          if (nodeId) {
            const nodeInfo = getNodeInfo(nodeId)
            const startTime = nodeExecutionStartTimes.current.get(nodeId)
            const duration = startTime ? Date.now() - startTime : undefined
            nodeExecutionStartTimes.current.delete(nodeId)
            
            addExecutionLog({
              nodeId,
              nodeName: nodeInfo.name,
              nodeType: nodeInfo.type,
              level: 'error',
              message: errorData.message || 'Error en nodo',
              data: errorData,
              duration,
            })
            
            setNodeRuntimeState(nodeId, 'error')
          }
        }
        // También manejar eventos de nodes-started y nodes-stopped
        else if (event.topic === 'nodes-started' || event.topic === 'nodes-stopped') {
          // Limpiar edges activos cuando se detienen los nodos
          if (event.topic === 'nodes-stopped') {
            clearActiveEdges()
            nodeExecutionStartTimes.current.clear()
          }
          wsLogger(`Evento ${event.topic} recibido`)
        }
      } catch (error) {
        wsLogger('Error al procesar evento WebSocket:', error)
      }
    }

    // Handler para eventos de observability
    const handleObservabilityEvent = (event: ObservabilityEvent) => {
      try {
        // #region agent log (solo en desarrollo)
        // Debugging code removed - was causing connection errors to 127.0.0.1:7243
        
        switch (event.event) {
          case 'connected':
            wsLogger('[Observability] Conectado al plugin')
            setWsConnected(true)
            break
            
          case 'heartbeat':
            // Ignorar heartbeat, solo mantener conexión activa
            break
            
          case 'frame:start': {
            const frameStart = event as FrameStartEvent
            const frameData = mapFrameStartToExecutionFrame(frameStart)
            
            if (executionFramesEnabled) {
              startFrame(frameData.triggerNodeId, frameData.label)
              
              // Inicializar map de nodos para este frame
              frameNodesDataRef.current.set(frameStart.frameId, new Map())
            }
            
            // Resaltar nodo trigger si existe
            if (frameData.triggerNodeId) {
              setNodeRuntimeState(frameData.triggerNodeId, 'running')
            }
            break
          }
          
          case 'node:input': {
            const nodeInput = event as NodeInputEvent
            wsLogger('[Observability] node:input recibido:', {
              nodeId: nodeInput.nodeId,
              nodeType: nodeInput.data.nodeType,
              frameId: nodeInput.frameId,
              hasInput: !!nodeInput.data.input,
              hasPayload: !!nodeInput.data.input?.payload,
              hasPreview: !!nodeInput.data.input?.payload?.preview,
            })
            const snapshot = mapNodeInputToSnapshot(nodeInput)
            wsLogger('[Observability] Snapshot creado:', {
              nodeId: snapshot.nodeId,
              hasPayloadPreview: !!snapshot.payloadPreview,
              summary: snapshot.summary,
            })
            
            // Detectar si es un subflow y obtener información del puerto
            const subflowDef = getSubflowDefinition(nodeInput.nodeId, nodeInput.data.nodeType)
            
            // Obtener edges entrantes al subflow
            const incomingEdges = edges.filter(e => e.target === nodeInput.nodeId)
            
            // Obtener edges activos actualmente (para inferir qué puerto se usó)
            const activeEdgesSet = useCanvasStore.getState().activeEdges
            const activeIncomingEdges = incomingEdges.filter(e => activeEdgesSet.has(e.id))
            
            // Si es un subflow, intentar inferir el puerto de entrada
            if (subflowDef && subflowDef.in && subflowDef.in.length > 1) {
              let inferredPort: number | undefined
              
              // Estrategia 1: Si hay un edge activo, usar ese para inferir el puerto
              if (activeIncomingEdges.length === 1) {
                const activeEdge = activeIncomingEdges[0]
                // Intentar extraer puerto desde targetHandle
                if (activeEdge.targetHandle && activeEdge.targetHandle.startsWith('input-')) {
                  const port = parseInt(activeEdge.targetHandle.replace('input-', ''), 10)
                  if (!isNaN(port) && port < subflowDef.in.length) {
                    inferredPort = port
                  }
                }
                // Si no hay targetHandle, usar el índice del edge en la lista
                if (inferredPort === undefined) {
                  const edgeIndex = incomingEdges.indexOf(activeEdge)
                  if (edgeIndex >= 0 && edgeIndex < subflowDef.in.length) {
                    inferredPort = edgeIndex
                  }
                }
              }
              
              // Estrategia 2: Si hay un solo edge total, es el puerto 0
              if (inferredPort === undefined && incomingEdges.length === 1) {
                inferredPort = 0
              }
              
              // Estrategia 3: Si hay múltiples edges, intentar usar targetHandle de cualquier edge
              if (inferredPort === undefined && incomingEdges.length > 1) {
                const edgeWithPort = incomingEdges.find(e => {
                  if (e.targetHandle && e.targetHandle.startsWith('input-')) {
                    const port = parseInt(e.targetHandle.replace('input-', ''), 10)
                    return !isNaN(port) && port < subflowDef.in.length
                  }
                  return false
                })
                
                if (edgeWithPort && edgeWithPort.targetHandle) {
                  const port = parseInt(edgeWithPort.targetHandle.replace('input-', ''), 10)
                  if (!isNaN(port)) {
                    inferredPort = port
                  }
                }
              }
              
              if (inferredPort !== undefined && inferredPort < subflowDef.in.length) {
                snapshot.summary = `Input port ${inferredPort + 1}/${subflowDef.in.length}: ${snapshot.summary || 'Input received'}`
                
                // Encolar solo el edge correspondiente al puerto
                const edgeForPort = incomingEdges.find(e => {
                  if (e.targetHandle === `input-${inferredPort}`) return true
                  return incomingEdges.indexOf(e) === inferredPort
                }) || incomingEdges[inferredPort] || incomingEdges[0]
                
                if (edgeForPort) {
                  enqueueEdge(edgeForPort.id, edgeForPort.source, edgeForPort.target)
                }
              } else {
                // No pudimos inferir el puerto, mostrar información general
                snapshot.summary = `Subflow input (${subflowDef.in.length} port${subflowDef.in.length > 1 ? 's' : ''}): ${snapshot.summary || 'Input received'}`
                
                // Encolar todos los edges entrantes
                incomingEdges.forEach(edge => {
                  enqueueEdge(edge.id, edge.source, edge.target)
                })
              }
            } else {
              // Nodo normal o subflow con un solo puerto
              // Encolar todos los edges entrantes
              incomingEdges.forEach(edge => {
                enqueueEdge(edge.id, edge.source, edge.target)
              })
            }
            
            // Actualizar estado del nodo a "processing"
            setNodeRuntimeState(nodeInput.nodeId, 'running')
            
            // Guardar snapshot
            addNodeSnapshot(snapshot)
            
            // Guardar en frameNodesData
            const frameNodes = frameNodesDataRef.current.get(nodeInput.frameId) || new Map()
            const existingData = frameNodes.get(nodeInput.nodeId) || {
              nodeId: nodeInput.nodeId,
              nodeType: nodeInput.data.nodeType,
              outputs: [],
            }
            existingData.input = nodeInput.data.input
            frameNodes.set(nodeInput.nodeId, existingData)
            frameNodesDataRef.current.set(nodeInput.frameId, frameNodes)
            break
          }
          
          case 'node:output': {
            const nodeOutput = event as NodeOutputEvent
            
            // #region agent log (solo en desarrollo)
            // H1: Comparar input vs output payloads para el mismo nodo
            if (import.meta.env.DEV) {
              const frameNodesForComparison = frameNodesDataRef.current.get(nodeOutput.frameId) || new Map()
              const existingNodeData = frameNodesForComparison.get(nodeOutput.nodeId)
              const inputPayload = existingNodeData?.input?.payload?.preview
              const outputPayload = nodeOutput.data.outputs[0]?.payload?.preview
              const payloadsAreEqual = JSON.stringify(inputPayload) === JSON.stringify(outputPayload)
              const safeStringify = (val: any) => {
                if (val === undefined || val === null) return 'undefined'
                if (typeof val === 'string') return val.substring(0, 50)
                try {
                  const str = JSON.stringify(val)
                  return str ? str.substring(0, 50) : 'empty'
                } catch {
                  return 'unserializable'
                }
              }
            }
            // Debugging code removed - was causing connection errors
            
            const snapshot = mapNodeOutputToSnapshot(nodeOutput)
            
            // Detectar si es un subflow y obtener información de los puertos
            const nodeInfo = getNodeInfo(nodeOutput.nodeId)
            const subflowDef = getSubflowDefinition(nodeOutput.nodeId, nodeOutput.data.nodeType)
            
            // Si es un subflow, agregar información de los puertos al snapshot
            if (subflowDef && nodeOutput.data.outputs.length > 0) {
              const portsInfo = nodeOutput.data.outputs
                .map((output, idx) => {
                  const port = output.port ?? idx
                  const totalPorts = subflowDef.out?.length || 1
                  return `Port ${port + 1}/${totalPorts}`
                })
                .join(', ')
              snapshot.summary = `${snapshot.summary || 'Output sent'} (${portsInfo})`
            }
            
            // Determinar estado basado en semantics
            const runtimeState = mapSemanticsToRuntimeState(nodeOutput.data.semantics) || 'idle'
            setNodeRuntimeState(nodeOutput.nodeId, runtimeState)
            
            // Guardar snapshot
            addNodeSnapshot(snapshot)
            
            // Guardar en frameNodesData
            const frameNodes = frameNodesDataRef.current.get(nodeOutput.frameId) || new Map()
            const nodeData = createNodeExecutionData(
              nodeOutput.nodeId,
              nodeOutput.data.nodeType,
              undefined, // input ya se guardó en node:input
              nodeOutput
            )
            frameNodes.set(nodeOutput.nodeId, nodeData)
            frameNodesDataRef.current.set(nodeOutput.frameId, frameNodes)
            
            // Encolar edges salientes (uno por cada output)
            // Para subflows, mapear el port del output al edge correcto
            nodeOutput.data.outputs.forEach((output, index) => {
              const outgoingEdges = edges.filter(e => e.source === nodeOutput.nodeId)
              
              if (subflowDef && output.port !== undefined) {
                // Para subflows, usar el port del output para encontrar el edge correcto
                // Los edges de React Flow tienen sourceHandle que indica el puerto
                const portIndex = output.port
                const edgeForPort = outgoingEdges.find(e => {
                  // El sourceHandle puede ser "output-0", "output-1", etc.
                  const handlePort = e.sourceHandle ? parseInt(e.sourceHandle.replace('output-', '')) : 0
                  return handlePort === portIndex
                }) || outgoingEdges[portIndex] || outgoingEdges[0]
                
                if (edgeForPort) {
                  enqueueEdge(edgeForPort.id, edgeForPort.source, edgeForPort.target)
                }
              } else {
                // Para nodos normales, usar el índice
                const edgeToActivate = outgoingEdges[index] || outgoingEdges[0]
                if (edgeToActivate) {
                  enqueueEdge(edgeToActivate.id, edgeToActivate.source, edgeToActivate.target)
                }
              }
            })
            
            // Agregar log de ejecución
            addExecutionLog({
              nodeId: nodeOutput.nodeId,
              nodeName: nodeInfo.name,
              nodeType: nodeInfo.type,
              level: runtimeState === 'error' ? 'error' : 
                     runtimeState === 'warning' ? 'warning' : 'success',
              message: nodeOutput.data.semantics 
                ? `${nodeOutput.data.semantics.role} - ${nodeOutput.data.semantics.behavior}`
                : subflowDef && nodeOutput.data.outputs.length > 0
                  ? `Output sent (${nodeOutput.data.outputs.map(o => `port ${(o.port ?? 0) + 1}`).join(', ')})`
                  : 'Output sent',
              duration: nodeOutput.data.timing?.durationMs,
              data: nodeOutput.data,
            })
            break
          }
          
          case 'frame:end': {
            const frameEnd = event as FrameEndEvent
            const { stats } = mapFrameEndToStats(frameEnd)
            
            if (executionFramesEnabled) {
              endFrame(frameEnd.frameId)
            }
            
            // Actualizar frame con estadísticas
            const currentFrame = useCanvasStore.getState().currentFrame
            if (currentFrame && currentFrame.id === frameEnd.frameId) {
              // Las estadísticas se pueden mostrar en la UI
              wsLogger('[Observability] Frame terminado:', stats)
            }
            
            // Limpiar edges activos cuando termina el frame
            // Los edges se quedan verdes durante la ejecución, pero se limpian al finalizar
            clearActiveEdges() // Esto también limpia animatedEdgeId
            edgeActivationTimes.current.clear()
            globalEdgeQueue.current = []
            queuedEdgeIds.current.clear()
            isProcessingEdgeQueue.current = false
            
            // Limpiar datos del frame después de un delay
            setTimeout(() => {
              frameNodesDataRef.current.delete(frameEnd.frameId)
            }, 5000)
            break
          }
        }
      } catch (error) {
        wsLogger('[Observability] Error al procesar evento:', error)
      }
    }

    // Handler externo que recibe eventos del WebSocket estándar y aplica backpressure
    const handleEvent = (event: NodeRedWebSocketEvent) => {
      // Agregar a cola acotada (puede descartar eventos antiguos si está llena)
      const enqueued = eventQueue.current.enqueue(event)
      if (!enqueued) {
        console.warn('⚠️ [WebSocket] Cola de eventos llena, descartando evento antiguo')
      }
      
      // Coalescer por nodo (mantiene solo el último evento por nodo en un tick)
      const nodeId = extractNodeIdFromBackpressure(event)
      if (nodeId) {
        eventCoalescer.current.addEvent(nodeId, event)
      } else {
        // Si no se puede extraer nodeId, procesar inmediatamente
        processEvent(event)
      }
    }

    // Registrar handlers y conectar según el sistema disponible
    if (useObservability && observabilityClient) {
      // Usar plugin de observability
      const unsubscribe = observabilityClient.onEvent(handleObservabilityEvent)
      observabilityUnsubscribeRef.current = unsubscribe
      observabilityClient.connect()
      
      // Actualizar estado de conexión periódicamente
      const connectionCheckInterval = setInterval(() => {
        const isConnected = observabilityClient.isConnected()
        if (isConnected !== wsConnected) {
          setWsConnected(isConnected)
        }
      }, 1000)
      
      return () => {
        clearInterval(connectionCheckInterval)
        if (observabilityUnsubscribeRef.current) {
          observabilityUnsubscribeRef.current()
          observabilityUnsubscribeRef.current = null
        }
        frameNodesDataRef.current.clear()
      }
    } else if (client) {
      // Usar WebSocket estándar
      const unsubscribe = client.onEvent(handleEvent)
      unsubscribeRef.current = unsubscribe
      client.connect()
      
      // Actualizar estado de conexión periódicamente
      const connectionCheckInterval = setInterval(() => {
        const isConnected = client.isConnected()
        if (isConnected !== wsConnected) {
          setWsConnected(isConnected)
        }
      }, 1000)
      
      return () => {
        clearInterval(connectionCheckInterval)
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
          unsubscribeRef.current = null
        }
        // Limpiar backpressure
        eventQueue.current.clear()
        eventCoalescer.current.clear()
      }
    }

    // Cleanup adicional (timeout de frame)
    return () => {
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current)
        frameTimeoutRef.current = null
      }
      wsLogger('Hook desmontado, limpiando suscripción')
    }
  }, [enabled, useObservability, setNodeRuntimeState, setWsConnected, wsConnected, addExecutionLog, setActiveEdge, clearActiveEdges, setAnimatedEdge, setWsEventQueueSize, edges, nodes, nodeRedNodes, currentFrame, executionFramesEnabled, startFrame, endFrame, addNodeSnapshot])

  // Limpiar estados cuando se deshabilita
  useEffect(() => {
    if (!enabled) {
      clearAllRuntimeStates()
      setWsConnected(false)
    }
  }, [enabled, clearAllRuntimeStates, setWsConnected])

  return {
    connected: wsConnected,
    connectionState: useObservability 
      ? (observabilityClientRef.current?.getConnectionState() || 'disconnected')
      : (clientRef.current?.getConnectionState() || 'disconnected'),
    usingObservability: useObservability || false,
  }
}

