/**
 * Configuración de edges (conexiones) para React Flow
 * 
 * Define los tipos de edges y sus estilos para un look moderno estilo Flowise/n8n.
 */

import React, { memo, useState } from 'react'
import type { Edge, EdgeProps, MarkerType } from 'reactflow'
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from 'reactflow'
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
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false)
  
  // Detectar si el flujo es muy rápido (menos de 1ms) y solo mostrar animación si no lo es
  // El efecto debe depender de isAnimated, no de isGreen
  React.useEffect(() => {
    if (isAnimated) {
      // Si el edge es el animado, esperar un pequeño delay para ver si el flujo es rápido
      // Si después de 1ms el edge sigue siendo el animado, mostrar la animación
      const timeoutId = setTimeout(() => {
        // Verificar que el edge siga siendo el animado después del delay
        const stillAnimated = useCanvasStore.getState().animatedEdgeId === id
        if (stillAnimated) {
          setShouldShowAnimation(true)
        }
      }, 1) // 1ms de delay para detectar flujos rápidos
      
      return () => {
        clearTimeout(timeoutId)
        setShouldShowAnimation(false)
      }
    } else {
      setShouldShowAnimation(false)
    }
  }, [isAnimated, id])

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
  const getMarkerType = (): MarkerType => {
    if (typeof markerEnd === 'string') return 'arrowclosed' as MarkerType
    if (markerEnd && typeof markerEnd === 'object' && 'type' in markerEnd) {
      return (markerEnd as any).type as MarkerType
    }
    return 'arrowclosed' as MarkerType
  }
  
  const activeMarkerEnd: any = isGreen
    ? {
        type: getMarkerType(),
        color: '#22c55e', // Verde cuando está activo
        width: 20,
        height: 20,
        id: `marker-${id}-active`, // ID único para forzar actualización
      }
    : markerEnd

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
      
      {/* Punto animado solo si es el edge actualmente animado y el flujo no es muy rápido (más de 1ms) */}
      {isAnimated && shouldShowAnimation && (
        <circle r="8" fill="#22c55e" className="edge-moving-dot" opacity="1">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="6;8;6"
            dur="1.5s"
            repeatCount="indefinite"
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
  
  const isGreen = activeEdges.has(id) && !perfMode
  const isAnimated = animatedEdgeId === id && !perfMode
  
  const [isHovered, setIsHovered] = useState(false)
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false)
  
  React.useEffect(() => {
    if (isAnimated) {
      const timeoutId = setTimeout(() => {
        const stillAnimated = useCanvasStore.getState().animatedEdgeId === id
        if (stillAnimated) {
          setShouldShowAnimation(true)
        }
      }, 1)
      
      return () => {
        clearTimeout(timeoutId)
        setShouldShowAnimation(false)
      }
    } else {
      setShouldShowAnimation(false)
    }
  }, [isAnimated, id])

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
  
  const activeMarkerEnd: any = isGreen
    ? {
        type: getMarkerType(),
        color: '#22c55e',
        width: 20,
        height: 20,
        id: `marker-${id}-active`,
      }
    : markerEnd

  // Crear marcador para el inicio (bidireccional)
  const markerStartId = `arrow-start-${id}`
  const activeMarkerStart: any = isGreen
    ? {
        type: getMarkerType(),
        color: '#22c55e',
        width: 20,
        height: 20,
        id: markerStartId,
      }
    : {
        type: getMarkerType(),
        color: style.stroke as string || 'var(--color-edge-default)',
        width: 20,
        height: 20,
        id: markerStartId,
      }

  return (
    <>
      <defs>
        <marker
          id={markerStartId}
          markerWidth="20"
          markerHeight="20"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={isGreen ? '#22c55e' : (style.stroke as string) || 'var(--color-edge-default)'}
          />
        </marker>
      </defs>
      
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
            markerStart: `url(#${markerStartId})`,
          }}
          markerEnd={activeMarkerEnd}
        />
      </g>
      
      {isAnimated && shouldShowAnimation && (
        <circle r="8" fill="#22c55e" className="edge-moving-dot" opacity="1">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1"
            keyTimes="0;1"
            calcMode="linear"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="6;8;6"
            dur="1.5s"
            repeatCount="indefinite"
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
 * Edge type personalizado usando SmoothStep para curvas suaves
 */
export const modernEdgeTypes = {
  default: AnimatedEdge,
  smoothstep: AnimatedEdge,
  bezier: AnimatedEdge, // Usar AnimatedEdge en lugar de BezierEdge
  animated: AnimatedEdge,
  bidirectional: BidirectionalEdge, // Edge bidireccional para nodos LLM
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

