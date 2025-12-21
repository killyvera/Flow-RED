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
    if (!enabled) {
      wsLogger('WebSocket deshabilitado')
      return
    }

    // Obtener o crear el cliente WebSocket
    // Nota: Si Node-RED tiene disableEditor: true o httpAdminRoot: false,
    // el WebSocket no estará disponible. La aplicación funcionará sin él.
    const client = getWebSocketClient()
    clientRef.current = client

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
      try {
        // Node-RED envía eventos de status con topic 'status'
        if (event.topic === 'status' && event.payload) {
          const nodeId = event.payload.id
          if (!nodeId) {
            wsLogger('Evento de status sin ID de nodo:', event)
            return
          }

          // Mapear el estado de Node-RED a estado visual
          const runtimeState = mapNodeRedStatusToRuntimeState(event.payload)
          
          if (runtimeState) {
            setNodeRuntimeState(nodeId, runtimeState)
            
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
              message: event.payload.status?.text || `Estado: ${runtimeState}`,
              duration,
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
          const nodeId = debugData.id || debugData.node?.id
          
          if (nodeId) {
            const nodeInfo = getNodeInfo(nodeId)
            
            // Marcar inicio de ejecución
            if (!nodeExecutionStartTimes.current.has(nodeId)) {
              nodeExecutionStartTimes.current.set(nodeId, Date.now())
            }
            
            // Activar edges de salida del nodo
            const outgoingEdges = edges.filter(e => e.source === nodeId)
            outgoingEdges.forEach(edge => {
              setActiveEdge(edge.id, true)
              // Desactivar después de un tiempo
              setTimeout(() => setActiveEdge(edge.id, false), 500)
            })
            
            // Agregar log de debug
            addExecutionLog({
              nodeId,
              nodeName: nodeInfo.name,
              nodeType: nodeInfo.type,
              level: 'info',
              message: `Debug: ${JSON.stringify(debugData.msg?.payload || debugData)}`,
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

    // Suscribirse a eventos
    const unsubscribe = client.onEvent(handleEvent)
    unsubscribeRef.current = unsubscribe

    // Conectar
    client.connect()

    // Actualizar estado de conexión periódicamente
    const connectionCheckInterval = setInterval(() => {
      const isConnected = client.isConnected()
      if (isConnected !== wsConnected) {
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

