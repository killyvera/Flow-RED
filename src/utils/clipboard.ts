/**
 * Sistema de clipboard interno para copiar/pegar nodos
 * 
 * Almacena nodos y edges en memoria (localStorage como fallback)
 * para permitir copiar/pegar entre sesiones.
 */

import type { Node, Edge } from '@xyflow/react'

const CLIPBOARD_KEY = 'node-red-editor-clipboard'

export interface ClipboardData {
  nodes: Node[]
  edges: Edge[]
  timestamp: number
}

/**
 * Copiar nodos y edges al clipboard
 */
export function copyToClipboard(nodes: Node[], edges: Edge[]): void {
  const data: ClipboardData = {
    nodes: nodes.map(node => ({
      ...node,
      // Resetear posición para que se coloquen en la posición del cursor al pegar
      position: { x: 0, y: 0 },
    })),
    edges: edges.map(edge => ({
      ...edge,
      // Resetear IDs de edges para que se generen nuevos al pegar
      id: `${edge.source}-${edge.sourceHandle || '0'}-${edge.target}-${edge.targetHandle || 'input'}-${Date.now()}`,
    })),
    timestamp: Date.now(),
  }

  try {
    // Intentar usar Clipboard API si está disponible
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(JSON.stringify(data))
    }
  } catch (err) {
    console.warn('Clipboard API no disponible, usando localStorage:', err)
  }

  // Siempre guardar en localStorage como respaldo
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Error guardando en localStorage:', err)
  }
}

/**
 * Obtener datos del clipboard
 */
export function getFromClipboard(): ClipboardData | null {
  try {
    // Intentar leer del Clipboard API primero
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        try {
          const data = JSON.parse(text) as ClipboardData
          if (data.nodes && data.edges) {
            return data
          }
        } catch (err) {
          // Ignorar errores de parsing
        }
      }).catch(() => {
        // Ignorar errores de clipboard API
      })
    }
  } catch (err) {
    // Ignorar errores
  }

  // Leer de localStorage como respaldo
  try {
    const stored = localStorage.getItem(CLIPBOARD_KEY)
    if (stored) {
      const data = JSON.parse(stored) as ClipboardData
      // Validar que tenga la estructura correcta
      if (data.nodes && Array.isArray(data.nodes) && data.edges && Array.isArray(data.edges)) {
        return data
      }
    }
  } catch (err) {
    console.error('Error leyendo de localStorage:', err)
  }

  return null
}

/**
 * Verificar si hay datos en el clipboard
 */
export function hasClipboardData(): boolean {
  return getFromClipboard() !== null
}

/**
 * Pegar nodos y edges desde el clipboard con offset
 * 
 * @param offsetX Offset en X para la nueva posición
 * @param offsetY Offset en Y para la nueva posición
 * @returns Nodos y edges pegados con nuevos IDs
 */
export function pasteFromClipboard(
  offsetX: number = 50,
  offsetY: number = 50
): { nodes: Node[]; edges: Edge[] } | null {
  const data = getFromClipboard()
  if (!data) return null

  // Generar nuevos IDs para los nodos
  const idMap = new Map<string, string>()
  const newNodes = data.nodes.map((node, index) => {
    const newId = `${node.data.nodeRedType || 'node'}-${Date.now()}-${index}`
    idMap.set(node.id, newId)
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
      data: {
        ...node.data,
        nodeRedNode: {
          ...node.data.nodeRedNode,
          id: newId,
        },
      },
    }
  })

  // Actualizar IDs de edges para referenciar los nuevos nodos
  const newEdges = data.edges
    .map(edge => {
      const newSource = idMap.get(edge.source)
      const newTarget = idMap.get(edge.target)
      if (!newSource || !newTarget) return null
      return {
        ...edge,
        id: `${newSource}-${edge.sourceHandle || '0'}-${newTarget}-${edge.targetHandle || 'input'}-${Date.now()}`,
        source: newSource,
        target: newTarget,
      }
    })
    .filter((edge): edge is Edge => edge !== null)

  return { nodes: newNodes, edges: newEdges }
}

/**
 * Limpiar el clipboard
 */
export function clearClipboard(): void {
  try {
    localStorage.removeItem(CLIPBOARD_KEY)
  } catch (err) {
    console.error('Error limpiando clipboard:', err)
  }
}

