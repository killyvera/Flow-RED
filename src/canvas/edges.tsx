/**
 * Configuración de edges (conexiones) para React Flow
 * 
 * Define los tipos de edges y sus estilos para un look moderno estilo Flowise/n8n.
 */

import React from 'react'
import type { Edge, EdgeProps } from 'reactflow'
import { SmoothStepEdge, BezierEdge, getSmoothStepPath } from 'reactflow'
import { useCanvasStore } from '@/state/canvasStore'

/**
 * Edge animado que muestra actividad durante la ejecución (estilo n8n)
 */
function AnimatedEdge({
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
    } else {
      // Log cuando se desactiva solo si antes estaba activo
      if (activeEdges.size === 0) {
        console.log('💤 [AnimatedEdge] Todos los edges desactivados')
      }
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
      {/* Edge base */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: isActive ? 4 : style.strokeWidth || 2,
          stroke: isActive ? 'var(--color-edge-active, #10b981)' : style.stroke || 'var(--color-edge-default)',
          transition: 'stroke-width 0.3s ease-out, stroke 0.3s ease-out',
          filter: isActive ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))' : 'none',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Animación de pulso cuando está activo (estilo n8n) */}
      {isActive && (
        <>
          <path
            d={edgePath}
            style={{
              strokeWidth: 6,
              stroke: 'var(--color-edge-active, #10b981)',
              opacity: 0.3,
              fill: 'none',
            }}
            className="react-flow__edge-path"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
          {/* Punto animado que se mueve por el edge */}
          <circle r="4" fill="var(--color-edge-active, #10b981)">
            <animateMotion
              dur="0.5s"
              repeatCount="indefinite"
              path={edgePath}
            />
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="0.5s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
    </>
  )
}

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

