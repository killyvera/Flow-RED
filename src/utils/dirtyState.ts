/**
 * Sistema de tracking de dirty state para flows
 * 
 * Rastrea cambios en nodos, edges, y propiedades para determinar
 * si un flow tiene cambios no guardados.
 */

import type { Node, Edge } from '@xyflow/react'
import type { NodeRedNode } from '@/api/types'

/**
 * Estado guardado de un flow (snapshot para comparación)
 */
export interface SavedFlowState {
  nodes: Node[]
  edges: Edge[]
  nodeRedNodes: NodeRedNode[]
  timestamp: number
}

/**
 * Compara dos arrays de nodos para detectar cambios
 */
function nodesChanged(
  current: Node[],
  saved: Node[]
): boolean {
  // Comparar longitud
  if (current.length !== saved.length) {
    return true
  }

  // Crear mapas para comparación eficiente
  const currentMap = new Map(current.map(n => [n.id, n]))
  const savedMap = new Map(saved.map(n => [n.id, n]))

  // Verificar si hay nodos nuevos o eliminados
  for (const id of currentMap.keys()) {
    if (!savedMap.has(id)) {
      return true // Nodo nuevo
    }
  }
  for (const id of savedMap.keys()) {
    if (!currentMap.has(id)) {
      return true // Nodo eliminado
    }
  }

  // Comparar propiedades de cada nodo
  for (const [id, currentNode] of currentMap) {
    const savedNode = savedMap.get(id)!
    
    // Comparar posición
    if (
      Math.abs(currentNode.position.x - savedNode.position.x) > 0.1 ||
      Math.abs(currentNode.position.y - savedNode.position.y) > 0.1
    ) {
      return true
    }

    // Comparar data (nodeRedNode) - solo propiedades editables
    const currentData = currentNode.data?.nodeRedNode
    const savedData = savedNode.data?.nodeRedNode

    if (currentData && savedData) {
      // Comparar propiedades editables (excluir internas)
      const editableProps = ['name', 'label', 'disabled', 'color', 'info']
      for (const prop of editableProps) {
        if (currentData[prop] !== savedData[prop]) {
          return true
        }
      }

      // Comparar propiedades personalizadas (excluir internas)
      const internalProps = new Set([
        'id', 'type', 'x', 'y', 'z', 'wires', '_', 'dirty', 'changed',
        'valid', 'users', 'inputLabels', 'outputLabels', 'selected', 'moved',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
        '_config', '_def', '_orig'
      ])

      // Obtener todas las propiedades de ambos objetos
      const allProps = new Set([
        ...Object.keys(currentData),
        ...Object.keys(savedData)
      ])

      for (const prop of allProps) {
        if (!internalProps.has(prop)) {
          const currentVal = currentData[prop]
          const savedVal = savedData[prop]
          
          // Comparación profunda para objetos/arrays
          if (JSON.stringify(currentVal) !== JSON.stringify(savedVal)) {
            return true
          }
        }
      }
    } else if (currentData !== savedData) {
      // Uno tiene data y el otro no
      return true
    }

    // Comparar parentId (para grupos)
    if (currentNode.parentId !== savedNode.parentId) {
      return true
    }
  }

  return false
}

/**
 * Compara dos arrays de edges para detectar cambios
 */
function edgesChanged(
  current: Edge[],
  saved: Edge[]
): boolean {
  // Comparar longitud
  if (current.length !== saved.length) {
    return true
  }

  // Crear mapas para comparación eficiente
  const currentMap = new Map(current.map(e => [e.id, e]))
  const savedMap = new Map(saved.map(e => [e.id, e]))

  // Verificar si hay edges nuevos o eliminados
  for (const id of currentMap.keys()) {
    if (!savedMap.has(id)) {
      return true // Edge nuevo
    }
  }
  for (const id of savedMap.keys()) {
    if (!currentMap.has(id)) {
      return true // Edge eliminado
    }
  }

  // Comparar propiedades de cada edge
  for (const [id, currentEdge] of currentMap) {
    const savedEdge = savedMap.get(id)!
    
    // Comparar source y target
    if (
      currentEdge.source !== savedEdge.source ||
      currentEdge.target !== savedEdge.target
    ) {
      return true
    }

    // Comparar sourceHandle y targetHandle
    if (
      currentEdge.sourceHandle !== savedEdge.sourceHandle ||
      currentEdge.targetHandle !== savedEdge.targetHandle
    ) {
      return true
    }
  }

  return false
}

/**
 * Verifica si un flow tiene cambios no guardados
 */
export function hasUnsavedChanges(
  currentNodes: Node[],
  currentEdges: Edge[],
  savedState: SavedFlowState | null
): boolean {
  if (!savedState) {
    // Si no hay estado guardado, considerar como "sin cambios" (primera carga)
    return false
  }

  // Comparar nodos
  if (nodesChanged(currentNodes, savedState.nodes)) {
    return true
  }

  // Comparar edges
  if (edgesChanged(currentEdges, savedState.edges)) {
    return true
  }

  return false
}

/**
 * Crea un snapshot del estado actual del flow
 */
export function createFlowSnapshot(
  nodes: Node[],
  edges: Edge[],
  nodeRedNodes: NodeRedNode[]
): SavedFlowState {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)), // Deep copy
    edges: JSON.parse(JSON.stringify(edges)), // Deep copy
    nodeRedNodes: JSON.parse(JSON.stringify(nodeRedNodes)), // Deep copy
    timestamp: Date.now(),
  }
}

