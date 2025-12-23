/**
 * AgentCoreNode - Nodo personalizado para Agent Core
 * 
 * Este nodo tiene un layout especial:
 * - Input (izquierda): Recibe datos
 * - Output 0 (bottom-left): Model - Para enviar prompts al LLM
 * - Output 1 (bottom-center): Tool - Para ejecutar herramientas
 * - Output 2 (bottom-right): Memory - Para interactuar con memoria
 * - Output 3 (derecha): Result - Resultado final
 */

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { Brain, Wrench, Database } from 'lucide-react'

/**
 * AgentCoreNode Component
 */
export const AgentCoreNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const nodeData = (data.data || data) as any
  const label = nodeData.label || 'Agent Core'
  const isExecuting = nodeData.isExecuting || false
  const currentIteration = nodeData.currentIteration || 0
  const maxIterations = nodeData.maxIterations || 5

  return (
    <div
      className={`
        relative bg-node-default border border-node-border rounded-lg shadow-node
        transition-all duration-200
        ${selected ? 'ring-2 ring-accent-primary' : ''}
        ${isExecuting ? 'animate-pulse' : ''}
      `}
      style={{
        minWidth: '180px',
        minHeight: '120px',
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

      {/* Output Handle (Derecha) - Result */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-3"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output-3',
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
        }}
      >
        <Brain className="w-4 h-4" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[11px] truncate">Agent Core</div>
          <div className="text-[9px] opacity-80">REACT</div>
        </div>
        {isExecuting && (
          <div className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">
            {currentIteration}/{maxIterations}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 pb-4">
        {/* Output indicators en la parte inferior */}
        <div className="flex items-center justify-around gap-2 mt-2">
          <div className="flex flex-col items-center gap-0.5 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
            <Brain className="w-3 h-3" style={{ color: '#667eea' }} />
            <span>Model</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
            <Wrench className="w-3 h-3" style={{ color: '#f59e0b' }} />
            <span>Tool</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
            <Database className="w-3 h-3" style={{ color: '#8b5cf6' }} />
            <span>Memory</span>
          </div>
        </div>
      </div>

      {/* Bottom Handles - Model, Tool, Memory */}
      {/* Output 0: Model (izquierda) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-0"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output-0',
              handleType: 'source',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        className="!w-2.5 !h-2.5 !border-2 !border-node-border hover:!border-accent-primary transition-all duration-200"
        style={{
          left: '25%',
          bottom: -5,
          background: '#667eea',
        }}
      />

      {/* Output 1: Tool (centro) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-1"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output-1',
              handleType: 'source',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        className="!w-2.5 !h-2.5 !border-2 !border-node-border hover:!border-accent-primary transition-all duration-200"
        style={{
          left: '50%',
          bottom: -5,
          background: '#f59e0b',
        }}
      />

      {/* Output 2: Memory (derecha) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-2"
        onDoubleClick={(e) => {
          e.stopPropagation()
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output-2',
              handleType: 'source',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        className="!w-2.5 !h-2.5 !border-2 !border-node-border hover:!border-accent-primary transition-all duration-200"
        style={{
          left: '75%',
          bottom: -5,
          background: '#8b5cf6',
        }}
      />

      {/* Label debajo del nodo */}
      <div className="absolute top-full left-0 right-0 mt-1 text-center">
        <span className="text-[10px] text-text-secondary font-medium">
          {label}
        </span>
      </div>
    </div>
  )
})

AgentCoreNode.displayName = 'AgentCoreNode'

