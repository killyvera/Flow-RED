/**
 * AgentCoreNode - Nodo visual para el Agent Core
 * 
 * Características especiales:
 * - 3 outputs: model, tool, result
 * - Visualización de estado de ejecución
 * - Indicadores de iteración actual
 * - Badge con estrategia REACT
 */

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { Brain, Wrench, CheckCircle } from 'lucide-react'

/**
 * AgentCoreNode Component
 * 
 * Extiende BaseNode con visualización específica para el agente:
 * - Output 0 (top): Model (cerebro)
 * - Output 1 (middle): Tool (herramienta)
 * - Output 2 (bottom): Result (check)
 */
export const AgentCoreNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const nodeData = (data.data || data) as any
  const label = nodeData.label || 'Agent Core'
  
  // Estado del agente (si está ejecutando)
  const isExecuting = nodeData.isExecuting || false
  const currentIteration = nodeData.currentIteration || 0
  const maxIterations = nodeData.maxIterations || 5

  return (
    <div
      className={`
        relative rounded-lg shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500' : ''}
        ${isExecuting ? 'animate-pulse' : ''}
      `}
      style={{
        minWidth: '200px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          width: '12px',
          height: '12px',
          background: 'var(--color-primary)',
          border: '2px solid var(--color-surface)',
        }}
      />

      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
        }}
      >
        <Brain className="w-5 h-5" />
        <div className="flex-1">
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs opacity-80">REACT Strategy</div>
        </div>
        {isExecuting && (
          <div className="text-xs bg-white/20 px-2 py-1 rounded">
            {currentIteration}/{maxIterations}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Orchestrates AI agent workflows
        </div>
        
        {/* Output indicators */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
            <Brain className="w-3 h-3" />
            <span>Model</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
            <Wrench className="w-3 h-3" />
            <span>Tool</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
            <CheckCircle className="w-3 h-3" />
            <span>Result</span>
          </div>
        </div>
      </div>

      {/* Output Handles - 3 outputs */}
      {/* Output 0: Model (top) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-0"
        style={{
          top: '35%',
          width: '12px',
          height: '12px',
          background: '#667eea',
          border: '2px solid var(--color-surface)',
        }}
      />

      {/* Output 1: Tool (middle) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-1"
        style={{
          top: '50%',
          width: '12px',
          height: '12px',
          background: '#f59e0b',
          border: '2px solid var(--color-surface)',
        }}
      />

      {/* Output 2: Result (bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-2"
        style={{
          top: '65%',
          width: '12px',
          height: '12px',
          background: '#10b981',
          border: '2px solid var(--color-surface)',
        }}
      />

      {/* Label debajo del nodo */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-xs text-center whitespace-nowrap px-2 py-1 rounded"
        style={{
          top: '100%',
          marginTop: '4px',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {label}
      </div>
    </div>
  )
})

AgentCoreNode.displayName = 'AgentCoreNode'

