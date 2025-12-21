/**
 * Configuración de edges (conexiones) para React Flow
 * 
 * Define los tipos de edges y sus estilos para un look moderno estilo Flowise/n8n.
 */

import React, { memo } from 'react'
import type { Edge, EdgeProps } from 'reactflow'
import { BaseEdge, SmoothStepEdge, BezierEdge, getSmoothStepPath } from 'reactflow'
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
  ...props
}: EdgeProps) {
  const activeEdges = useCanvasStore((state) => state.activeEdges)
  const isActive = activeEdges.has(id)
  
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

  return (
    <>
      {/* Edge base usando BaseEdge de React Flow */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: isActive ? 4 : (style.strokeWidth as number) || 2,
          stroke: isActive 
            ? '#10b981' // Verde brillante cuando está activo
            : (style.stroke as string) || '#adb5bd', // Gris por defecto
          fill: 'none',
          transition: 'stroke-width 0.2s ease-out, stroke 0.2s ease-out',
          filter: isActive 
            ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))' 
            : 'none',
        }}
        className={isActive ? 'edge-active' : ''}
        markerEnd={markerEnd}
      />
      
      {/* Capa de pulso cuando está activo */}
      {isActive && (
        <>
          {/* Path de pulso con animación CSS */}
          <BaseEdge
            path={edgePath}
            style={{
              strokeWidth: 6,
              stroke: '#10b981',
              fill: 'none',
              opacity: 0.4,
              filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))',
            }}
            className="edge-pulse"
          />
          
          {/* Punto animado que se mueve por el edge usando SVG animateMotion */}
          <circle r="8" fill="#10b981" className="edge-moving-dot" opacity="1">
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
    </>
  )
})

/**
 * Edge type personalizado usando SmoothStep para curvas suaves
 */
export const modernEdgeTypes = {
  default: AnimatedEdge,
  smoothstep: AnimatedEdge,
  bezier: BezierEdge,
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
    markerEnd: {
      type: 'arrowclosed',
      color: 'var(--color-edge-default)',
      ...edge.markerEnd,
    },
  }))
}

