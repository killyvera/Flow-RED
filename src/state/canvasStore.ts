/**
 * Store de Zustand para el estado del canvas
 * 
 * Maneja el estado del canvas, flows cargados, y el flow activo.
 */

import { create } from 'zustand'
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow'
import type { NodeRedNode, NodeRedGroup } from '@/api/types'
import type { ExecutionFrame, NodeExecutionSnapshot } from '@/types/executionFrames'

/**
 * Estado de runtime de un nodo
 */
export type NodeRuntimeState = 'running' | 'error' | 'idle' | 'warning'

/**
 * Entrada de log de ejecución
 */
export interface ExecutionLogEntry {
  id: string
  timestamp: number
  nodeId: string
  nodeName: string
  nodeType: string
  level: 'info' | 'success' | 'error' | 'warning'
  message: string
  data?: any
  duration?: number // Duración de ejecución en ms
}

// Tipos básicos para el estado del canvas
export interface CanvasState {
  // Estado del canvas (nodos y edges de React Flow)
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  /** Grupos del flow activo */
  groups: NodeRedGroup[]
  
  // Estado de UI
  selectedNodeId: string | null
  selectedEdgeId: string | null
  /** Modo de edición: true = edición, false = solo lectura */
  isEditMode: boolean
  
  // Estado de carga
  isLoading: boolean
  error: string | null
  
  // Flows de Node-RED
  /** Nodos originales de Node-RED (todos los flows) */
  nodeRedNodes: NodeRedNode[]
  /** Flows disponibles (tabs) */
  flows: NodeRedNode[]
  /** ID del flow activo (el que se está visualizando) */
  activeFlowId: string | null
  
  /** Grupos colapsados actualmente (IDs) */
  collapsedGroupIds: Set<string>
  
  /** Estados de runtime de los nodos (por ID de nodo) */
  nodeRuntimeStates: Map<string, NodeRuntimeState>
  /** Estado de conexión WebSocket */
  wsConnected: boolean
  
  /** Edges activos (transmitiendo datos) - Set de edge IDs (verde persistente) */
  activeEdges: Set<string>
  /** Edge actualmente animado (punto animado) - solo uno a la vez */
  animatedEdgeId: string | null
  /** Logs de ejecución */
  executionLogs: ExecutionLogEntry[]
  /** Máximo número de logs a mantener */
  maxLogs: number
  
  // Execution Frames
  /** Frame de ejecución actual (null si no hay frame activo) */
  currentFrame: ExecutionFrame | null
  /** Lista de frames (mantener últimos 20) */
  frames: ExecutionFrame[]
  /** Snapshots de ejecución por nodo */
  nodeSnapshots: Map<string, NodeExecutionSnapshot[]>
  /** Si Execution Frames está habilitado */
  executionFramesEnabled: boolean
  /** Si Explain Mode está activo */
  explainMode: boolean
  /** Si Performance Mode está activo */
  perfMode: boolean
  /** Si el PerfReadout está visible */
  showPerfReadout: boolean
  /** Tamaño de la cola de eventos WebSocket (para métricas) */
  wsEventQueueSize: number
  
  // Acciones
  setNodes: (nodes: ReactFlowNode[]) => void
  setEdges: (edges: ReactFlowEdge[]) => void
  setGroups: (groups: NodeRedGroup[]) => void
  setCollapsedGroupIds: (ids: Set<string>) => void
  toggleGroupCollapsed: (groupId: string) => void
  setNodeRuntimeState: (nodeId: string, state: NodeRuntimeState | null) => void
  clearNodeRuntimeState: (nodeId: string) => void
  clearAllRuntimeStates: () => void
  setWsConnected: (connected: boolean) => void
  
  // Acciones para ejecución
  setActiveEdge: (edgeId: string, active: boolean) => void
  clearActiveEdges: () => void
  setAnimatedEdge: (edgeId: string | null) => void
  addExecutionLog: (entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>) => void
  clearExecutionLogs: () => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setEditMode: (isEditMode: boolean) => void
  toggleEditMode: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Acciones para flows
  setNodeRedNodes: (nodes: NodeRedNode[]) => void
  setFlows: (flows: NodeRedNode[]) => void
  setActiveFlowId: (flowId: string | null) => void
  
  // Acciones para Execution Frames
  startFrame: (triggerNodeId?: string, label?: string) => ExecutionFrame
  endFrame: (frameId: string) => void
  addNodeSnapshot: (snapshot: NodeExecutionSnapshot) => void
  setExecutionFramesEnabled: (enabled: boolean) => void
  clearFrames: () => void
  
  // Acciones para Explain Mode
  setExplainMode: (enabled: boolean) => void
  toggleExplainMode: () => void
  
  // Acciones para Performance Mode
  setPerfMode: (enabled: boolean) => void
  togglePerfMode: () => void
  setShowPerfReadout: (show: boolean) => void
  toggleShowPerfReadout: () => void
  
  // Acciones para WebSocket
  setWsEventQueueSize: (size: number) => void
  
  reset: () => void
}

