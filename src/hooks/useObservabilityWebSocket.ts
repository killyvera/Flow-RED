/**
 * Hook para conectar al WebSocket de Observability del plugin node-red-runtime-observability
 * 
 * Proporciona Input/Output real por nodo, semantics automáticas, y timing preciso.
 * Se conecta automáticamente al montar y se desconecta al desmontar.
 * Actualiza el store de Zustand con datos enriquecidos de ejecución.
 */

import { useEffect, useRef, useCallback } from 'react'
import { getObservabilityClient } from '@/api/observabilityWebSocket'
import { useCanvasStore } from '@/state/canvasStore'
import { wsLogger } from '@/utils/logger'
import type { 
  ObservabilityEvent,
  ObservabilityFrameStartEvent,
  ObservabilityNodeInputEvent,
  ObservabilityNodeOutputEvent,
  ObservabilityFrameEndEvent,
  NodeExecutionSnapshot
} from '@/types/executionFrames'

/**
 * Hook para conectar al WebSocket de observability y recibir eventos de ejecución
 * 
 * @param enabled Si está habilitado (por defecto true)
 * @returns Estado de conexión del WebSocket de observability
 */
export function useObservabilityWebSocket(enabled: boolean = true) {
  // Store actions
  const setObservabilityConnected = useCanvasStore((state) => state.setObservabilityConnected)
  const observabilityConnected = useCanvasStore((state) => state.observabilityConnected)
  const setNodeRuntimeState = useCanvasStore((state) => state.setNodeRuntimeState)
  const setActiveEdge = useCanvasStore((state) => state.setActiveEdge)
  const clearActiveEdges = useCanvasStore((state) => state.clearActiveEdges)
  const edges = useCanvasStore((state) => state.edges)
  
  // Execution Frames
  const startFrame = useCanvasStore((state) => state.startFrame)
  const endFrame = useCanvasStore((state) => state.endFrame)
  const updateFrameStats = useCanvasStore((state) => state.updateFrameStats)
  const addNodeSnapshot = useCanvasStore((state) => state.addNodeSnapshot)
  
  const clientRef = useRef<ReturnType<typeof getObservabilityClient> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const frameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Maneja evento frame:start
   */
  const handleFrameStart = useCallback((event: ObservabilityFrameStartEvent) => {
    wsLogger('[Observability] Frame iniciado:', event.frameId)
    
    // Crear frame con datos del plugin
    const frame = startFrame(event.data.triggerNodeId, `Frame ${event.frameId.slice(-8)}`)
    
    // El frame creado ya tiene un ID generado por el store
    // Actualizar para usar el ID del plugin si es diferente
    if (frame.id !== event.frameId) {
      wsLogger('[Observability] Frame ID del plugin:', event.frameId, 'vs local:', frame.id)
    }
    
    // Marcar nodo trigger como running si existe
    if (event.data.triggerNodeId) {
      setNodeRuntimeState(event.data.triggerNodeId, 'running')
    }
  }, [startFrame, setNodeRuntimeState])

  /**
   * Maneja evento node:input
   */
  const handleNodeInput = useCallback((event: ObservabilityNodeInputEvent) => {
    const { frameId, nodeId, data } = event
    
    // Marcar nodo como procesando
    setNodeRuntimeState(nodeId, 'running')
    
    // Animar edges entrantes al nodo
    const incomingEdges = edges.filter(e => e.target === nodeId)
    incomingEdges.forEach((edge, index) => {
      const delay = index * 50 // Pequeño delay entre edges
      setTimeout(() => {
        setActiveEdge(edge.id, true)
        // Desactivar después de un tiempo
        setTimeout(() => setActiveEdge(edge.id, false), 500)
      }, delay)
    })
    
    // Crear snapshot de input
    const snapshot: NodeExecutionSnapshot = {
      nodeId,
      frameId,
      status: 'running',
      ts: event.ts,
      nodeType: data.nodeType,
      input: data.input,
      sampled: data.sampled,
      summary: 'Input received',
      payloadPreview: data.input.payload.preview 
        ? (typeof data.input.payload.preview === 'string' 
            ? data.input.payload.preview 
            : JSON.stringify(data.input.payload.preview))
        : undefined
    }
    
    addNodeSnapshot(snapshot)
  }, [edges, setNodeRuntimeState, setActiveEdge, addNodeSnapshot])

  /**
   * Maneja evento node:output
   */
  const handleNodeOutput = useCallback((event: ObservabilityNodeOutputEvent) => {
    const { frameId, nodeId, data } = event
    
    // Determinar estado final basado en semantics
    let finalState: 'idle' | 'success' | 'warning' = 'idle'
    if (data.semantics.behavior === 'filtered') {
      finalState = 'warning' // Nodo filtró el mensaje
    } else if (data.semantics.behavior === 'terminated') {
      finalState = 'idle' // Nodo terminó la ejecución (sink)
    } else {
      finalState = 'success' // Nodo procesó exitosamente
    }
    
    // Actualizar estado del nodo después de un pequeño delay
    setTimeout(() => {
      setNodeRuntimeState(nodeId, finalState)
      // Limpiar estado después de 2 segundos
      setTimeout(() => setNodeRuntimeState(nodeId, null), 2000)
    }, 100)
    
    // Animar edges salientes por puerto
    data.outputs.forEach((output, outputIndex) => {
      const port = output.port ?? outputIndex
      
      // Encontrar edges que salen de este nodo en este puerto
      const outgoingEdges = edges.filter(e => {
        if (e.source !== nodeId) return false
        // Extraer puerto del sourceHandle (formato: 'output-0', 'output-1', etc.)
        const handlePort = e.sourceHandle ? parseInt(e.sourceHandle.replace('output-', ''), 10) : 0
        return handlePort === port
      })
      
      outgoingEdges.forEach((edge, edgeIndex) => {
        const delay = (outputIndex * 100) + (edgeIndex * 50)
        setTimeout(() => {
          setActiveEdge(edge.id, true)
          // Desactivar después de un tiempo más largo para visualización
          setTimeout(() => setActiveEdge(edge.id, false), 800)
        }, delay)
      })
    })
    
    // Crear snapshot de output con todos los datos enriquecidos
    const primaryOutput = data.outputs[0]
    const snapshot: NodeExecutionSnapshot = {
      nodeId,
      frameId,
      status: finalState,
      ts: event.ts,
      nodeType: data.nodeType,
      outputs: data.outputs,
      semantics: data.semantics,
      timing: data.timing,
      sampled: data.sampled,
      summary: `${data.semantics.role} - ${data.semantics.behavior}`,
      payloadPreview: primaryOutput?.payload.preview 
        ? (typeof primaryOutput.payload.preview === 'string' 
            ? primaryOutput.payload.preview 
            : JSON.stringify(primaryOutput.payload.preview))
        : undefined
    }
    
    addNodeSnapshot(snapshot)
  }, [edges, setNodeRuntimeState, setActiveEdge, addNodeSnapshot])

  /**
   * Maneja evento frame:end
   */
  const handleFrameEnd = useCallback((event: ObservabilityFrameEndEvent) => {
    wsLogger('[Observability] Frame terminado:', event.frameId, 'Stats:', event.data.stats)
    
    // Actualizar estadísticas del frame
    updateFrameStats(event.frameId, event.data.stats)
    
    // Terminar el frame después de un pequeño delay para mostrar animaciones
    setTimeout(() => {
      endFrame(event.frameId)
      
      // Limpiar edges activos después de otro delay
      setTimeout(() => {
        clearActiveEdges()
      }, 1000)
    }, 500)
  }, [updateFrameStats, endFrame, clearActiveEdges])

  /**
   * Handler principal de eventos
   */
  const handleEvent = useCallback((event: ObservabilityEvent) => {
    switch (event.event) {
      case 'connected':
        wsLogger('[Observability] Conectado al plugin')
        break
        
      case 'heartbeat':
        // Solo actualizar timestamp, no hacer nada más
        break
        
      case 'frame:start':
        handleFrameStart(event as ObservabilityFrameStartEvent)
        break
        
      case 'node:input':
        handleNodeInput(event as ObservabilityNodeInputEvent)
        break
        
      case 'node:output':
        handleNodeOutput(event as ObservabilityNodeOutputEvent)
        break
        
      case 'frame:end':
        handleFrameEnd(event as ObservabilityFrameEndEvent)
        break
        
      default:
        wsLogger('[Observability] Evento desconocido:', event)
    }
  }, [handleFrameStart, handleNodeInput, handleNodeOutput, handleFrameEnd])

  useEffect(() => {
    if (!enabled) {
      wsLogger('[Observability] WebSocket deshabilitado')
      return
    }

    // Obtener o crear el cliente WebSocket
    const client = getObservabilityClient()
    clientRef.current = client

    // Registrar el handler ANTES de conectar
    const unsubscribe = client.onEvent(handleEvent)
    unsubscribeRef.current = unsubscribe

    // Conectar
    client.connect()

    // Actualizar estado de conexión periódicamente
    const connectionCheckInterval = setInterval(() => {
      const isConnected = client.isConnected()
      if (isConnected !== observabilityConnected) {
        setObservabilityConnected(isConnected)
      }
    }, 1000)

    // Cleanup al desmontar
    return () => {
      clearInterval(connectionCheckInterval)
      
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current)
        frameTimeoutRef.current = null
      }
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // No desconectar el cliente porque puede ser usado por otros componentes
      wsLogger('[Observability] Hook desmontado, limpiando suscripción')
    }
  }, [enabled, handleEvent, observabilityConnected, setObservabilityConnected])

  // Limpiar estados cuando se deshabilita
  useEffect(() => {
    if (!enabled) {
      setObservabilityConnected(false)
    }
  }, [enabled, setObservabilityConnected])

  return {
    connected: observabilityConnected,
    connectionState: clientRef.current?.getConnectionState() || 'disconnected',
  }
}

