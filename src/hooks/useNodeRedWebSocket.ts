/**
 * Hook para conectar y manejar WebSocket de Node-RED
 * 
 * Se conecta automáticamente al montar y se desconecta al desmontar.
 * Actualiza el store de Zustand con los estados de runtime de los nodos.
 */

import { useEffect, useRef } from 'react'
import { getWebSocketClient, type NodeRedWebSocketEvent } from '@/api/websocket'
import { useCanvasStore } from '@/state/canvasStore'
import { mapNodeRedStatusToRuntimeState } from '@/utils/runtimeStatusMapper'
import { wsLogger } from '@/utils/logger'
import { isTriggerNode, shouldStartNewFrame, shouldEndFrame, createPayloadPreview } from '@/utils/executionFrameManager'
import { BoundedQueue, EventCoalescer, extractNodeIdFromEvent as extractNodeIdFromBackpressure } from '@/utils/backpressure'
import { getPerformanceMonitor } from '@/utils/performance'
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
  const setWsEventQueueSize = useCanvasStore((state) => state.setWsEventQueueSize)
  const edges = useCanvasStore((state) => state.edges)
  const nodes = useCanvasStore((state) => state.nodes)
  
  // Execution Frames
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const executionFramesEnabled = useCanvasStore((state) => state.executionFramesEnabled)
  const startFrame = useCanvasStore((state) => state.startFrame)
  const endFrame = useCanvasStore((state) => state.endFrame)
  const addNodeSnapshot = useCanvasStore((state) => state.addNodeSnapshot)
  
  const clientRef = useRef<ReturnType<typeof getWebSocketClient> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const nodeExecutionStartTimes = useRef<Map<string, number>>(new Map())
  const lastEventTimeRef = useRef<number>(Date.now())
  const frameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Backpressure: Cola acotada y coalescedor de eventos
  const eventQueue = useRef(new BoundedQueue<NodeRedWebSocketEvent>(1000))
  const eventCoalescer = useRef(new EventCoalescer())

  useEffect(() => {
    // console.log('🎣 [useNodeRedWebSocket] Hook montado, enabled:', enabled)
    
    if (!enabled) {
      wsLogger('WebSocket deshabilitado')
      // console.log('⚠️ [useNodeRedWebSocket] WebSocket deshabilitado')
      return
    }

    // Obtener o crear el cliente WebSocket
    // Nota: Si Node-RED tiene disableEditor: true o httpAdminRoot: false,
    // el WebSocket no estará disponible. La aplicación funcionará sin él.
    const client = getWebSocketClient()
    clientRef.current = client
    // console.log('🔌 [useNodeRedWebSocket] Cliente WebSocket obtenido:', client)

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
      }
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

    // Helper para gestionar Execution Frames
    const handleFrameLogic = (event: NodeRedWebSocketEvent, nodeId: string | null, nodeType?: string) => {
      if (!executionFramesEnabled) {
        return
      }

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
      if (shouldStart) {
        // Verificar si es un trigger node
        const isTrigger = nodeType ? isTriggerNode(nodeType) : false
        const triggerNodeId = isTrigger && nodeId ? nodeId : undefined
        const label = isTrigger ? `Triggered by ${nodeType}` : 'Manual execution'
        
        startFrame(triggerNodeId, label)
      }

      // Obtener frame actualizado después de posible creación
      const frame = useCanvasStore.getState().currentFrame
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

      // Programar cierre del frame si no hay más eventos
      const frameForTimeout = useCanvasStore.getState().currentFrame
      if (frameForTimeout) {
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
            
            // Actualizar snapshot si hay frame activo
            if (executionFramesEnabled) {
              const frame = useCanvasStore.getState().currentFrame
              if (frame) {
                const payload = statusData?.payload || statusData
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
            }
            
            // Si el nodo está en estado "running", activar sus edges de salida
            if (runtimeState === 'running') {
              // Marcar inicio de ejecución
              if (!nodeExecutionStartTimes.current.has(nodeId)) {
                nodeExecutionStartTimes.current.set(nodeId, Date.now())
              }
              
              // Activar edges de salida del nodo
              const outgoingEdges = edges.filter(e => e.source === nodeId)
              if (outgoingEdges.length > 0) {
                console.log('✨ [WebSocket] Nodo en estado RUNNING - Activando edges de salida:', {
                  nodeId,
                  nodeName: getNodeInfo(nodeId).name,
                  edgesCount: outgoingEdges.length,
                  edgeIds: outgoingEdges.map(e => e.id),
                  targets: outgoingEdges.map(e => ({ target: e.target, targetName: getNodeInfo(e.target).name }))
                })
                outgoingEdges.forEach((edge, index) => {
                  // Activar con un pequeño delay para crear efecto de secuencia
                  const delay = index * 150 // 150ms entre cada edge
                  setTimeout(() => {
                    console.log('✨ [WebSocket] Activando edge de salida (running):', {
                      edgeId: edge.id,
                      source: edge.source,
                      target: edge.target,
                      sourceName: getNodeInfo(edge.source).name,
                      targetName: getNodeInfo(edge.target).name
                    })
                    setActiveEdge(edge.id, true)
                    // Desactivar después de un tiempo más largo para mejor visibilidad
                    setTimeout(() => {
                      console.log('💤 [WebSocket] Desactivando edge (running):', edge.id)
                      setActiveEdge(edge.id, false)
                    }, 3000) // Aumentar tiempo para mejor visibilidad del flujo
                  }, delay)
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
          
          // Gestionar Execution Frames para el nodo fuente
          if (sourceNodeId) {
            const sourceNodeInfo = getNodeInfo(sourceNodeId)
            handleFrameLogic(event, sourceNodeId, sourceNodeInfo.type)
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
            
            // Activar todos los edges de la cadena en secuencia
            edgeChain.forEach((edgeId, index) => {
              const delay = index * 200 // 200ms entre cada edge para efecto cascada visible
              setTimeout(() => {
                const edge = edges.find(e => e.id === edgeId)
                if (edge) {
                  console.log('✨ [WebSocket] Activando edge en cadena:', {
                    index: index + 1,
                    total: edgeChain.length,
                    edgeId: edge.id,
                    source: edge.source,
                    target: edge.target,
                    sourceName: getNodeInfo(edge.source).name,
                    targetName: getNodeInfo(edge.target).name
                  })
                  setActiveEdge(edge.id, true)
                  // Desactivar después de un tiempo
                  setTimeout(() => {
                    setActiveEdge(edge.id, false)
                  }, 3000) // Tiempo más largo para ver el flujo completo
                }
              }, delay)
            })
          } else {
            // Si no hay nodo fuente, solo activar edges que llegan al nodo destino
            const incomingEdges = edges.filter(e => e.target === targetNodeId)
            console.log('🔍 [WebSocket] Sin nodo fuente - activando edges de entrada:', {
              targetNodeId,
              incomingEdgesCount: incomingEdges.length
            })
            
            incomingEdges.forEach((edge, index) => {
              const delay = index * 200
              setTimeout(() => {
                setActiveEdge(edge.id, true)
                setTimeout(() => {
                  setActiveEdge(edge.id, false)
                }, 3000)
              }, delay)
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

    // Handler externo que recibe eventos del WebSocket y aplica backpressure
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

    // IMPORTANTE: Registrar el handler ANTES de conectar para no perder mensajes
    // console.log('📝 [useNodeRedWebSocket] Registrando handler ANTES de conectar...')
    const unsubscribe = client.onEvent(handleEvent)
    unsubscribeRef.current = unsubscribe
    // console.log('📝 [useNodeRedWebSocket] Handler registrado, unsubscribe disponible:', !!unsubscribe, 'Handlers totales:', clientRef.current ? 'N/A' : 'N/A')

    // Conectar DESPUÉS de registrar el handler
    // console.log('🚀 [useNodeRedWebSocket] Conectando WebSocket...')
    client.connect()

    // Actualizar estado de conexión periódicamente
    const connectionCheckInterval = setInterval(() => {
      const isConnected = client.isConnected()
      if (isConnected !== wsConnected) {
        // console.log('🔄 [useNodeRedWebSocket] Estado de conexión cambió:', wsConnected, '→', isConnected)
        setWsConnected(isConnected)
      }
    }, 1000)

    // Cleanup al desmontar
    return () => {
      clearInterval(connectionCheckInterval)
      
      // Limpiar timeout de frame
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current)
        frameTimeoutRef.current = null
      }
      
      // Limpiar backpressure
      eventQueue.current.clear()
      eventCoalescer.current.clear()
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // No desconectar el cliente aquí porque puede ser usado por otros componentes
      // Solo limpiar la suscripción
      wsLogger('Hook desmontado, limpiando suscripción')
    }
  }, [enabled, setNodeRuntimeState, setWsConnected, wsConnected, addExecutionLog, setActiveEdge, clearActiveEdges, setWsEventQueueSize, edges, nodes, currentFrame, executionFramesEnabled, startFrame, endFrame, addNodeSnapshot])

  // Limpiar estados cuando se deshabilita
  useEffect(() => {
    if (!enabled) {
      clearAllRuntimeStates()
      setWsConnected(false)
    }
  }, [enabled, clearAllRuntimeStates, setWsConnected])

  return {
    connected: wsConnected,
    connectionState: clientRef.current?.getConnectionState() || 'disconnected',
  }
}

