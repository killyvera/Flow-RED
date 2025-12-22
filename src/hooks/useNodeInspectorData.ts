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
 * Estrategia:
 * 1. Buscar snapshots de input del nodo actual (especialmente de eventos node:input)
 * 2. Si es trigger/webhook → usar datos del snapshot del trigger
 * 3. Si no encuentra → inferir desde el nodo upstream en el mismo frame
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
    const snapshots = nodeSnapshots.get(nodeId) || []

    // Debug: Log para diagnóstico
    console.log(`[useNodeInputData] Nodo ${nodeId}:`, {
      totalSnapshots: snapshots.length,
      frameIdBuscado: frameId,
      snapshots: snapshots.map(s => ({
        frameId: s.frameId,
        status: s.status,
        summary: s.summary,
        hasPayloadPreview: !!s.payloadPreview,
        payloadPreviewLength: s.payloadPreview?.length || 0,
      })),
    })

    // 1. Buscar snapshots de input del nodo actual
    // Los eventos node:input tienen status: 'running' y summary que indica input
    // Buscar snapshots que parezcan ser de input (status: 'running' o summary contiene "Input")
    const inputSnapshots = snapshots.filter(s => {
      const isRunning = s.status === 'running'
      const hasInputSummary = s.summary && (s.summary.toLowerCase().includes('input') || s.summary.toLowerCase().includes('received'))
      return isRunning || hasInputSummary
    })

    console.log(`[useNodeInputData] Snapshots de input filtrados para ${nodeId}:`, {
      totalInputSnapshots: inputSnapshots.length,
      inputSnapshots: inputSnapshots.map(s => ({
        frameId: s.frameId,
        status: s.status,
        summary: s.summary,
        hasPayloadPreview: !!s.payloadPreview,
      })),
    })

    // Si hay frameId, buscar en ese frame específico, sino usar el más reciente
    let frameInputSnapshot = frameId
      ? inputSnapshots.find((s) => s.frameId === frameId)
      : inputSnapshots[inputSnapshots.length - 1]

    // Si no encontramos con frameId específico, intentar con cualquier snapshot de input reciente
    if (!frameInputSnapshot && inputSnapshots.length > 0) {
      console.log(`[useNodeInputData] No se encontró snapshot con frameId ${frameId}, usando el más reciente`)
      frameInputSnapshot = inputSnapshots[inputSnapshots.length - 1]
    }

    // Debug: Log del snapshot encontrado
    if (frameInputSnapshot) {
      console.log(`[useNodeInputData] ✅ Snapshot de input encontrado para ${nodeId}:`, {
        frameId: frameInputSnapshot.frameId,
        status: frameInputSnapshot.status,
        summary: frameInputSnapshot.summary,
        hasPayloadPreview: !!frameInputSnapshot.payloadPreview,
        payloadPreviewPreview: frameInputSnapshot.payloadPreview?.substring(0, 100),
      })
    } else {
      console.log(`[useNodeInputData] ❌ No se encontró snapshot de input para ${nodeId}`)
    }

    // Si encontramos un snapshot de input con payloadPreview, usarlo
    if (frameInputSnapshot?.payloadPreview) {
      try {
        const data = JSON.parse(frameInputSnapshot.payloadPreview)
        console.log(`[useNodeInputData] Retornando datos de input para ${nodeId}:`, { data, isInferred: false })
        return {
          data,
          isInferred: false,
          source: null,
          timestamp: frameInputSnapshot.ts,
        }
      } catch {
        console.log(`[useNodeInputData] Retornando payloadPreview como string para ${nodeId}`)
        return {
          data: frameInputSnapshot.payloadPreview,
          isInferred: false,
          source: null,
          timestamp: frameInputSnapshot.ts,
        }
      }
    }
    
    // Si encontramos un snapshot de input pero NO tiene payloadPreview,
    // continuar con la inferencia desde upstream (el plugin no envió el payload)
    // No retornar null aquí, dejar que continúe con la lógica de inferencia

    // 2. Si es trigger/webhook → buscar cualquier snapshot con payloadPreview
    if (isTriggerNode(nodeType)) {
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

    // 3. Inferir desde upstream en el mismo frame
    // Si no hay frameId, intentar usar el frame más reciente o el último snapshot
    const effectiveFrameId = frameId || (snapshots.length > 0 ? snapshots[snapshots.length - 1]?.frameId : null)
    if (!effectiveFrameId) {
      console.log(`[useNodeInputData] ❌ No hay effectiveFrameId para ${nodeId}`)
      return null
    }

    const inputEdges = edges.filter((e) => e.target === nodeId)
    if (inputEdges.length === 0) {
      console.log(`[useNodeInputData] ❌ No hay inputEdges para ${nodeId}`)
      return null
    }

    // Tomar el primer nodo upstream (puede mejorarse para múltiples inputs)
    const upstreamEdge = inputEdges[0]
    const upstreamNode = nodes.find((n) => n.id === upstreamEdge.source)
    
    if (!upstreamNode) {
      console.log(`[useNodeInputData] ❌ No se encontró upstreamNode para ${nodeId}, upstreamEdge.source: ${upstreamEdge.source}`)
      return null
    }

    const upstreamSnapshots = nodeSnapshots.get(upstreamNode.id) || []
    const upstreamSnapshot = upstreamSnapshots.find((s) => s.frameId === effectiveFrameId)

    console.log(`[useNodeInputData] 🔍 Intentando inferir desde upstream para ${nodeId}:`, {
      upstreamNodeId: upstreamNode.id,
      upstreamNodeType: upstreamNode.data?.nodeRedType,
      effectiveFrameId,
      upstreamSnapshotsCount: upstreamSnapshots.length,
      hasUpstreamSnapshot: !!upstreamSnapshot,
      upstreamSnapshotHasPreview: !!upstreamSnapshot?.payloadPreview,
    })

    if (upstreamSnapshot?.payloadPreview) {
      try {
        const data = JSON.parse(upstreamSnapshot.payloadPreview)
        console.log(`[useNodeInputData] ✅ Retornando datos inferidos desde upstream para ${nodeId}`)
        return {
          data,
          isInferred: true,
          source: upstreamNode.data?.label || upstreamNode.data?.nodeRedType || upstreamNode.id,
          timestamp: upstreamSnapshot.ts,
        }
      } catch {
        console.log(`[useNodeInputData] ✅ Retornando payloadPreview como string inferido desde upstream para ${nodeId}`)
        return {
          data: upstreamSnapshot.payloadPreview,
          isInferred: true,
          source: upstreamNode.data?.label || upstreamNode.data?.nodeRedType || upstreamNode.id,
          timestamp: upstreamSnapshot.ts,
        }
      }
    }

    console.log(`[useNodeInputData] ❌ No se pudo inferir desde upstream para ${nodeId}, upstreamSnapshot no tiene payloadPreview`)
    return null
  }, [nodeId, frameId, nodes, edges, nodeSnapshots])
}

