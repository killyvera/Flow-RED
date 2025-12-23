/**
 * AzureOpenAIModelNode - Nodo personalizado para Azure OpenAI Model
 * 
 * Este nodo representa un modelo de lenguaje:
 * - Input (izquierda): Recibe ModelInput del Agent Core
 * - Output (derecha): Retorna ModelResponse al Agent Core
 */

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { Brain } from 'lucide-react'

/**
 * AzureOpenAIModelNode Component
 */
export const AzureOpenAIModelNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const nodeData = (data.data || data) as any
  const label = nodeData.label || 'Azure OpenAI Model'
  const deployment = nodeData.deployment || 'Not configured'
  const isExecuting = nodeData.isExecuting || false

  return (
    <div
      className={`
        relative bg-node-default border border-node-border rounded-lg shadow-node
        transition-all duration-200
        ${selected ? 'ring-2 ring-accent-primary' : ''}
        ${isExecuting ? 'animate-pulse' : ''}
      `}
      style={{
        minWidth: '160px',
        minHeight: '80px',
      }}
    >
      {/* Input Handle (Izquierda) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
        style={{
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Output Handle (Derecha) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output',
              handleType: 'source',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
        style={{
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-lg flex items-center gap-2"
        style={{
          backgroundColor: '#00A4EF20',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Brain size={18} style={{ color: '#00A4EF' }} />
        <span className="text-sm font-semibold text-text-primary">
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="mb-1">
            <span className="font-semibold">Deployment:</span> {deployment}
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: '#00A4EF' }}>
            <Brain size={10} />
            <span>Azure OpenAI</span>
          </div>
        </div>
      </div>
    </div>
  )
})

AzureOpenAIModelNode.displayName = 'AzureOpenAIModelNode'

