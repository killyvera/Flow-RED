/**
 * Hooks para obtener datos del Node Inspector
 * 
 * Proporcionan datos estructurados para Input, Output, Context y Execution Timeline
 */

import { useMemo } from 'react'
import { useCanvasStore } from '@/state/canvasStore'
import { isTriggerNode } from '@/utils/executionFrameManager'

/**
 * Hook para obtener datos de INPUT de un nodo
 * 
 * - Si es trigger/webhook → usa datos reales del snapshot
 * - Si no → infiere desde el nodo upstream en el mismo frame
 */
export function useNodeInputData(nodeId: string | null, frameId: string | null) {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)

  return useMemo(() => {
    if (!nodeId) return null

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return null

    const nodeType = node.data?.nodeRedType || 'unknown'

    // 1. Si es trigger/webhook → buscar datos reales del snapshot
    if (isTriggerNode(nodeType)) {
      const snapshots = nodeSnapshots.get(nodeId) || []
      // Si hay frameId, buscar en ese frame específico, sino usar el más reciente
      const frameSnapshot = frameId
        ? snapshots.find((s) => s.frameId === frameId)
        : snapshots[snapshots.length - 1]
      
      if (frameSnapshot?.payloadPreview) {
        try {
          const data = JSON.parse(frameSnapshot.payloadPreview)
          return {
            data,
            isInferred: false,
            source: null,
            timestamp: frameSnapshot.ts,
          }
        } catch {
          return {
            data: frameSnapshot.payloadPreview,
            isInferred: false,
            source: null,
            timestamp: frameSnapshot.ts,
          }
        }

      }
      return null
    }

    // 2. Inferir desde upstream en el mismo frame
    // Si no hay frameId, intentar usar el frame más reciente o el último snapshot
    const snapshots = nodeSnapshots.get(nodeId) || []
    const effectiveFrameId = frameId || (snapshots.length > 0 ? snapshots[snapshots.length - 1]?.frameId : null)
    if (!effectiveFrameId) return null

    const inputEdges = edges.filter((e) => e.target === nodeId)
    if (inputEdges.length === 0) return null

    // Tomar el primer nodo upstream (puede mejorarse para múltiples inputs)
    const upstreamEdge = inputEdges[0]
    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source)
    
    if (!upstreamNode) return null

    const upstreamSnapshots = nodeSnapshots.get(upstreamNode.id) || []
    const upstreamSnapshot = upstreamSnapshots.find((s) => s.frameId === effectiveFrameId)

    if (upstreamSnapshot?.payloadPreview) {
      try {
        const data = JSON.parse(upstreamSnapshot.payloadPreview)
        return {
          data,
          isInferred: true,
          source: upstreamNode.data?.label || upstreamNode.data?.nodeRedType || upstreamNode.id,
          timestamp: upstreamSnapshot.ts,
        }
      } catch {
        return {
          data: upstreamSnapshot.payloadPreview,
          isInferred: true,
          source: upstreamNode.data?.label || upstreamNode.data?.nodeRedType || upstreamNode.id,
          timestamp: upstreamSnapshot.ts,
        }
      }
    }

    return null
  }, [nodeId, frameId, nodes, edges, nodeSnapshots])
}

/**
 * Hook para obtener datos de OUTPUT de un nodo
 * 
 * Retorna el último snapshot con payloadPreview
 */
export function useNodeOutputData(nodeId: string | null) {
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)

  return useMemo(() => {
    if (!nodeId) return null

    const snapshots = nodeSnapshots.get(nodeId) || []
    if (snapshots.length === 0) return null

    // Obtener el snapshot más reciente con payloadPreview
    const latestSnapshot = [...snapshots]
      .filter((s) => s.payloadPreview)
      .sort((a, b) => b.ts - a.ts)[0]

    if (!latestSnapshot?.payloadPreview) return null

    try {
      const data = JSON.parse(latestSnapshot.payloadPreview)
      return {
        data,
        isTruncated: true, // payloadPreview siempre está truncado
        timestamp: latestSnapshot.ts,
        frameId: latestSnapshot.frameId,
      }
    } catch {
      return {
        data: latestSnapshot.payloadPreview,
        isTruncated: true,
        timestamp: latestSnapshot.ts,
        frameId: latestSnapshot.frameId,
      }
    }
  }, [nodeId, nodeSnapshots])
}