/**
 * Hook para obtener datos de OUTPUT de un nodo
 * 
 * Estrategia:
 * 1. Buscar snapshots de output del nodo actual (eventos node:output)
 * 2. Si no hay, inferir desde el nodo downstream en el mismo frame
 *    (el input del downstream es el output del nodo actual)
 */
export function useNodeOutputData(nodeId: string | null) {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const nodeRedNodes = useCanvasStore((state) => state.nodeRedNodes)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)

  return useMemo(() => {
    // #region agent log
    // H1: Registrar entrada al hook
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:entry',message:'Hook useNodeOutputData ejecutado',data:{nodeId,hasNodeId:!!nodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (!nodeId) return null

    const snapshots = nodeSnapshots.get(nodeId) || []
    
    // #region agent log
    // H1: Verificar snapshots disponibles
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:snapshots',message:'Snapshots disponibles',data:{nodeId,snapshotsCount:snapshots.length,snapshots:snapshots.map(s=>({frameId:s.frameId,status:s.status,summary:s.summary,hasPayloadPreview:!!s.payloadPreview}))},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (snapshots.length === 0) return null

    // #region agent log
    // H1: Verificar qué snapshots están disponibles y cuáles son de output
    const allSnapshotsWithPreview = snapshots.filter(s => s.payloadPreview)
    const outputSnapshots = snapshots.filter(s => {
      // Los snapshots de output tienen status: 'idle' (o 'warning', 'error') y summary que indica output
      const isIdle = s.status === 'idle' || s.status === 'warning' || s.status === 'error'
      const hasOutputSummary = s.summary && (
        s.summary.toLowerCase().includes('output') || 
        s.summary.toLowerCase().includes('sent') ||
        s.summary.toLowerCase().includes('transform') ||
        s.summary.toLowerCase().includes('generator')
      )
      // También considerar snapshots que NO son de input (status !== 'running' y summary no contiene "input" o "received")
      const isNotInput = s.status !== 'running' && 
        !(s.summary && (s.summary.toLowerCase().includes('input') || s.summary.toLowerCase().includes('received')))
      return (isIdle && hasOutputSummary) || (isNotInput && !hasOutputSummary && s.payloadPreview)
    })
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:init',message:'Búsqueda de snapshots de output',data:{nodeId,totalSnapshots:snapshots.length,allSnapshotsWithPreview:allSnapshotsWithPreview.map(s=>({frameId:s.frameId,status:s.status,summary:s.summary,ts:s.ts})),outputSnapshots:outputSnapshots.map(s=>({frameId:s.frameId,status:s.status,summary:s.summary,ts:s.ts}))},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // 1. Buscar snapshots de OUTPUT del nodo actual
    // Los eventos node:output tienen status: 'idle' (o 'warning', 'error') y summary que indica output
    const outputSnapshotsFiltered = snapshots.filter(s => {
      const isIdle = s.status === 'idle' || s.status === 'warning' || s.status === 'error'
      const hasOutputSummary = s.summary && (
        s.summary.toLowerCase().includes('output') || 
        s.summary.toLowerCase().includes('sent') ||
        s.summary.toLowerCase().includes('transform') ||
        s.summary.toLowerCase().includes('generator')
      )
      const isNotInput = s.status !== 'running' && 
        !(s.summary && (s.summary.toLowerCase().includes('input') || s.summary.toLowerCase().includes('received')))
      return s.payloadPreview && ((isIdle && hasOutputSummary) || (isNotInput && !hasOutputSummary))
    })

    // Obtener el snapshot de output más reciente
    const latestOutputSnapshot = outputSnapshotsFiltered.length > 0
      ? [...outputSnapshotsFiltered].sort((a, b) => b.ts - a.ts)[0]
      : null

    // Si encontramos un snapshot de output directo, usarlo
    if (latestOutputSnapshot?.payloadPreview) {
      try {
        const data = JSON.parse(latestOutputSnapshot.payloadPreview)
        return {
          data,
          isTruncated: true,
          timestamp: latestOutputSnapshot.ts,
          frameId: latestOutputSnapshot.frameId,
        }
      } catch {
        return {
          data: latestOutputSnapshot.payloadPreview,
          isTruncated: true,
          timestamp: latestOutputSnapshot.ts,
          frameId: latestOutputSnapshot.frameId,
        }
      }
    }

    // #region agent log
    // H1: Confirmar que se está intentando inferir (no se encontró snapshot de output directo)
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:noDirectOutput',message:'No se encontró snapshot de output directo, intentando inferir',data:{nodeId,hasLatestOutputSnapshot:!!latestOutputSnapshot,latestOutputSnapshotHasPreview:!!latestOutputSnapshot?.payloadPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // 2. Si no hay snapshots de output, inferir desde el nodo downstream en el mismo frame
    // El input del downstream es el output del nodo actual
    const effectiveFrameId = snapshots.length > 0 ? snapshots[snapshots.length - 1]?.frameId : null
    
    // #region agent log
    // H1: Verificar si se puede inferir desde downstream
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:beforeInfer',message:'Antes de inferir desde downstream',data:{nodeId,effectiveFrameId,hasEffectiveFrameId:!!effectiveFrameId,snapshotsCount:snapshots.length},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (!effectiveFrameId) return null

    // Buscar el primer nodo downstream usando edges de React Flow
    let outputEdges = edges.filter((e) => e.source === nodeId)
    
    // #region agent log
    // H1: Verificar edges de salida y todos los edges disponibles
    const allEdgesWithSource = edges.filter(e => e.source === nodeId || e.target === nodeId)
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:edges',message:'Edges de salida encontrados',data:{nodeId,outputEdgesCount:outputEdges.length,outputEdges:outputEdges.map(e=>({id:e.id,source:e.source,target:e.target})),allEdgesCount:edges.length,allEdgesWithNode:allEdgesWithSource.map(e=>({id:e.id,source:e.source,target:e.target,isSource:e.source===nodeId,isTarget:e.target===nodeId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    // Si no hay edges de React Flow, intentar usar wires de Node-RED
    let downstreamNodeId: string | null = null
    if (outputEdges.length === 0) {
      console.log(`[useNodeOutputData] No hay edges de React Flow para ${nodeId}, intentando usar wires de Node-RED`)
      
      // Buscar el nodo en nodeRedNodes para obtener sus wires
      const nodeRedNode = nodeRedNodes.find(n => n.id === nodeId)
      
      console.log(`[useNodeOutputData] nodeRedNode encontrado:`, {
        nodeId,
        hasNodeRedNode: !!nodeRedNode,
        nodeRedNodeType: nodeRedNode?.type,
        hasWires: !!nodeRedNode?.wires,
        wires: nodeRedNode?.wires,
        wiresIsArray: Array.isArray(nodeRedNode?.wires),
        wiresLength: nodeRedNode?.wires?.length
      })
      
      if (nodeRedNode?.wires && Array.isArray(nodeRedNode.wires) && nodeRedNode.wires.length > 0) {
        // wires es un array de arrays: [[target1, target2], [target3]]
        // Tomar el primer target del primer puerto de salida
        const firstPortWires = nodeRedNode.wires[0]
        
        console.log(`[useNodeOutputData] firstPortWires:`, {
          nodeId,
          firstPortWires,
          isArray: Array.isArray(firstPortWires),
          length: Array.isArray(firstPortWires) ? firstPortWires.length : 0
        })
        
        if (Array.isArray(firstPortWires) && firstPortWires.length > 0) {
          downstreamNodeId = firstPortWires[0]
          console.log(`[useNodeOutputData] ✅ Downstream encontrado desde wires:`, {
            nodeId,
            downstreamNodeId,
            allWiresInPort: firstPortWires
          })
          
          // #region agent log
          // H1: Encontrar downstream desde wires de Node-RED
          fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:wires',message:'Encontrando downstream desde wires de Node-RED',data:{nodeId,hasWires:!!nodeRedNode.wires,wiresLength:nodeRedNode.wires.length,firstPortWires:firstPortWires,downstreamNodeId},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
        } else {
          console.log(`[useNodeOutputData] ❌ firstPortWires está vacío o no es array para ${nodeId}`)
        }
      } else {
        console.log(`[useNodeOutputData] ❌ No hay wires disponibles en nodeRedNode para ${nodeId}`)
      }
    } else {
      // Usar el edge de React Flow
      const downstreamEdge = outputEdges[0]
      downstreamNodeId = downstreamEdge.target
      console.log(`[useNodeOutputData] Usando edge de React Flow:`, {
        nodeId,
        downstreamNodeId,
        edgeId: downstreamEdge.id
      })
    }
    
    if (!downstreamNodeId) return null

    // Buscar el nodo downstream en nodes o nodeRedNodes
    let downstreamNode = nodes.find((n) => n.id === downstreamNodeId)
    if (!downstreamNode) {
      // Si no está en nodes, buscar en nodeRedNodes y crear un nodo temporal
      const nodeRedNode = nodeRedNodes.find(n => n.id === downstreamNodeId)
      if (nodeRedNode) {
        // Crear un nodo temporal para la inferencia
        downstreamNode = {
          id: nodeRedNode.id,
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            label: nodeRedNode.name || nodeRedNode.type || downstreamNodeId,
            nodeRedType: nodeRedNode.type,
            nodeRedNode,
          },
        }
      }
    }
    
    // #region agent log
    // H1: Verificar nodo downstream
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:downstream',message:'Nodo downstream encontrado',data:{nodeId,downstreamNodeId,hasDownstreamNode:!!downstreamNode,downstreamNodeType:downstreamNode?.data?.nodeRedType,foundInNodes:!!nodes.find(n=>n.id===downstreamNodeId),foundInNodeRedNodes:!!nodeRedNodes.find(n=>n.id===downstreamNodeId)},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (!downstreamNode) return null

    // Buscar el snapshot de input del nodo downstream en el mismo frame
    const downstreamSnapshots = nodeSnapshots.get(downstreamNode.id) || []
    const downstreamInputSnapshot = downstreamSnapshots.find((s) => 
      s.frameId === effectiveFrameId && 
      (s.status === 'running' || (s.summary && (s.summary.toLowerCase().includes('input') || s.summary.toLowerCase().includes('received'))))
    )

    // #region agent log
    // H1: Registrar si se está infiriendo desde downstream
    fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useNodeInspectorData.ts:useNodeOutputData:infer',message:'Inferencia de output desde downstream',data:{nodeId,effectiveFrameId,downstreamNodeId:downstreamNode.id,downstreamNodeType:downstreamNode.data?.nodeRedType,hasDownstreamInputSnapshot:!!downstreamInputSnapshot,downstreamInputSnapshotFrameId:downstreamInputSnapshot?.frameId,downstreamInputSnapshotStatus:downstreamInputSnapshot?.status,downstreamInputSnapshotSummary:downstreamInputSnapshot?.summary},timestamp:Date.now(),sessionId:'debug-session',runId:'output-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (downstreamInputSnapshot?.payloadPreview) {
      console.log(`[useNodeOutputData] ✅ Inferencia exitosa desde downstream:`, {
        nodeId,
        downstreamNodeId: downstreamNode.id,
        hasPayloadPreview: true
      })
      try {
        const data = JSON.parse(downstreamInputSnapshot.payloadPreview)
        return {
          data,
          isTruncated: true,
          timestamp: downstreamInputSnapshot.ts,
          frameId: downstreamInputSnapshot.frameId,
        }
      } catch {
        return {
          data: downstreamInputSnapshot.payloadPreview,
          isTruncated: true,
          timestamp: downstreamInputSnapshot.ts,
          frameId: downstreamInputSnapshot.frameId,
        }
      }
    }
    
    // Si el snapshot de input del downstream no tiene payloadPreview,
    // intentar usar el snapshot de input del nodo actual como último recurso
    // Esto funciona para nodos pass-through (que no transforman el mensaje)
    console.log(`[useNodeOutputData] Downstream no tiene payloadPreview, intentando usar input del nodo actual`)
    
    const currentNodeSnapshots = snapshots
    const currentNodeInputSnapshot = currentNodeSnapshots.find((s) => 
      s.frameId === effectiveFrameId && 
      (s.status === 'running' || (s.summary && (s.summary.toLowerCase().includes('input') || s.summary.toLowerCase().includes('received')))) &&
      s.payloadPreview
    )
    
    if (currentNodeInputSnapshot?.payloadPreview) {
      console.log(`[useNodeOutputData] ✅ Usando input del nodo actual como output (pass-through):`, {
        nodeId,
        hasPayloadPreview: true
      })
      try {
        const data = JSON.parse(currentNodeInputSnapshot.payloadPreview)
        return {
          data,
          isTruncated: true,
          timestamp: currentNodeInputSnapshot.ts,
          frameId: currentNodeInputSnapshot.frameId,
        }
      } catch {
        return {
          data: currentNodeInputSnapshot.payloadPreview,
          isTruncated: true,
          timestamp: currentNodeInputSnapshot.ts,
          frameId: currentNodeInputSnapshot.frameId,
        }
      }
    }
    
    console.log(`[useNodeOutputData] ❌ No se pudo inferir output para ${nodeId}`)
    return null
  }, [nodeId, nodes, edges, nodeRedNodes, nodeSnapshots])
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


