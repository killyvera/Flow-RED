/**
 * Componente para renderizar nodos de subflow
 * 
 * Los subflows se renderizan como nodos colapsados con un indicador visual
 * y la opción de abrirlos para ver su contenido.
 */

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Workflow, ChevronRight, Info } from 'lucide-react'
import { getNodeHeaderColor } from '@/utils/nodeColors'
import { getSubflowInputs, getSubflowOutputs, extractSubflowIdFromType } from '@/utils/subflowUtils'
import type { NodeRedSubflowDefinition, NodeRedSubflowInstance } from '@/api/types'

export interface SubflowNodeProps {
  data: {
    label?: string
    nodeRedType: string
    nodeRedNode: NodeRedSubflowInstance
    subflowDefinition?: NodeRedSubflowDefinition
  }
  selected: boolean
  dragging: boolean
  id: string
}

export const SubflowNode = memo(({ data, selected }: SubflowNodeProps) => {
  const { nodeRedNode, subflowDefinition } = data
  const label = data.label || nodeRedNode.name || 'Subflow'
  
  // Obtener información del subflow
  const inputs = subflowDefinition ? getSubflowInputs(subflowDefinition) : (nodeRedNode.wires?.length || 0)
  const outputs = subflowDefinition ? getSubflowOutputs(subflowDefinition) : 1
  
  // Obtener ID del subflow desde el tipo
  const subflowId = extractSubflowIdFromType(nodeRedNode.type) || subflowDefinition?.id || 'unknown'
  const subflowName = subflowDefinition?.name || label
  
  // Color del header basado en el tipo
  const nodeHeaderColor = getNodeHeaderColor('subflow')
  
  // Determinar si está deshabilitado
  const isDisabled = nodeRedNode.disabled === true

  return (
    <div
      className={`
        relative
        bg-node-default
        border
        rounded-xl
        min-w-[180px]
        max-w-[240px]
        ${selected
          ? 'border-node-border-selected ring-2 ring-accent-primary ring-opacity-50'
          : 'border-node-border hover:border-node-border-hover'
        }
        ${isDisabled ? 'opacity-50 border-dashed cursor-not-allowed' : ''}
        group
      `}
      style={{
        opacity: isDisabled ? 'var(--node-disabled-opacity)' : undefined,
      }}
    >
      {/* Header del subflow */}
      <div
        className="px-3 py-2 rounded-t-xl relative"
        style={{
          backgroundColor: nodeHeaderColor,
        }}
      >
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-text-primary flex-shrink-0" strokeWidth={2} />
          <h3 className="text-xs font-semibold text-text-primary truncate flex-1 leading-tight">
            {label}
          </h3>
          <ChevronRight className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
        </div>
        {subflowDefinition && (
          <div className="text-[10px] text-text-secondary mt-1">
            {inputs} entrada{inputs !== 1 ? 's' : ''} • {outputs} salida{outputs !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Body del subflow */}
      <div className="px-3 py-2">
        <div className="text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded">
              Subflow
            </span>
            {subflowDefinition?.category && (
              <span className="text-[10px] text-text-tertiary">
                {subflowDefinition.category}
              </span>
            )}
          </div>
          {subflowDefinition && (
            <div className="text-[10px] text-text-tertiary flex items-center gap-1 mt-1">
              <Info className="w-3 h-3" />
              <span className="truncate" title={`ID: ${subflowId}`}>
                {subflowName !== label ? subflowName : `ID: ${subflowId.slice(0, 8)}...`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Handles de entrada */}
      {inputs > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: Math.max(12, inputs * 12),
            zIndex: 10,
          }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="!w-3 !h-3 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
            style={{ left: 0, top: '50%' }}
          />
        </div>
      )}

      {/* Handles de salida */}
      {Array.from({ length: outputs }, (_, index) => {
        const handleId = `output-${index}`
        const topPercent = outputs === 1 ? 50 : 30 + (index * (40 / Math.max(1, outputs - 1)))
        
        return (
          <div
            key={handleId}
            style={{
              position: 'absolute',
              right: -6,
              top: `${topPercent}%`,
              transform: 'translateY(-50%)',
              width: 12,
              height: 12,
              zIndex: 10,
            }}
          >
            <Handle
              type="source"
              position={Position.Right}
              id={handleId}
              className="!w-3 !h-3 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
              style={{ right: 0, top: '50%' }}
            />
          </div>
        )
      })}
    </div>
  )
})

SubflowNode.displayName = 'SubflowNode'

