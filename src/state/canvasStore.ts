/**
 * Store de Zustand para el estado del canvas
 * 
 * Maneja el estado del canvas, flows cargados, y el flow activo.
 */

import { create } from 'zustand'
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow'
import type { NodeRedNode, NodeRedGroup } from '@/api/types'

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
  
  // Acciones
  setNodes: (nodes: ReactFlowNode[]) => void
  setEdges: (edges: ReactFlowEdge[]) => void
  setGroups: (groups: NodeRedGroup[]) => void
  setCollapsedGroupIds: (ids: Set<string>) => void
  toggleGroupCollapsed: (groupId: string) => void
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
  
  reset: () => void
}

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  groups: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isEditMode: false, // Por defecto modo solo lectura
  isLoading: false,
  error: null,
  nodeRedNodes: [],
  flows: [],
  activeFlowId: null,
  collapsedGroupIds: new Set<string>(),
}

export const useCanvasStore = create<CanvasState>((set) => ({
  ...initialState,
  
  setNodes: (nodes) => set({ nodes }),
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
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  setEditMode: (isEditMode) => set({ isEditMode }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  setNodeRedNodes: (nodes) => set({ nodeRedNodes: nodes }),
  setFlows: (flows) => set({ flows }),
  setActiveFlowId: (flowId) => set({ activeFlowId: flowId }),
  
  reset: () => set(initialState),
}))