function sanitizeOrphanGroupParents(nodes: ReactFlowNode[]): ReactFlowNode[] {
  if (!nodes?.length) return nodes

  const ids = new Set(nodes.map(n => n.id))
  let changed = false

  const sanitized = nodes.map((n) => {
    const anyNode: any = n as any
    const parentRef: string | undefined = anyNode.parentId || anyNode.parentNode
    if (!parentRef) return n
    if (ids.has(parentRef)) return n

    changed = true

    const next: any = { ...n }
    // XYFlow usa parentId; versiones antiguas podían usar parentNode
    next.parentId = undefined
    next.parentNode = undefined
    if ('extent' in next) next.extent = undefined

    // Mantener consistencia con Node-RED (g)
    const nodeRedNode = next.data?.nodeRedNode
    if (nodeRedNode?.g === parentRef) {
      const newNodeRedNode = { ...nodeRedNode }
      delete newNodeRedNode.g
      next.data = {
        ...next.data,
        nodeRedNode: newNodeRedNode,
      }
    }

    return next
  })

  if (process.env.NODE_ENV === 'development' && changed) {
    // eslint-disable-next-line no-console
    console.warn('[canvasStore] Sanitizados nodos con parentId/parentNode huérfano (grupo no existe)')
  }

  return changed ? sanitized : nodes
}

const initialState: Omit<CanvasState, 
  'setNodes' | 'setEdges' | 'setGroups' | 'setCollapsedGroupIds' | 'toggleGroupCollapsed' |
  'setNodeRuntimeState' | 'clearNodeRuntimeState' | 'clearAllRuntimeStates' | 'setWsConnected' |
  'setActiveEdge' | 'clearActiveEdges' | 'setAnimatedEdge' | 'addExecutionLog' | 'clearExecutionLogs' |
  'setSelectedNodeId' | 'setSelectedEdgeId' | 'setEditMode' | 'toggleEditMode' |
  'setLoading' | 'setError' | 'setNodeRedNodes' | 'setFlows' | 'setActiveFlowId' |
  'startFrame' | 'endFrame' | 'addNodeSnapshot' | 'setExecutionFramesEnabled' | 'clearFrames' |
  'setExplainMode' | 'toggleExplainMode' | 'setPerfMode' | 'togglePerfMode' | 'setShowPerfReadout' | 'toggleShowPerfReadout' |
  'setWsEventQueueSize' | 'reset' | 'setSubflowDefinitions' | 'setCurrentSubflowId'
> = {
  nodes: [],
  edges: [],
  groups: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isEditMode: true, // Por defecto modo edición activo
  isLoading: false,
  error: null,
  nodeRedNodes: [],
  flows: [],
  activeFlowId: null,
  collapsedGroupIds: new Set<string>(),
  nodeRuntimeStates: new Map<string, NodeRuntimeState>(),
  wsConnected: false,
  activeEdges: new Set<string>(),
  animatedEdgeId: null,
  executionLogs: [],
  maxLogs: 1000,
  currentFrame: null,
  frames: [],
  nodeSnapshots: new Map<string, NodeExecutionSnapshot[]>(),
  executionFramesEnabled: true, // Habilitado por defecto
  explainMode: false, // Deshabilitado por defecto
  perfMode: typeof window !== 'undefined' 
    ? localStorage.getItem('perfMode') === 'true' 
    : false, // Leer desde localStorage si está disponible
  showPerfReadout: typeof window !== 'undefined' 
    ? localStorage.getItem('showPerfReadout') !== 'false' 
    : true, // Mostrar por defecto en dev mode
  wsEventQueueSize: 0, // Tamaño de cola de eventos WebSocket
}

