/**
 * Configuración de edges (conexiones) para React Flow
 * 
 * Define los tipos de edges y sus estilos para un look moderno estilo Flowise/n8n.
 */

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
          strokeWidth: isActive ? 3 : style.strokeWidth || 2,
          stroke: isActive ? 'var(--color-edge-active, #10b981)' : style.stroke || 'var(--color-edge-default)',
          transition: 'stroke-width 0.2s, stroke 0.2s',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Animación de pulso cuando está activo */}
      {isActive && (
        <path
          d={edgePath}
          style={{
            strokeWidth: 4,
            stroke: 'var(--color-edge-active, #10b981)',
            opacity: 0.4,
            fill: 'none',
          }}
          className="react-flow__edge-path"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.8;0.4"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
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

