/**
 * Utilidades para trabajar con link nodes
 */

import type { NodeRedNode } from '@/api/types'

/**
 * Verifica si un nodo es un link in
 */
export function isLinkIn(node: NodeRedNode): boolean {
  return node.type === 'link in'
}

/**
 * Verifica si un nodo es un link out
 */
export function isLinkOut(node: NodeRedNode): boolean {
  return node.type === 'link out'
}

/**
 * Verifica si un nodo es un link call
 */
export function isLinkCall(node: NodeRedNode): boolean {
  return node.type === 'link call'
}

/**
 * Obtiene los links de un nodo link
 * Los links pueden ser un array de IDs o un string con IDs separados por comas
 */
export function getLinkTargets(node: NodeRedNode): string[] {
  if (!node.links) {
    return []
  }
  
  if (Array.isArray(node.links)) {
    return node.links
  }
  
  if (typeof node.links === 'string') {
    return node.links.split(',').map(id => id.trim()).filter(Boolean)
  }
  
  return []
}

/**
 * Encuentra todos los nodos link out conectados a un link in
 */
export function findLinkOutTargets(
  linkInNode: NodeRedNode,
  allNodes: NodeRedNode[]
): NodeRedNode[] {
  const linkTargets = getLinkTargets(linkInNode)
  if (linkTargets.length === 0) {
    return []
  }
  
  // Buscar por ID o por nombre
  return allNodes.filter(node => {
    if (!isLinkOut(node)) {
      return false
    }
    
    // Buscar por ID
    if (linkTargets.includes(node.id)) {
      return true
    }
    
    // Buscar por nombre (si el link in tiene un nombre específico)
    const nodeName = node.name || '_DEFAULT_'
    return linkTargets.includes(nodeName)
  })
}

/**
 * Encuentra todos los nodos link in conectados a un link out
 */
export function findLinkInTargets(
  linkOutNode: NodeRedNode,
  allNodes: NodeRedNode[]
): NodeRedNode[] {
  const linkTargets = getLinkTargets(linkOutNode)
  if (linkTargets.length === 0) {
    return []
  }
  
  // Buscar por ID o por nombre
  return allNodes.filter(node => {
    if (!isLinkIn(node)) {
      return false
    }
    
    // Buscar por ID
    if (linkTargets.includes(node.id)) {
      return true
    }
    
    // Buscar por nombre (si el link out tiene un nombre específico)
    const nodeName = node.name || '_DEFAULT_'
    return linkTargets.includes(nodeName)
  })
}

/**
 * Encuentra el nodo link in que corresponde a un link call
 */
export function findLinkCallTarget(
  linkCallNode: NodeRedNode,
  allNodes: NodeRedNode[]
): NodeRedNode | null {
  const linkName = linkCallNode.name || linkCallNode.links
  if (!linkName) {
    return null
  }
  
  // Buscar link in con el mismo nombre
  return allNodes.find(node => {
    if (!isLinkIn(node)) {
      return false
    }
    const nodeName = node.name || '_DEFAULT_'
    return nodeName === linkName || node.id === linkName
  }) || null
}