export const useCanvasStore = create<CanvasState>((set) => ({
  ...initialState,
  
  setNodes: (nodes) => set({ nodes: sanitizeOrphanGroupParents(nodes) }),
  setEdges: (edges) => set({ edges }),
  setGroups: (groups) => set({ groups }),
  setCollapsedGroupIds: (collapsedGroupIds) => set({ collapsedGroupIds }),
  toggleGroupCollapsed: (groupId) => set((state) => {
    const newCollapsed = new Set(state.collapsedGroupIds)
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId)
    } else {
      newCollapsed.add(groupId)
    }
    return { collapsedGroupIds: newCollapsed }
  }),
  setNodeRuntimeState: (nodeId, state) => {
    // console.log('💾 [canvasStore] setNodeRuntimeState:', { nodeId, state })
    set((currentState) => {
      const newStates = new Map(currentState.nodeRuntimeStates)
      if (state === null) {
        newStates.delete(nodeId)
      } else {
        newStates.set(nodeId, state)
      }
      return { nodeRuntimeStates: newStates }
    })
  },
  clearNodeRuntimeState: (nodeId) => set((currentState) => {
    const newStates = new Map(currentState.nodeRuntimeStates)
    newStates.delete(nodeId)
    return { nodeRuntimeStates: newStates }
  }),
  clearAllRuntimeStates: () => set({ nodeRuntimeStates: new Map() }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
          setActiveEdge: (edgeId, active) => {
            set((state) => {
              const newActiveEdges = new Set(state.activeEdges)
              if (active) {
                newActiveEdges.add(edgeId)
              } else {
                newActiveEdges.delete(edgeId)
              }
              return { activeEdges: newActiveEdges }
            })
          },
  clearActiveEdges: () => set({ activeEdges: new Set(), animatedEdgeId: null }),
  setAnimatedEdge: (edgeId) => set({ animatedEdgeId: edgeId }),
  addExecutionLog: (entry) => {
    // console.log('📝 [canvasStore] Agregando log:', entry)
    set((state) => {
      const newLog: ExecutionLogEntry = {
        ...entry,
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }
      const newLogs = [newLog, ...state.executionLogs] // Agregar al inicio (más reciente primero)
      // Mantener solo los últimos maxLogs
      const trimmedLogs = newLogs.slice(0, state.maxLogs)
      // console.log('📝 [canvasStore] Total logs después de agregar:', trimmedLogs.length)
      return { executionLogs: trimmedLogs }
    })
  },
  clearExecutionLogs: () => set({ executionLogs: [] }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  setEditMode: (isEditMode) => set({ isEditMode }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  setNodeRedNodes: (nodes) => set({ nodeRedNodes: nodes }),
  setFlows: (flows) => set({ flows }),
  setActiveFlowId: (flowId) => set({ activeFlowId: flowId }),
  
  // Execution Frames actions
  startFrame: (triggerNodeId, label) => {
    const newFrame: ExecutionFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      triggerNodeId,
      label,
    }
    set((state) => {
      // Cerrar frame anterior si existe
      const updatedFrames = state.currentFrame
        ? [...state.frames, { ...state.currentFrame, endedAt: Date.now() }]
        : state.frames
      
      // Mantener solo los últimos 20 frames
      const trimmedFrames = updatedFrames.slice(-20)
      
      return {
        currentFrame: newFrame,
        frames: trimmedFrames,
      }
    })
    return newFrame
  },
  
  endFrame: (frameId) => {
    set((state) => {
      if (state.currentFrame?.id === frameId) {
        const endedFrame: ExecutionFrame = {
          ...state.currentFrame,
          endedAt: Date.now(),
        }
        const updatedFrames = [...state.frames, endedFrame].slice(-20)
        return {
          currentFrame: null,
          frames: updatedFrames,
        }
      }
      return state
    })
  },
  
  addNodeSnapshot: (snapshot) => {
    set((state) => {
      const newSnapshots = new Map(state.nodeSnapshots)
      const nodeSnapshots = newSnapshots.get(snapshot.nodeId) || []
      // Agregar al inicio y mantener solo los últimos 50 snapshots por nodo
      const updatedSnapshots = [snapshot, ...nodeSnapshots].slice(0, 50)
      newSnapshots.set(snapshot.nodeId, updatedSnapshots)
      return { nodeSnapshots: newSnapshots }
    })
  },
  
  setExecutionFramesEnabled: (enabled) => {
    set({ executionFramesEnabled: enabled })
    if (!enabled) {
      // Si se deshabilita, cerrar frame actual si existe
      set((state) => {
        if (state.currentFrame) {
          const endedFrame: ExecutionFrame = {
            ...state.currentFrame,
            endedAt: Date.now(),
          }
          const updatedFrames = [...state.frames, endedFrame].slice(-20)
          return {
            currentFrame: null,
            frames: updatedFrames,
          }
        }
        return state
      })
    }
  },
  
  clearFrames: () => {
    set({
      currentFrame: null,
      frames: [],
      nodeSnapshots: new Map<string, NodeExecutionSnapshot[]>(),
    })
  },
  
  // Explain Mode actions
  setExplainMode: (enabled) => set({ explainMode: enabled }),
  toggleExplainMode: () => set((state) => ({ explainMode: !state.explainMode })),
  
  // Performance Mode actions
  setPerfMode: (enabled) => {
    set({ perfMode: enabled })
    // Persistir en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('perfMode', enabled.toString())
    }
  },
  togglePerfMode: () => set((state) => {
    const newValue = !state.perfMode
    // Persistir en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('perfMode', newValue.toString())
    }
    return { perfMode: newValue }
  }),
  setShowPerfReadout: (show) => {
    set({ showPerfReadout: show })
    if (typeof window !== 'undefined') {
      localStorage.setItem('showPerfReadout', String(show))
    }
  },
  toggleShowPerfReadout: () => set((state) => {
    const newValue = !state.showPerfReadout
    if (typeof window !== 'undefined') {
      localStorage.setItem('showPerfReadout', String(newValue))
    }
    return { showPerfReadout: newValue }
  }),
  
  setWsEventQueueSize: (size) => set({ wsEventQueueSize: size }),
  
  reset: () => set({
    ...initialState,
    nodeRuntimeStates: new Map(),
    wsConnected: false,
    nodeSnapshots: new Map<string, NodeExecutionSnapshot[]>(),
  }),
}))

