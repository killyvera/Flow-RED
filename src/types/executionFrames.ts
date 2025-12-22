/**
 * Tipos para Execution Frames
 * 
 * Execution Frames agrupan eventos WebSocket en sesiones de ejecución coherentes,
 * proporcionando un modelo mental de "sesión de ejecución" similar a n8n.
 * 
 * Integrado con el plugin node-red-runtime-observability para Input/Output real,
 * semantics automáticas, y timing preciso.
 */

import type { NodeRuntimeState } from '@/state/canvasStore'

// ============================================================================
// Tipos del Plugin Observability
// ============================================================================

/**
 * Payload de un mensaje capturado por el plugin
 * El plugin trunca automáticamente y redacta campos sensibles
 */
export interface IOPayload {
  /** Preview del payload (truncado y seguro) */
  preview?: any
  /** Tipo del payload: object, string, number, array, null, etc. */
  type: string
  /** Tamaño aproximado en bytes */
  size?: number
  /** Si el payload fue truncado */
  truncated: boolean
}

/**
 * Evento de Input/Output capturado por el plugin
 */
export interface IOEvent {
  /** Dirección: input cuando el nodo recibe, output cuando envía */
  direction: 'input' | 'output'
  /** Puerto de salida (solo para outputs): 0, 1, 2... */
  port?: number
  /** Timestamp del evento */
  timestamp: number
  /** Payload capturado */
  payload: IOPayload
}

/**
 * Semánticas detectadas automáticamente por el plugin
 * Indica el rol y comportamiento del nodo en la ejecución
 */
export interface NodeSemantics {
  /** Rol del nodo en el flujo */
  role: 'trigger' | 'transform' | 'filter' | 'generator' | 'sink'
  /** Comportamiento observado durante la ejecución */
  behavior: 'pass-through' | 'transformed' | 'filtered' | 'bifurcated' | 'terminated'
}

/**
 * Timing de ejecución de un nodo
 */
export interface NodeTiming {
  /** Timestamp cuando recibió el input */
  receivedAt?: number
  /** Timestamp cuando envió el output */
  sentAt?: number
  /** Duración de procesamiento en milisegundos */
  durationMs?: number
}

/**
 * Estadísticas de un frame de ejecución
 */
export interface FrameStats {
  /** Número de nodos que participaron */
  nodeCount: number
  /** Total de outputs emitidos */
  outputsEmitted: number
  /** Nodos que recibieron pero no enviaron (filtraron) */
  filteredNodes: number
  /** Nodos que tuvieron errores */
  erroredNodes: number
  /** Duración total del frame en milisegundos */
  durationMs?: number
}

// ============================================================================
// Tipos de Execution Frames
// ============================================================================

/**
 * Frame de ejecución que agrupa eventos relacionados
 */
export interface ExecutionFrame {
  /** ID único del frame */
  id: string
  /** Timestamp de inicio del frame */
  startedAt: number
  /** Timestamp de fin del frame (opcional, undefined si está activo) */
  endedAt?: number
  /** ID del nodo que inició la ejecución (trigger node) */
  triggerNodeId?: string
  /** Etiqueta descriptiva opcional */
  label?: string
  /** Estadísticas del frame (disponible cuando termina) */
  stats?: FrameStats
}

/**
 * Snapshot de ejecución de un nodo dentro de un frame
 * Enriquecido con datos del plugin observability
 */
export interface NodeExecutionSnapshot {
  /** ID del nodo */
  nodeId: string
  /** ID del frame al que pertenece */
  frameId: string
  /** Estado de runtime del nodo */
  status: NodeRuntimeState
  /** Timestamp del snapshot */
  ts: number
  /** Resumen opcional de la ejecución */
  summary?: string
  /** Preview del payload (truncado, no el payload completo) - legacy */
  payloadPreview?: string
  
  // Campos enriquecidos del plugin observability
  /** Tipo del nodo (inject, function, debug, etc.) */
  nodeType?: string
  /** Input recibido por el nodo */
  input?: IOEvent
  /** Outputs enviados por el nodo (puede ser múltiple en bifurcaciones) */
  outputs?: IOEvent[]
  /** Semánticas detectadas (rol y comportamiento) */
  semantics?: NodeSemantics
  /** Timing de ejecución */
  timing?: NodeTiming
  /** Si el evento fue muestreado (true) o filtrado por sampling (false) */
  sampled?: boolean
}

// ============================================================================
// Tipos de Eventos del WebSocket Observability
// ============================================================================

/**
 * Evento base del WebSocket de observability
 */
export interface ObservabilityEventBase {
  /** Tipo de evento */
  event: string
  /** Timestamp Unix en milisegundos */
  ts: number
  /** ID del frame (para eventos de ejecución) */
  frameId?: string
  /** ID del nodo (para eventos de nodo) */
  nodeId?: string
}

/**
 * Evento de conexión exitosa
 */
export interface ObservabilityConnectedEvent extends ObservabilityEventBase {
  event: 'connected'
  message: string
}

/**
 * Evento de heartbeat para mantener conexión
 */
export interface ObservabilityHeartbeatEvent extends ObservabilityEventBase {
  event: 'heartbeat'
  connections: number
}

/**
 * Evento de inicio de frame
 */
export interface ObservabilityFrameStartEvent extends ObservabilityEventBase {
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
export interface ObservabilityNodeInputEvent extends ObservabilityEventBase {
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
export interface ObservabilityNodeOutputEvent extends ObservabilityEventBase {
  event: 'node:output'
  frameId: string
  nodeId: string
  data: {
    nodeId: string
    nodeType: string
    outputs: IOEvent[]
    semantics: NodeSemantics
    timing: NodeTiming
    sampled: boolean
  }
}

/**
 * Evento de fin de frame
 */
export interface ObservabilityFrameEndEvent extends ObservabilityEventBase {
  event: 'frame:end'
  frameId: string
  data: {
    id: string
    endedAt: number
    stats: FrameStats
  }
}

/**
 * Unión de todos los tipos de eventos de observability
 */
export type ObservabilityEvent =
  | ObservabilityConnectedEvent
  | ObservabilityHeartbeatEvent
  | ObservabilityFrameStartEvent
  | ObservabilityNodeInputEvent
  | ObservabilityNodeOutputEvent
  | ObservabilityFrameEndEvent
