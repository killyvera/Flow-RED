/**
 * Utilidades para trabajar con subflows
 */

import type { NodeRedNode, NodeRedSubflowDefinition, NodeRedSubflowInstance } from '@/api/types'

/**
 * Verifica si un nodo es una definición de subflow
 */
export function isSubflowDefinition(node: NodeRedNode): node is NodeRedSubflowDefinition {
  return node.type === 'subflow'
}

/**
 * Verifica si un nodo es una instancia de subflow
 */
export function isSubflowInstance(node: NodeRedNode): node is NodeRedSubflowInstance {
  return typeof node.type === 'string' && node.type.startsWith('subflow:')
}

/**
 * Extrae el ID del subflow desde el tipo de una instancia
 * Ejemplo: 'subflow:abc123' -> 'abc123'
 */
export function extractSubflowIdFromType(type: string): string | null {
  if (type.startsWith('subflow:')) {
    return type.replace('subflow:', '')
  }
  return null
}

/**
 * Obtiene la definición de subflow para una instancia
 */
export function getSubflowDefinition(
  instance: NodeRedSubflowInstance,
  subflowDefinitions: NodeRedSubflowDefinition[]
): NodeRedSubflowDefinition | null {
  const subflowId = extractSubflowIdFromType(instance.type) || instance.subflowId
  if (!subflowId) {
    return null
  }
  return subflowDefinitions.find(def => def.id === subflowId) || null
}

/**
 * Obtiene el número de entradas de un subflow
 */
export function getSubflowInputs(subflow: NodeRedSubflowDefinition): number {
  return subflow.in?.length || subflow.inputs || 0
}

/**
 * Obtiene el número de salidas de un subflow
 */
export function getSubflowOutputs(subflow: NodeRedSubflowDefinition): number {
  return subflow.out?.length || subflow.outputs || 0
}

