/**
 * Mapeo de estados de runtime de Node-RED a estados visuales
 * 
 * Convierte los eventos de status de Node-RED (status.fill) a estados
 * visuales que se pueden mostrar en la UI.
 */

import type { NodeRedStatusEvent } from '@/api/websocket'
import type { NodeRuntimeState } from '@/state/canvasStore'

/**
 * Mapea un evento de status de Node-RED a un estado de runtime visual
 * 
 * @param event Evento de status de Node-RED
 * @returns Estado de runtime visual o null si no hay status
 */
export function mapNodeRedStatusToRuntimeState(
  event: NodeRedStatusEvent
): NodeRuntimeState | null {
  if (!event.status || !event.status.fill) {
    return 'idle'
  }

  const fill = event.status.fill.toLowerCase()

  // Mapear colores de Node-RED a estados visuales
  switch (fill) {
    case 'red':
      return 'error'
    case 'green':
      return 'running'
    case 'yellow':
      return 'warning'
    case 'blue':
    case 'grey':
    case 'gray':
      return 'idle'
    default:
      return 'idle'
  }
}

/**
 * Obtiene el texto del status si está disponible
 * 
 * @param event Evento de status de Node-RED
 * @returns Texto del status o undefined
 */
export function getStatusText(event: NodeRedStatusEvent): string | undefined {
  return event.status?.text
}

/**
 * Obtiene el color CSS para un estado de runtime
 * 
 * @param state Estado de runtime
 * @returns Color CSS o undefined para idle
 */
export function getRuntimeStateColor(state: NodeRuntimeState | null): string | undefined {
  if (!state || state === 'idle') {
    return undefined
  }

  switch (state) {
    case 'running':
      return 'var(--node-status-success)'
    case 'error':
      return 'var(--node-status-error)'
    case 'warning':
      return 'var(--node-status-warning)'
    default:
      return undefined
  }
}

