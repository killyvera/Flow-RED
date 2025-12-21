/**
 * Execution Frame Manager
 * 
 * Lógica para detectar triggers, crear frames y gestionar el ciclo de vida
 * de Execution Frames.
 */

import type { NodeRedWebSocketEvent } from '@/api/websocket'
import type { ExecutionFrame } from '@/types/executionFrames'

/**
 * Lista de tipos de nodos que actúan como triggers
 */
const TRIGGER_NODE_TYPES = new Set([
  'inject',
  'http in',
  'httpIn',
  'mqtt in',
  'mqttIn',
  'websocket in',
  'websocketIn',
  'tcp in',
  'tcpIn',
  'udp in',
  'udpIn',
  'watch',
  'tail',
])

/**
 * Verifica si un tipo de nodo es un trigger node
 */
export function isTriggerNode(nodeType: string): boolean {
  return TRIGGER_NODE_TYPES.has(nodeType.toLowerCase())
}

/**
 * Verifica si se debe iniciar un nuevo frame basado en el evento recibido
 * 
 * Reglas:
 * - Si hay evento de trigger node y no hay frame activo → crear frame
 * - Si hay evento de debug/status y no hay frame activo → crear frame (modo manual)
 * 
 * Nota: La detección real de trigger nodes se hace en el hook usando el tipo del nodo
 * desde el store. Esta función solo verifica si hay un evento que pueda iniciar un frame.
 */
export function shouldStartNewFrame(
  event: NodeRedWebSocketEvent,
  currentFrame: ExecutionFrame | null
): boolean {
  // Si ya hay un frame activo, no crear uno nuevo
  if (currentFrame) {
    return false
  }

  // Si el evento es de status, puede iniciar un frame
  // (la verificación de si es trigger node se hace en el hook)
  if (event.topic.startsWith('status/')) {
    return true
  }

  // Si es un evento de debug, puede iniciar un frame (modo manual)
  if (event.topic === 'debug' && event.data) {
    return true
  }

  return false
}

/**
 * Verifica si se debe cerrar un frame basado en timeout
 * 
 * @param currentFrame Frame actual
 * @param lastEventTime Timestamp del último evento procesado
 * @param timeout Timeout en milisegundos (default: 5000ms = 5s)
 */
export function shouldEndFrame(
  currentFrame: ExecutionFrame,
  lastEventTime: number,
  timeout: number = 5000
): boolean {
  if (!currentFrame.endedAt) {
    const timeSinceLastEvent = Date.now() - lastEventTime
    return timeSinceLastEvent >= timeout
  }
  return false
}

/**
 * Crea un preview truncado del payload
 * 
 * @param payload Payload a truncar
 * @param maxLength Longitud máxima del preview (default: 100 caracteres)
 */
export function createPayloadPreview(payload: any, maxLength: number = 100): string {
  if (payload === null || payload === undefined) {
    return 'null'
  }

  let preview: string

  if (typeof payload === 'string') {
    preview = payload
  } else if (typeof payload === 'object') {
    try {
      preview = JSON.stringify(payload)
    } catch {
      preview = String(payload)
    }
  } else {
    preview = String(payload)
  }

  if (preview.length <= maxLength) {
    return preview
  }

  return preview.substring(0, maxLength - 3) + '...'
}

/**
 * Extrae el tipo de nodo desde un evento WebSocket
 * 
 * Esto es una aproximación ya que el evento no siempre contiene el tipo directamente.
 * Se debe usar junto con el store de nodos para obtener el tipo real.
 */
export function extractNodeIdFromEvent(event: NodeRedWebSocketEvent): string | null {
  if (event.topic.startsWith('status/')) {
    return event.topic.replace('status/', '')
  }
  
  if (event.topic === 'debug' && event.data) {
    const debugData = event.data
    return debugData.id || debugData.node || debugData.nodeid || null
  }
  
  if (event.data?.id) {
    return event.data.id
  }
  
  return null
}

