/**
 * Validador de flows para Node-RED
 * 
 * Valida que los flows cumplan con el schema básico de Node-RED
 * antes de enviarlos al servidor.
 * 
 * Validaciones:
 * - id: string, requerido, único
 * - type: string, requerido
 * - x, y: number, requeridos
 * - z: string (flowId), requerido
 * - wires: string[][] | undefined, opcional pero debe ser válido si existe
 */

import type { NodeRedNode } from '@/api/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Valida un nodo individual de Node-RED
 * 
 * @param node Nodo a validar
 * @param nodeIndex Índice del nodo en el array (para mensajes de error)
 * @returns Resultado de la validación
 */
function validateNode(node: any, nodeIndex: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validar id
  if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
    errors.push(`Nodo ${nodeIndex}: 'id' es requerido y debe ser un string no vacío`)
  }

  // Validar type
  if (!node.type || typeof node.type !== 'string' || node.type.trim() === '') {
    errors.push(`Nodo ${nodeIndex}: 'type' es requerido y debe ser un string no vacío`)
  }

  // Validar x
  if (typeof node.x !== 'number' || isNaN(node.x)) {
    errors.push(`Nodo ${nodeIndex} (${node.id || 'sin id'}): 'x' es requerido y debe ser un número`)
  }

  // Validar y
  if (typeof node.y !== 'number' || isNaN(node.y)) {
    errors.push(`Nodo ${nodeIndex} (${node.id || 'sin id'}): 'y' es requerido y debe ser un número`)
  }

  // Validar z (flowId) - requerido para nodos que no son tabs
  if (node.type !== 'tab' && (!node.z || typeof node.z !== 'string' || node.z.trim() === '')) {
    errors.push(`Nodo ${nodeIndex} (${node.id || 'sin id'}): 'z' (flowId) es requerido para nodos que no son tabs`)
  }

  // Validar wires si existe
  if (node.wires !== undefined) {
    if (!Array.isArray(node.wires)) {
      errors.push(`Nodo ${nodeIndex} (${node.id || 'sin id'}): 'wires' debe ser un array o undefined`)
    } else {
      // Validar que cada elemento de wires sea un array de strings
      node.wires.forEach((wirePort: any, portIndex: number) => {
        if (!Array.isArray(wirePort)) {
          errors.push(`Nodo ${nodeIndex} (${node.id || 'sin id'}): wires[${portIndex}] debe ser un array`)
        } else {
          wirePort.forEach((targetId: any, targetIndex: number) => {
            if (typeof targetId !== 'string' || targetId.trim() === '') {
              errors.push(
                `Nodo ${nodeIndex} (${node.id || 'sin id'}): wires[${portIndex}][${targetIndex}] debe ser un string no vacío`
              )
            }
          })
        }
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Valida un array de nodos de Node-RED
 * 
 * @param nodes Array de nodos a validar
 * @returns Resultado de la validación
 */
export function validateFlow(nodes: NodeRedNode[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar que nodes sea un array
  if (!Array.isArray(nodes)) {
    return {
      isValid: false,
      errors: ['Los nodos deben ser un array'],
      warnings: [],
    }
  }

  // Validar que haya al menos un nodo
  if (nodes.length === 0) {
    warnings.push('El flow está vacío (no hay nodos)')
  }

  // Validar cada nodo
  nodes.forEach((node, index) => {
    const nodeValidation = validateNode(node, index)
    if (!nodeValidation.isValid) {
      errors.push(...nodeValidation.errors)
    }
  })

  // Validar IDs únicos
  const nodeIds = new Set<string>()
  const duplicateIds: string[] = []
  nodes.forEach((node, index) => {
    if (node.id) {
      if (nodeIds.has(node.id)) {
        duplicateIds.push(node.id)
        errors.push(`ID duplicado: '${node.id}' aparece múltiples veces`)
      } else {
        nodeIds.add(node.id)
      }
    }
  })

  // Validar que haya un nodo "tab" para cada flow
  const flowIds = new Set<string>()
  const tabNodes = nodes.filter(n => n.type === 'tab')
  
  nodes.forEach(node => {
    if (node.z && node.type !== 'tab') {
      flowIds.add(node.z)
    }
  })

  // Verificar que cada flow tenga su nodo tab
  flowIds.forEach(flowId => {
    const hasTab = tabNodes.some(tab => tab.id === flowId)
    if (!hasTab) {
      warnings.push(`Flow '${flowId}' no tiene un nodo 'tab' correspondiente`)
    }
  })

  // Validar que los wires apunten a nodos que existen
  const existingNodeIds = new Set(nodes.map(n => n.id).filter(Boolean))
  nodes.forEach((node, index) => {
    if (node.wires && Array.isArray(node.wires)) {
      node.wires.forEach((wirePort, portIndex) => {
        if (Array.isArray(wirePort)) {
          wirePort.forEach((targetId, targetIndex) => {
            if (typeof targetId === 'string' && !existingNodeIds.has(targetId)) {
              errors.push(
                `Nodo ${index} (${node.id || 'sin id'}): wires[${portIndex}][${targetIndex}] apunta a un nodo inexistente: '${targetId}'`
              )
            }
          })
        }
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Valida un flow antes de enviarlo a Node-RED
 * 
 * Esta función realiza validaciones críticas que deben pasar
 * antes de intentar guardar el flow.
 * 
 * @param nodes Array de nodos a validar
 * @returns Resultado de la validación
 */
export function validateFlowBeforeDeploy(nodes: NodeRedNode[]): ValidationResult {
  const result = validateFlow(nodes)

  // Para deploy, los warnings también son importantes
  // pero no bloquean el deploy
  if (result.errors.length > 0) {
    return {
      isValid: false,
      errors: result.errors,
      warnings: result.warnings,
    }
  }

  return result
}

