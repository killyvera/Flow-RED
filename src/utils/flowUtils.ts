/**
 * Utilidades para gestión de flows
 * 
 * Funciones helper para validar, formatear y trabajar con flows.
 * NO genera IDs - la API lo hace automáticamente.
 */

import type { NodeRedNode } from '@/api/types'

/**
 * Valida la estructura básica de un flow JSON
 * 
 * @param json JSON a validar (string o objeto)
 * @returns Objeto con isValid y errors
 */
export function validateFlowJson(json: string | object): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  try {
    const flowData = typeof json === 'string' ? JSON.parse(json) : json
    
    // Verificar que sea un objeto
    if (typeof flowData !== 'object' || flowData === null) {
      errors.push('El JSON debe ser un objeto')
      return { isValid: false, errors }
    }
    
    // Extraer el flow (puede estar en flow.flow o directamente)
    const flow = flowData.flow || flowData
    
    // Verificar que tenga un nombre
    if (!flow.label && !flow.name) {
      errors.push('El flow debe tener un nombre (label o name)')
    }
    
    // Verificar que nodes sea un array si existe
    if (flow.nodes !== undefined && !Array.isArray(flow.nodes)) {
      errors.push('El campo nodes debe ser un array')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    }
  } catch (err) {
    errors.push(`Error al parsear JSON: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    return { isValid: false, errors }
  }
}

/**
 * Formatea una fecha para mostrar en la UI
 * 
 * @param date Fecha a formatear (Date, string o timestamp)
 * @returns String formateado
 */
export function formatDate(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date
    
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida'
  }
  
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Cuenta el número de nodos en un flow
 * 
 * @param flow Flow a contar
 * @param allNodes Todos los nodos de Node-RED
 * @returns Número de nodos (excluyendo el tab/subflow definition)
 */
export function countFlowNodes(flow: NodeRedNode, allNodes: NodeRedNode[]): number {
  // Si es un subflow, contar los nodos internos (en flow[])
  if (flow.type === 'subflow' && 'flow' in flow && Array.isArray(flow.flow)) {
    return flow.flow.length
  }
  
  // Si es un tab (flow normal), contar nodos que pertenecen a este flow
  return allNodes.filter(n => n.z === flow.id && n.type !== 'tab' && n.type !== 'subflow').length
}

