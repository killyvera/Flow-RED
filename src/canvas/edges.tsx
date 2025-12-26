/**
 * Configuración de edges (conexiones) para React Flow
 * 
 * Define los tipos de edges y sus estilos para un look moderno estilo Flowise/n8n.
 */

import { memo, useState } from 'react'
import type { Edge, EdgeProps, MarkerType } from '@xyflow/react'
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import { useCanvasStore } from '@/state/canvasStore'

/**
 * Edge animado que muestra actividad durante la ejecución (estilo n8n)
 * 
 * Usa animaciones CSS y SVG para crear efectos visuales cuando el edge está activo.
 * Basado en la documentación oficial de React Flow:
 * https://reactflow.dev/examples/edges/animating-edges
 */
const AnimatedEdge = memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  ...rest
}: EdgeProps) {
  const activeEdges = useCanvasStore((state) => state.activeEdges)
  const animatedEdgeId = useCanvasStore((state) => state.animatedEdgeId)
  const explainMode = useCanvasStore((state) => state.explainMode)
  const perfMode = useCanvasStore((state) => state.perfMode)
  
  // Si el edge está oculto (hidden o opacity 0), no renderizar nada
  const isHidden = (rest as any).hidden || style.opacity === 0
  if (isHidden) {
    return null
  }
  
  // Separar estados: verde persistente vs punto animado
  const isGreen = activeEdges.has(id) && !perfMode // Verde persistente
  const isAnimated = animatedEdgeId === id && !perfMode // Punto animado (solo uno)

  const [isHovered, setIsHovered] = useState(false)
  
  // Duración de la animación del punto (500ms para ser visible)
  // El edge se limpia automáticamente cuando el siguiente edge se activa
  const animationDuration = 500

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Calcular posición del label (centro del edge)
  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  // Crear markerEnd dinámico que cambia a verde cuando está activo
  // Siempre usar tamaño grande (12x12) para consistencia
  const getMarkerType = (): MarkerType => {
    if (typeof markerEnd === 'string') return 'arrowclosed' as MarkerType
    if (markerEnd && typeof markerEnd === 'object' && 'type' in markerEnd) {
      return (markerEnd as any).type as MarkerType
    }
    return 'arrowclosed' as MarkerType
  }
  
  const activeMarkerEnd: any = {
    type: getMarkerType(),
    color: isGreen ? '#22c55e' : ((style.stroke as string) || 'var(--color-edge-default)'),
    width: 12,
    height: 12,
    id: `marker-${id}-${isGreen ? 'active' : 'default'}`,
  }

  return (
    <>
      {/* Edge base usando BaseEdge de React Flow */}
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: isGreen ? 4 : (style.strokeWidth as number) || 2,
            stroke: isGreen
              ? '#22c55e' // Verde cuando está activo - se queda verde, no vuelve al color original
              : (style.stroke as string) || 'var(--color-edge-default)', // Color por defecto del tema
            fill: 'none',
            transition: perfMode ? 'none' : 'stroke-width 0.2s ease-out, stroke 0.2s ease-out',
            filter: perfMode || !isGreen ? 'none' : 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.5))',
          }}
          markerEnd={activeMarkerEnd}
        />
      </g>
      
      {/* Punto animado solo si es el edge actualmente animado */}
      {isAnimated && (
        <circle r="6" fill="#22c55e" className="edge-moving-dot" opacity="0.9">
          <animateMotion
            dur={`${animationDuration}ms`}
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      )}
      
      {/* Label en Explain Mode (solo en hover) */}
      {explainMode && isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 bg-bg-secondary border border-node-border rounded text-[10px] text-text-secondary shadow-sm z-10"
          >
            passes msg
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

/**
 * Edge bidireccional para nodos LLM (como Azure OpenAI Model)
 * Muestra flechas en ambos extremos para indicar bidireccionalidad
 */
const BidirectionalEdge = memo(function BidirectionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const activeEdges = useCanvasStore((state) => state.activeEdges)
  const animatedEdgeId = useCanvasStore((state) => state.animatedEdgeId)
  const explainMode = useCanvasStore((state) => state.explainMode)
  const perfMode = useCanvasStore((state) => state.perfMode)
  const edges = useCanvasStore((state) => state.edges)
  const nodes = useCanvasStore((state) => state.nodes)
  const nodeRuntimeStates = useCanvasStore((state) => state.nodeRuntimeStates)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)
  
  // Obtener el edge completo para identificar nodos conectados
  const edge = edges.find(e => e.id === id)
  const sourceNode = edge ? nodes.find(n => n.id === edge.source) : null
  const targetNode = edge ? nodes.find(n => n.id === edge.target) : null
  
  // Verificar si conecta modelo o agent-core (para animación direccional)
  const sourceType = (sourceNode?.data as any)?.nodeRedType || (sourceNode?.data as any)?.nodeRedNode?.type
  const targetType = (targetNode?.data as any)?.nodeRedType || (targetNode?.data as any)?.nodeRedNode?.type
  const sourceNodeRedId = (sourceNode?.data as any)?.nodeRedNode?.id
  const targetNodeRedId = (targetNode?.data as any)?.nodeRedNode?.id
  const isModelEdge = sourceType === 'model.azure.openai' || targetType === 'model.azure.openai'
  const isAgentCoreEdge = sourceType === 'agent-core' || targetType === 'agent-core'
  const isModelOrAgentCoreEdge = (isModelEdge || isAgentCoreEdge)
  
  // Determinar dirección de la animación según el flujo real:
  // El edge visible va del modelo al agent-core (modelo output)
  // - Si el modelo está "running": recibió input → animación hacia el modelo (1;0) - invertida
  // - Si el modelo está "idle": envió output → animación desde el modelo (0;1) - normal
  let animationDirection = "0;1" // Default: dirección normal
  if (isModelOrAgentCoreEdge) {
    const modelNodeRedId = sourceType === 'model.azure.openai' ? sourceNodeRedId : 
                           targetType === 'model.azure.openai' ? targetNodeRedId : null
    if (modelNodeRedId) {
      const modelState = nodeRuntimeStates.get(modelNodeRedId)
      const modelSnapshots = nodeSnapshots.get(modelNodeRedId) || []
      const latestSnapshot = modelSnapshots[modelSnapshots.length - 1]
      
      // Si el modelo está "running", recibió input → animación hacia el modelo (invertida)
      // Si el modelo está "idle" o no hay estado, envió output → animación desde el modelo (normal)
      if (modelState === 'running' || (latestSnapshot && latestSnapshot.status === 'running')) {
        animationDirection = "1;0" // Hacia el modelo (invertida)
      } else {
        animationDirection = "0;1" // Desde el modelo (normal)
      }
    }
  }
  
  const isGreen = activeEdges.has(id) && !perfMode
  const isAnimated = animatedEdgeId === id && !perfMode
  
  const [isHovered, setIsHovered] = useState(false)
  
  // Duración de la animación del punto (500ms para ser visible)
  // El edge se limpia automáticamente cuando el siguiente edge se activa
  const animationDuration = 500

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  const getMarkerType = (): MarkerType => {
    if (typeof markerEnd === 'string') return 'arrowclosed' as MarkerType
    if (markerEnd && typeof markerEnd === 'object' && 'type' in markerEnd) {
      return (markerEnd as any).type as MarkerType
    }
    return 'arrowclosed' as MarkerType
  }
  
  // Siempre usar tamaño grande (12x12) para consistencia
  const activeMarkerEnd: any = {
    type: getMarkerType(),
    color: isGreen ? '#22c55e' : ((style.stroke as string) || 'var(--color-edge-default)'),
    width: 12,
    height: 12,
    id: `marker-${id}-${isGreen ? 'active' : 'default'}`,
  }

  // Crear marcador para el inicio (bidireccional) - mismo tamaño
  // Solo mostrar markerStart si el source es el modelo (para el edge visible Model → Agent Core)
  const markerStartId = `arrow-start-${id}`
  const isModelSource = sourceType === 'model.azure.openai'
  const shouldShowMarkerStart = isModelSource && isModelOrAgentCoreEdge

  return (
    <>
      {shouldShowMarkerStart && (
        <defs>
          <marker
            id={markerStartId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 0 0 L 10 6 L 0 12 z"
              fill={isGreen ? '#22c55e' : (style.stroke as string) || 'var(--color-edge-default)'}
            />
          </marker>
        </defs>
      )}
      
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: isGreen ? 4 : (style.strokeWidth as number) || 2,
            stroke: isGreen
              ? '#22c55e'
              : (style.stroke as string) || 'var(--color-edge-default)',
            fill: 'none',
            transition: perfMode ? 'none' : 'stroke-width 0.2s ease-out, stroke 0.2s ease-out',
            filter: perfMode || !isGreen ? 'none' : 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.5))',
            markerStart: shouldShowMarkerStart ? `url(#${markerStartId})` : undefined,
          }}
          markerEnd={activeMarkerEnd}
        />
      </g>
      
      {/* Punto animado solo si es el edge actualmente animado */}
      {isAnimated && (
        <circle r="6" fill="#22c55e" className="edge-moving-dot" opacity="0.9">
          <animateMotion
            dur={`${animationDuration}ms`}
            repeatCount="indefinite"
            path={edgePath}
            keyPoints={isModelOrAgentCoreEdge ? animationDirection : "0;1"}
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      )}
      
      {explainMode && isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 bg-bg-secondary border border-node-border rounded text-[10px] text-text-secondary shadow-sm z-10"
          >
            bidirectional flow
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

/**
 * Edge con líneas punteadas para conexiones desde agent-core hacia sus subnodos
 * (Model, Tool, Memory)
 */
const DashedEdge = memo(function DashedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  ...rest
}: EdgeProps) {
  const activeEdges = useCanvasStore((state) => state.activeEdges)
  const animatedEdgeId = useCanvasStore((state) => state.animatedEdgeId)
  const explainMode = useCanvasStore((state) => state.explainMode)
  const perfMode = useCanvasStore((state) => state.perfMode)
  // Si el edge está oculto (hidden o opacity 0), no renderizar nada
  const isHidden = (rest as any).hidden || style.opacity === 0
  if (isHidden) {
    return null
  }
  
  const isGreen = activeEdges.has(id) && !perfMode
  const isAnimated = animatedEdgeId === id && !perfMode
  
  const [isHovered, setIsHovered] = useState(false)
  
  const animationDuration = 500

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const labelX = (sourceX + targetX) / 2
  const labelY = (sourceY + targetY) / 2

  const getMarkerType = (): MarkerType => {
    if (typeof markerEnd === 'string') return 'arrowclosed' as MarkerType
    if (markerEnd && typeof markerEnd === 'object' && 'type' in markerEnd) {
      return (markerEnd as any).type as MarkerType
    }
    return 'arrowclosed' as MarkerType
  }
  
  const activeMarkerEnd: any = {
    type: getMarkerType(),
    color: isGreen ? '#22c55e' : ((style.stroke as string) || 'var(--color-edge-default)'),
    width: 12,
    height: 12,
    id: `marker-${id}-${isGreen ? 'active' : 'default'}`,
  }

  return (
    <>
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: isGreen ? 4 : (style.strokeWidth as number) || 2,
            stroke: isGreen
              ? '#22c55e'
              : (style.stroke as string) || 'var(--color-edge-default)',
            fill: 'none',
            // Líneas punteadas usando strokeDasharray
            strokeDasharray: '8, 4', // 8px de línea, 4px de espacio
            transition: perfMode ? 'none' : 'stroke-width 0.2s ease-out, stroke 0.2s ease-out',
            filter: perfMode || !isGreen ? 'none' : 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.5))',
          }}
          markerEnd={activeMarkerEnd}
        />
      </g>
      
      {/* Punto animado solo si es el edge actualmente animado */}
      {isAnimated && (
        <circle r="6" fill="#22c55e" className="edge-moving-dot" opacity="0.9">
          <animateMotion
            dur={`${animationDuration}ms`}
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
          />
        </circle>
      )}
      
      {/* Label en Explain Mode (solo en hover) */}
      {explainMode && isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 bg-bg-secondary border border-node-border rounded text-[10px] text-text-secondary shadow-sm z-10"
          >
            passes msg
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

/**
 * Edge type personalizado usando SmoothStep para curvas suaves
 */
export const modernEdgeTypes = {
  default: AnimatedEdge,
  smoothstep: AnimatedEdge,
  bezier: AnimatedEdge, // Usar AnimatedEdge en lugar de BezierEdge
  animated: AnimatedEdge,
  bidirectional: BidirectionalEdge, // Edge bidireccional para nodos LLM
  dashed: DashedEdge, // Edge con líneas punteadas para agent-core subnodos
}

/**
 * Aplica estilos modernos a los edges
 * 
 * @param edges Array de edges de React Flow
 * @returns Array de edges con estilos aplicados
 */
export function applyModernEdgeStyles(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    type: edge.type || 'smoothstep', // Usar smoothstep por defecto para curvas suaves
    style: {
      strokeWidth: 2,
      stroke: 'var(--color-edge-default)',
      ...edge.style,
    },
    markerEnd: edge.markerEnd || {
      type: 'arrowclosed' as MarkerType,
      color: 'var(--color-edge-default)',
    },
  }))
}

