/**
 * Factory de tipos de nodos
 * 
 * Mapea tipos de Node-RED a componentes React Flow específicos.
 * Si no hay un componente específico, usa BaseNode como fallback.
 */

import type { Node } from 'reactflow'
import { BaseNode } from './BaseNode'
import { InjectNode } from './InjectNode'
import { DebugNode } from './DebugNode'
import { GroupNode } from './GroupNode'
import type { BaseNodeData } from './types'

/**
 * Mapeo de tipos de Node-RED a componentes React Flow
 * 
 * Mapea tipos específicos a sus componentes personalizados.
 * Si no hay un componente específico, usa BaseNode como fallback.
 */
const nodeTypeMap: Record<string, React.ComponentType<any>> = {
  'inject': InjectNode,
  'debug': DebugNode,
  'group': GroupNode,
  // Más tipos se pueden añadir aquí:
  // 'function': FunctionNode,
  // 'http in': HttpInNode,
  // 'http out': HttpOutNode,
  // etc.
}

/**
 * Obtiene el tipo de nodo React Flow para un tipo de Node-RED
 * 
 * @param nodeRedType Tipo del nodo de Node-RED (ej: "inject", "debug")
 * @returns Tipo de nodo React Flow (por defecto "baseNode")
 */
export function getNodeType(nodeRedType: string | undefined): string {
  if (!nodeRedType) return 'baseNode'
  
  // Si hay un componente específico registrado, usar su tipo
  if (nodeTypeMap[nodeRedType]) {
    return nodeRedType // El tipo será el mismo que el nodeRedType
  }
  
  // Por defecto usar baseNode
  return 'baseNode'
}

/**
 * Obtiene el componente de nodo para un tipo de Node-RED
 * 
 * @param nodeRedType Tipo del nodo de Node-RED
 * @returns Componente React Flow o BaseNode como fallback
 */
export function getNodeComponent(nodeRedType: string | undefined): React.ComponentType<any> {
  if (!nodeRedType) return BaseNode
  
  // Si hay un componente específico, usarlo
  if (nodeTypeMap[nodeRedType]) {
    return nodeTypeMap[nodeRedType]
  }
  
  // Por defecto usar BaseNode
  return BaseNode
}

/**
 * Registra un componente personalizado para un tipo de nodo
 * 
 * @param nodeRedType Tipo del nodo de Node-RED
 * @param component Componente React Flow
 */
export function registerNodeComponent(
  nodeRedType: string,
  component: React.ComponentType<any>
): void {
  nodeTypeMap[nodeRedType] = component
}

/**
 * Obtiene todos los tipos de nodos registrados
 * 
 * @returns Array de tipos de nodos registrados
 */
export function getRegisteredNodeTypes(): string[] {
  return Object.keys(nodeTypeMap)
}

