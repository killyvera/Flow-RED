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
import type { Edge } from 'reactflow'

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
  const edges = useCanvasStore((state) => state.edges)
  const nodes = useCanvasStore((state) => state.nodes)
  
  const clientRef = useRef<ReturnType<typeof getWebSocketClient> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const nodeExecutionStartTimes = useRef<Map<string, number>>(new Map())

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

    // Helper para encontrar edges conectados a un nodo
    const findEdgesForNode = (nodeId: string): Edge[] => {
      return edges.filter(e => e.source === nodeId || e.target === nodeId)
    }

    // Helper para obtener información del nodo
    const getNodeInfo = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId)
      return {
        name: node?.data?.label || nodeId,
        type: node?.data?.nodeRedType || 'unknown',
      }
    }

    // Handler para eventos de WebSocket
    const handleEvent = (event: NodeRedWebSocketEvent) => {
      // Log todos los eventos para debugging
      console.log('🎯 [WebSocket] Evento recibido:', {
        topic: event.topic,
        hasPayload: !!event.payload,
        hasData: !!event.data,
        payload: event.payload,
        data: event.data
      })
      
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

          // Crear un objeto compatible con NodeRedStatusEvent
          const statusEvent = {
            id: nodeId,
            status: statusData
          }

          // Mapear el estado de Node-RED a estado visual
          const runtimeState = mapNodeRedStatusToRuntimeState(statusEvent)
          
          if (runtimeState) {
            setNodeRuntimeState(nodeId, runtimeState)
            
            // Si el nodo está en estado "running", activar sus edges de salida
            if (runtimeState === 'running') {
              // Marcar inicio de ejecución
              if (!nodeExecutionStartTimes.current.has(nodeId)) {
                nodeExecutionStartTimes.current.set(nodeId, Date.now())
              }
              
              // Activar edges de salida del nodo
              const outgoingEdges = edges.filter(e => e.source === nodeId)
              if (outgoingEdges.length > 0) {
                console.log('✨ [WebSocket] Activando edges para nodo running:', {
                  nodeId,
                  nodeName: getNodeInfo(nodeId).name,
                  edgesCount: outgoingEdges.length,
                  edgeIds: outgoingEdges.map(e => e.id)
                })
                outgoingEdges.forEach(edge => {
                  setActiveEdge(edge.id, true)
                  // Desactivar después de un tiempo
                  setTimeout(() => {
                    setActiveEdge(edge.id, false)
                  }, 1000) // Aumentar tiempo para mejor visibilidad
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
          // Node-RED envía el ID del nodo que generó el mensaje en debugData.node
          // El ID del nodo debug está en debugData.id
          const sourceNodeId = debugData.node || debugData.nodeid
          const debugNodeId = debugData.id
          
          // Usar el nodo fuente (el que generó el mensaje) para activar edges
          if (sourceNodeId) {
            // Marcar inicio de ejecución
            if (!nodeExecutionStartTimes.current.has(sourceNodeId)) {
              nodeExecutionStartTimes.current.set(sourceNodeId, Date.now())
            }
            
            // Activar edges de salida del nodo fuente
            const outgoingEdges = edges.filter(e => e.source === sourceNodeId)
            if (outgoingEdges.length > 0) {
              console.log('✨ [WebSocket] Activando edges para evento debug:', {
                sourceNodeId,
                nodeName: getNodeInfo(sourceNodeId).name,
                edgesCount: outgoingEdges.length,
                edgeIds: outgoingEdges.map(e => e.id)
              })
              outgoingEdges.forEach(edge => {
                setActiveEdge(edge.id, true)
                // Desactivar después de un tiempo
                setTimeout(() => {
                  setActiveEdge(edge.id, false)
                }, 1000) // Aumentar tiempo para mejor visibilidad
              })
            }
            
            // Agregar log de debug - usar sourceNodeId (el nodo que generó el mensaje)
            const sourceNodeInfo = getNodeInfo(sourceNodeId)
            addExecutionLog({
              nodeId: sourceNodeId, // Usar el nodo fuente, no el nodo debug
              nodeName: sourceNodeInfo.name,
              nodeType: sourceNodeInfo.type,
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
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // No desconectar el cliente aquí porque puede ser usado por otros componentes
      // Solo limpiar la suscripción
      wsLogger('Hook desmontado, limpiando suscripción')
    }
  }, [enabled, setNodeRuntimeState, setWsConnected, wsConnected, addExecutionLog, setActiveEdge, clearActiveEdges, edges, nodes])

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

