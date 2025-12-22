/**
 * Tipos para el plugin node-red-runtime-observability
 * 
 * Execution Contract v1 - Eventos y estructuras de datos del plugin
 */

/**
 * Evento base de observability
 */
export interface ObservabilityEvent {
  /** Tipo de evento */
  event: string
  /** Timestamp Unix (ms) */
  ts: number
  /** ID del frame (para eventos de ejecución) */
  frameId?: string
  /** ID del nodo (para eventos de nodo) */
  nodeId?: string
  /** Datos específicos del evento */
  data?: any
  /** Mensaje opcional (para eventos como 'connected') */
  message?: string
  /** Número de conexiones (para eventos como 'heartbeat') */
  connections?: number
}

/**
 * Evento de conexión
 */
export interface ConnectedEvent extends ObservabilityEvent {
  event: 'connected'
  message: string
}

/**
 * Evento de heartbeat
 */
export interface HeartbeatEvent extends ObservabilityEvent {
  event: 'heartbeat'
  connections: number
}

/**
 * Evento de inicio de frame
 */
export interface FrameStartEvent extends ObservabilityEvent {
  event: 'frame:start'
  frameId: string
  data: {
    id: string
    startedAt: number
    triggerNodeId?: string
  }
}

/**
 * Evento de input de nodo
 */
export interface NodeInputEvent extends ObservabilityEvent {
  event: 'node:input'
  frameId: string
  nodeId: string
  data: {
    nodeId: string
    nodeType: string
    input: IOEvent
    sampled: boolean
  }
}

/**
 * Evento de output de nodo
 */
export interface NodeOutputEvent extends ObservabilityEvent {
  event: 'node:output'
  frameId: string
  nodeId: string
  data: {
    nodeId: string
    nodeType: string
    outputs: IOEvent[]
    semantics?: NodeSemantics
    timing?: NodeTiming
    sampled: boolean
  }
}

/**
 * Evento de fin de frame
 */
export interface FrameEndEvent extends ObservabilityEvent {
  event: 'frame:end'
  frameId: string
  data: {
    id: string
    endedAt: number
    stats: FrameStats
  }
}

/**
 * Evento de IO (input/output)
 */
export interface IOEvent {
  /** Dirección: input o output */
  direction: 'input' | 'output'
  /** Puerto de salida (solo para outputs, 0, 1, 2...) */
  port?: number
  /** Timestamp del evento */
  timestamp: number
  /** Payload con preview */
  payload: PayloadPreview
}

/**
 * Preview del payload (truncado y seguro)
 */
export interface PayloadPreview {
  /** Preview truncado del payload */
  preview?: any
  /** Tipo del payload */
  type: 'object' | 'string' | 'number' | 'array' | 'null' | 'boolean'
  /** Tamaño aproximado en bytes */
  size?: number
  /** Si el payload fue truncado */
  truncated: boolean
}

/**
 * Semantics del nodo (role y behavior)
 */
export interface NodeSemantics {
  /** Rol del nodo */
  role: 'trigger' | 'transform' | 'filter' | 'generator' | 'sink'
  /** Comportamiento del nodo */
  behavior: 'pass-through' | 'transformed' | 'filtered' | 'bifurcated' | 'terminated'
}

/**
 * Timing del nodo
 */
export interface NodeTiming {
  /** Timestamp cuando recibió el input */
  receivedAt: number
  /** Timestamp cuando envió el output */
  sentAt: number
  /** Duración de procesamiento en milisegundos */
  durationMs: number
}

/**
 * Estadísticas del frame
 */
export interface FrameStats {
  /** Número de nodos que participaron */
  nodeCount: number
  /** Total de outputs emitidos */
  outputsEmitted: number
  /** Nodos que recibieron pero no enviaron (filtrados) */
  filteredNodes: number
  /** Nodos que tuvieron errores */
  erroredNodes: number
  /** Duración total del frame en milisegundos */
  durationMs: number
}

/**
 * Datos de ejecución de un nodo dentro de un frame
 */
export interface NodeExecutionData {
  /** ID del nodo */
  nodeId: string
  /** Tipo del nodo */
  nodeType: string
  /** Input recibido */
  input?: IOEvent
  /** Outputs enviados (puede ser múltiple si hay bifurcación) */
  outputs: IOEvent[]
  /** Semantics del nodo */
  semantics?: NodeSemantics
  /** Timing del nodo */
  timing?: NodeTiming
  /** Si fue muestreado (sampled) */
  sampled?: boolean
}

/**
 * Datos completos de un frame
 */
export interface FrameData {
  /** ID del frame */
  id: string
  /** ID del nodo trigger (si existe) */
  triggerNodeId?: string
  /** Timestamp de inicio */
  startedAt: number
  /** Timestamp de fin (opcional) */
  endedAt?: number
  /** Nodos que participaron en el frame */
  nodes: Map<string, NodeExecutionData>
  /** Estadísticas del frame */
  stats?: FrameStats
}