/**
 * Hook para obtener datos de CONTEXT de un nodo
 * 
 * Retorna metadata del frame y del nodo
 */
export function useNodeContext(nodeId: string | null, frameId: string | null) {
  const nodes = useCanvasStore((state) => state.nodes)
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const frames = useCanvasStore((state) => state.frames)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)
  const nodeRuntimeStates = useCanvasStore((state) => state.nodeRuntimeStates)

  return useMemo(() => {
    if (!nodeId) return null

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return null

    const frame = frameId
      ? frames.find((f) => f.id === frameId) || currentFrame
      : currentFrame

    const snapshots = nodeSnapshots.get(nodeId) || []
    const frameSnapshot = frameId
      ? snapshots.find((s) => s.frameId === frameId)
      : snapshots[snapshots.length - 1]

    const runtimeState = nodeRuntimeStates.get(nodeId)

    // Calcular duración si hay snapshot
    let duration: number | null = null
    if (frameSnapshot && frame) {
      duration = frameSnapshot.ts - frame.startedAt
    }

    // Extraer metadata conocida del snapshot
    const summary = frameSnapshot?.summary || ''
    const topic = extractTopic(summary)
    const headers = extractHeaders(summary)
    const statusCode = extractStatusCode(summary)

    return {
      frameId: frame?.id || null,
      executionStatus: runtimeState || 'idle',
      duration,
      nodeType: node.data?.nodeRedType || 'unknown',
      nodeName: node.data?.label || node.id,
      topic,
      headers,
      statusCode,
      timestamp: frameSnapshot?.ts || null,
    }
  }, [nodeId, frameId, nodes, currentFrame, frames, nodeSnapshots, nodeRuntimeStates])
}

/**
 * Hook para obtener timeline de ejecución
 * 
 * Retorna nodos upstream, current, y downstream
 */
export function useExecutionTimeline(nodeId: string | null) {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)

  return useMemo(() => {
    if (!nodeId) return null

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return null

    // Obtener nodos upstream (source de edges que apuntan a este nodo)
    const inputEdges = edges.filter((e) => e.target === nodeId)
    const upstreamNodes = inputEdges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      return {
        id: edge.source,
        name: sourceNode?.data?.label || sourceNode?.data?.nodeRedType || edge.source,
      }
    })

    // Obtener nodos downstream (target de edges que salen de este nodo)
    const outputEdges = edges.filter((e) => e.source === nodeId)
    const downstreamNodes = outputEdges.map((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target)
      return {
        id: edge.target,
        name: targetNode?.data?.label || targetNode?.data?.nodeRedType || edge.target,
      }
    })

    return {
      previous: upstreamNodes,
      current: {
        id: nodeId,
        name: node.data?.label || node.data?.nodeRedType || nodeId,
        highlighted: true,
      },
      next: downstreamNodes,
    }
  }, [nodeId, nodes, edges])
}

/**
 * Helpers para extraer metadata del summary
 */
function extractTopic(summary: string): string | null {
  const match = summary.match(/topic[:\s]+([^\s,]+)/i)
  return match ? match[1] : null
}

function extractHeaders(summary: string): Record<string, string> | null {
  const match = summary.match(/headers[:\s]+({[^}]+})/i)
  if (!match) return null
  
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function extractStatusCode(summary: string): number | null {
  const match = summary.match(/status[:\s]+(\d{3})/i)
  return match ? parseInt(match[1], 10) : null
}


