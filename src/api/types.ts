/**
 * Tipos TypeScript para estructuras de Node-RED
 * 
 * Basados en la estructura real de Node-RED flows y nodos.
 */

/**
 * Nodo de Node-RED
 * 
 * Estructura básica de un nodo en Node-RED.
 * Los nodos pueden tener propiedades adicionales según su tipo.
 */
export interface NodeRedNode {
  /** ID único del nodo */
  id: string
  /** Tipo del nodo (ej: "inject", "debug", "function", "tab") */
  type: string
  /** Posición X en el canvas */
  x: number
  /** Posición Y en el canvas */
  y: number
  /** ID del flow (tab) al que pertenece */
  z?: string
  /** ID del grupo al que pertenece (para nodos dentro de grupos) */
  g?: string
  /** Ancho del nodo/grupo (para grupos) */
  w?: number
  /** Alto del nodo/grupo (para grupos) */
  h?: number
  /** Nombre/etiqueta del nodo */
  name?: string
  /** 
   * Wires: Array de arrays donde cada elemento representa un puerto de salida.
   * Cada array interno contiene IDs de nodos destino conectados a ese puerto.
   * Ejemplo: [[target1, target2], [target3]] significa:
   *   - Puerto de salida 0 → conectado a target1 y target2
   *   - Puerto de salida 1 → conectado a target3
   */
  wires?: string[][]
  /** Label del flow (para tabs) */
  label?: string
  /** Información adicional del flow (para tabs) */
  info?: string
  /** Si el flow está deshabilitado (para tabs) */
  disabled?: boolean
  /** Otras propiedades específicas del tipo de nodo */
  [key: string]: any
}

/**
 * Grupo de Node-RED
 * 
 * Un grupo es un contenedor visual que agrupa nodos relacionados.
 * Los grupos tienen dimensiones (w, h) y posición (x, y).
 */
export interface NodeRedGroup extends NodeRedNode {
  type: 'group'
  /** Ancho del grupo (requerido para grupos) */
  w: number
  /** Alto del grupo (requerido para grupos) */
  h: number
  /** Color de fondo del grupo (opcional) */
  color?: string
  /** Estilo del grupo (opcional) */
  style?: Record<string, any>
}

/**
 * Flow de Node-RED
 * 
 * Un flow es un tab en Node-RED que contiene nodos.
 * El tipo "tab" es un flow especial que actúa como contenedor.
 */
export interface NodeRedFlow extends NodeRedNode {
  type: 'tab'
  /** Nodos contenidos en este flow (solo en respuesta de API v2) */
  nodes?: NodeRedNode[]
  /** Config nodes del flow (solo en respuesta de API v2) */
  configs?: NodeRedNode[]
  /** Subflows del flow (solo en respuesta de API v2) */
  subflows?: NodeRedNode[]
  /** Grupos del flow (solo en respuesta de API v2) */
  groups?: NodeRedNode[]
}

/**
 * Respuesta de la API GET /flows (v1)
 * 
 * Retorna directamente un array de flows
 */
export type NodeRedFlowsResponseV1 = NodeRedNode[]

/**
 * Respuesta de la API GET /flows (v2)
 * 
 * Retorna un objeto con metadata y flows
 */
export interface NodeRedFlowsResponseV2 {
  /** Versión/revisión de los flows */
  rev: string
  /** Array de flows */
  flows: NodeRedNode[]
}

/**
 * Respuesta de la API GET /nodes
 * 
 * Información sobre los tipos de nodos disponibles
 */
export interface NodeRedNodesResponse {
  [nodeType: string]: {
    id: string
    name: string
    types: string[]
    enabled: boolean
    module: string
    version: string
    local: boolean
    [key: string]: any
  }
}

/**
 * Tipo unión para la respuesta de flows
 * Puede ser v1 (array) o v2 (objeto)
 */
export type NodeRedFlowsResponse = NodeRedFlowsResponseV1 | NodeRedFlowsResponseV2

/**
 * Helper para determinar si una respuesta es v2
 */
export function isV2Response(
  response: NodeRedFlowsResponse
): response is NodeRedFlowsResponseV2 {
  return typeof response === 'object' && 'rev' in response && 'flows' in response
}

/**
 * Helper para extraer el array de flows de cualquier versión
 */
export function extractFlows(response: NodeRedFlowsResponse): NodeRedNode[] {
  if (isV2Response(response)) {
    return response.flows
  }
  return response as NodeRedNode[]
}

