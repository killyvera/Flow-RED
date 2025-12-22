/**
 * Tipos para Execution Frames
 * 
 * Execution Frames agrupan eventos WebSocket en sesiones de ejecución coherentes,
 * proporcionando un modelo mental de "sesión de ejecución" similar a n8n.
 */

import type { NodeRuntimeState } from '@/state/canvasStore'
import type { NodeExecutionData } from '@/types/observability'

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
  /** Nodos que participaron en el frame (del plugin de observability) */
  nodes?: Map<string, NodeExecutionData>
}

/**
 * Snapshot de ejecución de un nodo dentro de un frame
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
  /** Preview del payload (truncado, no el payload completo) */
  payloadPreview?: string
}

