/**
 * Validador de conexiones para React Flow
 * 
 * Valida que las conexiones entre nodos sean válidas antes de crearlas.
 * 
 * Reglas de validación:
 * - source y target deben existir en nodes
 * - sourceHandle debe ser válido (output-0, output-1, etc.)
 * - targetHandle debe ser válido (input, o múltiples inputs si aplica)
 * - No permitir conexión de un nodo a sí mismo
 * - Opcional: prevenir conexiones circulares (puede ser complejo)
 */

import type { Node, Edge, Connection } from '@xyflow/react'

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Valida una conexión antes de crearla
 * 
 * @param connection Conexión a validar
 * @param nodes Array de nodos disponibles
 * @param edges Array de edges existentes (para validar duplicados)
 * @returns Resultado de la validación
 */
export function validateConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[] = []
): ValidationResult {
  // Validar que source y target estén definidos
  if (!connection.source || !connection.target) {
    return {
      isValid: false,
      error: 'Source y target son requeridos',
    }
  }

  // Validar que no sea una conexión a sí mismo
  if (connection.source === connection.target) {
    return {
      isValid: false,
      error: 'No se puede conectar un nodo a sí mismo',
    }
  }

  // Validar que source existe
  const sourceNode = nodes.find(n => n.id === connection.source)
  if (!sourceNode) {
    return {
      isValid: false,
      error: `Nodo fuente "${connection.source}" no existe`,
    }
  }

  // Validar que target existe
  const targetNode = nodes.find(n => n.id === connection.target)
  if (!targetNode) {
    return {
      isValid: false,
      error: `Nodo destino "${connection.target}" no existe`,
    }
  }

  // Validar sourceHandle
  if (connection.sourceHandle) {
    // Debe tener formato "output-{number}" o ser un string válido
    const sourceHandlePattern = /^output-\d+$/
    if (!sourceHandlePattern.test(connection.sourceHandle)) {
      // Permitir otros formatos pero validar que sea un string válido
      if (typeof connection.sourceHandle !== 'string' || connection.sourceHandle.trim() === '') {
        return {
          isValid: false,
          error: 'sourceHandle debe ser un string válido',
        }
      }
    }
  }

  // Validar targetHandle
  if (connection.targetHandle) {
    // Debe ser "input" o un formato válido para múltiples inputs
    if (typeof connection.targetHandle !== 'string' || connection.targetHandle.trim() === '') {
      return {
        isValid: false,
        error: 'targetHandle debe ser un string válido',
      }
    }
  }

  // Validar que no exista una conexión duplicada
  const duplicateEdge = edges.find(
    edge =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  )

  if (duplicateEdge) {
    return {
      isValid: false,
      error: 'Ya existe una conexión entre estos nodos con los mismos puertos',
    }
  }

  // Validar que el puerto de salida existe en el nodo fuente
  if (connection.sourceHandle) {
    const outputPortIndex = parseInt(connection.sourceHandle.replace('output-', ''), 10)
    if (!isNaN(outputPortIndex)) {
      const outputPortsCount = sourceNode.data?.outputPortsCount || 1
      if (outputPortIndex >= outputPortsCount) {
        return {
          isValid: false,
          error: `El nodo fuente solo tiene ${outputPortsCount} puerto(s) de salida (índice máximo: ${outputPortsCount - 1})`,
        }
      }
    }
  }

  return {
    isValid: true,
  }
}

/**
 * Valida si una conexión crearía un ciclo en el grafo
 * 
 * Esta es una validación opcional que puede ser compleja.
 * Por ahora, solo validamos conexiones directas a sí mismo.
 * 
 * @param connection Conexión a validar
 * @param edges Edges existentes
 * @returns true si la conexión crearía un ciclo
 */
export function wouldCreateCycle(
  connection: Connection,
  edges: Edge[]
): boolean {
  // Validación básica: no permitir conexión a sí mismo
  if (connection.source === connection.target) {
    return true
  }

  // Validación de ciclo simple: verificar si target tiene un camino a source
  // Esto es una implementación básica, puede mejorarse con DFS/BFS
  if (!connection.target) {
    return true // Si no hay target, no se puede crear ciclo
  }
  const visited = new Set<string>()
  const stack: string[] = [connection.target]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current)) continue
    visited.add(current)

    // Si encontramos el source, hay un ciclo
    if (current === connection.source) {
      return true
    }

    // Agregar todos los nodos destino de los edges que salen de current
    edges
      .filter(edge => edge.source === current)
      .forEach(edge => {
        if (!visited.has(edge.target)) {
          stack.push(edge.target)
        }
      })
  }

  return false
}

/**
 * Valida una conexión completa (incluyendo detección de ciclos si se requiere)
 * 
 * @param connection Conexión a validar
 * @param nodes Array de nodos disponibles
 * @param edges Array de edges existentes
 * @param checkCycles Si true, también valida ciclos (default: false)
 * @returns Resultado de la validación
 */
export function validateConnectionComplete(
  connection: Connection,
  nodes: Node[],
  edges: Edge[] = [],
  checkCycles: boolean = false
): ValidationResult {
  // Primero validar la conexión básica
  const basicValidation = validateConnection(connection, nodes, edges)
  if (!basicValidation.isValid) {
    return basicValidation
  }

  // Si se requiere, validar ciclos
  if (checkCycles && wouldCreateCycle(connection, edges)) {
    return {
      isValid: false,
      error: 'Esta conexión crearía un ciclo en el grafo',
    }
  }

  return {
    isValid: true,
  }
}

