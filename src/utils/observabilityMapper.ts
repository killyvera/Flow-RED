/**
 * Mappers para convertir eventos del plugin de observability
 * a la estructura actual del sistema
 */

import type { ObservabilityEvent, FrameStartEvent, NodeInputEvent, NodeOutputEvent, FrameEndEvent, NodeExecutionData } from '@/types/observability'
import type { NodeRedWebSocketEvent } from '@/api/websocket'
import type { ExecutionFrame, NodeExecutionSnapshot } from '@/types/executionFrames'
import type { NodeRuntimeState } from '@/state/canvasStore'
import { createPayloadPreview } from './executionFrameManager'

/**
 * Mapea un evento de observability a un evento de Node-RED estándar
 * para mantener compatibilidad con el sistema actual
 */
export function mapObservabilityToNodeRedEvent(
  event: ObservabilityEvent
): NodeRedWebSocketEvent | null {
  switch (event.event) {
    case 'connected':
      // El evento connected no tiene equivalente en Node-RED estándar
      return null
      
    case 'heartbeat':
      // El heartbeat no tiene equivalente directo
      return null
      
    case 'frame:start':
      // frame:start no tiene equivalente directo, pero podemos crear un evento simulado
      const frameStart = event as FrameStartEvent
      return {
        topic: 'frame:start',
        data: frameStart.data,
      }
      
    case 'node:input':
      // node:input se puede mapear a un evento de status
      const nodeInput = event as NodeInputEvent
      return {
        topic: `status/${nodeInput.nodeId}`,
        data: {
          fill: 'blue', // Procesando
          shape: 'dot',
        },
        payload: {
          id: nodeInput.nodeId,
          status: {
            fill: 'blue',
            shape: 'dot',
          },
        },
      }
      
    case 'node:output':
      // node:output se puede mapear a un evento de debug o status
      const nodeOutput = event as NodeOutputEvent
      return {
        topic: 'debug',
        data: {
          id: nodeOutput.nodeId,
          node: nodeOutput.nodeId,
          nodeid: nodeOutput.nodeId,
          msg: nodeOutput.data.outputs[0]?.payload?.preview || {},
        },
      }
      
    case 'frame:end':
      // frame:end no tiene equivalente directo
      return null
      
    default:
      return null
  }
}

/**
 * Mapea un evento frame:start a un ExecutionFrame
 */
export function mapFrameStartToExecutionFrame(event: FrameStartEvent): Partial<ExecutionFrame> {
  return {
    id: event.frameId,
    startedAt: event.data.startedAt,
    triggerNodeId: event.data.triggerNodeId,
    label: event.data.triggerNodeId 
      ? `Triggered by ${event.data.triggerNodeId}` 
      : 'Manual execution',
  }
}

/**
 * Mapea un evento node:input a un NodeExecutionSnapshot
 */
export function mapNodeInputToSnapshot(
  event: NodeInputEvent
): NodeExecutionSnapshot {
  const payloadPreview = event.data.input?.payload?.preview
    ? createPayloadPreview(event.data.input.payload.preview)
    : undefined

  return {
    nodeId: event.nodeId,
    frameId: event.frameId,
    status: 'running', // El nodo está procesando
    ts: event.data.input.timestamp,
    summary: 'Input received',
    payloadPreview,
  }
}

/**
 * Mapea un evento node:output a un NodeExecutionSnapshot
 */
export function mapNodeOutputToSnapshot(
  event: NodeOutputEvent
): NodeExecutionSnapshot {
  const output = event.data.outputs[0]
  const payloadPreview = output?.payload?.preview
    ? createPayloadPreview(output.payload.preview)
    : undefined

  // Determinar el estado basado en semantics
  let status: NodeRuntimeState = 'idle'
  if (event.data.semantics) {
    if (event.data.semantics.behavior === 'filtered') {
      status = 'warning'
    } else if (event.data.semantics.behavior === 'terminated') {
      status = 'error'
    } else {
      status = 'idle' // Completado exitosamente
    }
  }

  const summary = event.data.semantics
    ? `${event.data.semantics.role} - ${event.data.semantics.behavior}`
    : 'Output sent'

  return {
    nodeId: event.nodeId,
    frameId: event.frameId,
    status,
    ts: output?.timestamp || event.ts,
    summary,
    payloadPreview,
  }
}

/**
 * Mapea un evento frame:end a estadísticas del frame
 */
export function mapFrameEndToStats(event: FrameEndEvent) {
  return {
    endedAt: event.data.endedAt,
    stats: event.data.stats,
  }
}

/**
 * Crea un NodeExecutionData desde eventos de observability
 */
export function createNodeExecutionData(
  nodeId: string,
  nodeType: string,
  inputEvent?: NodeInputEvent,
  outputEvent?: NodeOutputEvent
): NodeExecutionData {
  const data: NodeExecutionData = {
    nodeId,
    nodeType,
    outputs: outputEvent?.data.outputs || [],
  }

  if (inputEvent) {
    data.input = inputEvent.data.input
  }

  if (outputEvent) {
    data.semantics = outputEvent.data.semantics
    data.timing = outputEvent.data.timing
    data.sampled = outputEvent.data.sampled
  }

  return data
}

/**
 * Determina el estado de runtime basado en semantics
 */
export function mapSemanticsToRuntimeState(
  semantics?: { role: string; behavior: string }
): NodeRuntimeState | null {
  if (!semantics) return null

  switch (semantics.behavior) {
    case 'filtered':
      return 'warning'
    case 'terminated':
      return 'error'
    case 'pass-through':
    case 'transformed':
    case 'bifurcated':
      return 'idle' // Completado exitosamente
    default:
      return null
  }
}

