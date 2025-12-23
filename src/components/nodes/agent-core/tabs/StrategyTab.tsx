/**
 * Strategy Tab - Agent Core Configuration
 */

import React from 'react'
import { TextField, NumberField, SelectField } from '@/components/fields'

export interface StrategyTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function StrategyTab({ nodeData, onNodeDataChange }: StrategyTabProps) {
  const handleChange = (field: string, value: any) => {
    onNodeDataChange({ ...nodeData, [field]: value })
  }

  return (
    <div className="space-y-4 p-4">
      <TextField
        id="name"
        label="Name"
        value={nodeData.name || ''}
        onChange={(value) => handleChange('name', value)}
        placeholder="Agent Core"
      />

      <SelectField
        id="strategy"
        label="Strategy"
        value={nodeData.strategy || 'react'}
        onChange={(value) => handleChange('strategy', value)}
        options={[
          { value: 'react', label: 'REACT (Reason → Act)' }
        ]}
        required
      />

      <NumberField
        id="maxIterations"
        label="Max Iterations"
        value={nodeData.maxIterations || 5}
        onChange={(value) => handleChange('maxIterations', value)}
        placeholder="5"
        required
      />

      <div 
        className="p-4 rounded text-sm border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-accent-primary)',
          color: 'var(--color-text-primary)'
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--color-accent-primary)' }}>
          REACT Strategy
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          The agent will follow a loop:
        </p>
        <ol className="list-decimal list-inside space-y-1 mt-2 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li><strong>Reason</strong>: Analyze current state and decide next action</li>
          <li><strong>Act</strong>: Execute the chosen action via a tool</li>
          <li>Repeat until goal is achieved or stop condition is met</li>
        </ol>
      </div>
    </div>
  )
}

