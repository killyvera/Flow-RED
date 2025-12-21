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
}: EdgeProps) {
  const activeEdges = useCanvasStore((state) => state.activeEdges)
  const explainMode = useCanvasStore((state) => state.explainMode)
  const perfMode = useCanvasStore((state) => state.perfMode)
  const isActive = activeEdges.has(id) && !perfMode // Deshabilitar activación en perf mode
  const [isHovered, setIsHovered] = useState(false)
  
  // Log cuando el edge se activa/desactiva
  React.useEffect(() => {
    if (isActive) {
      console.log('✨ [AnimatedEdge] Edge activado:', {
        edgeId: id,
        activeEdgesCount: activeEdges.size,
        allActiveEdges: Array.from(activeEdges)
      })
    }
  }, [isActive, id, activeEdges])

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

  return (
    <>
      {/* Edge base usando BaseEdge de React Flow */}
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: isActive && !perfMode ? 4 : (style.strokeWidth as number) || 2,
            stroke: isActive && !perfMode
              ? 'var(--color-edge-active)' // Color activo del tema
              : (style.stroke as string) || 'var(--color-edge-default)', // Color por defecto del tema
            fill: 'none',
            transition: perfMode ? 'none' : 'stroke-width 0.2s ease-out, stroke 0.2s ease-out',
            filter: perfMode || !isActive ? 'none' : 'drop-shadow(0 0 6px var(--color-edge-active-glow))',
          }}
          markerEnd={markerEnd}
        />
      </g>
      
      {/* Capa de pulso cuando está activo (solo si no está en perf mode) */}
      {isActive && !perfMode && (
        <>
          {/* Path de pulso con animación CSS */}
          <BaseEdge
            path={edgePath}
            style={{
              strokeWidth: 6,
              stroke: 'var(--color-edge-active)',
              fill: 'none',
              opacity: 0.4,
              filter: 'drop-shadow(0 0 4px var(--color-edge-active-glow))',
            }}
          />
          
          {/* Punto animado que se mueve por el edge usando SVG animateMotion */}
          <circle r="8" fill="var(--color-edge-active)" className="edge-moving-dot" opacity="1">
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
        </>
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

