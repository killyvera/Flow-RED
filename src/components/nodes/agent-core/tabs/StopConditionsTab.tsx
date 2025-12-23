/**
 * Stop Conditions Tab - Agent Core Configuration
 */

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface StopConditionsTabProps {
  nodeData: any
  onChange: (data: any) => void
}

export function StopConditionsTab({ nodeData, onChange }: StopConditionsTabProps) {
  const stopConditions = nodeData.stopConditions || []

  const handleAddCondition = () => {
    const newConditions = [...stopConditions, { type: 'maxIterations', value: '' }]
    onChange({ ...nodeData, stopConditions: newConditions })
  }

  const handleRemoveCondition = (index: number) => {
    const newConditions = stopConditions.filter((_: any, i: number) => i !== index)
    onChange({ ...nodeData, stopConditions: newConditions })
  }

  const handleConditionChange = (index: number, field: 'type' | 'value', value: string) => {
    const newConditions = [...stopConditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    onChange({ ...nodeData, stopConditions: newConditions })
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Stop Conditions
        </h3>
        <button
          onClick={handleAddCondition}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: 'white'
          }}
        >
          <Plus className="w-4 h-4" />
          Add Condition
        </button>
      </div>

      <div className="space-y-2">
        {stopConditions.map((condition: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={condition.type || 'maxIterations'}
              onChange={(e) => handleConditionChange(index, 'type', e.target.value)}
              className="px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-node-border)',
                color: 'var(--color-text-primary)',
                width: '150px'
              }}
            >
              <option value="maxIterations">Max Iterations</option>
              <option value="goalAchieved">Goal Achieved</option>
              <option value="timeout">Timeout</option>
              <option value="error">Error</option>
            </select>

            <input
              type="text"
              value={condition.value || ''}
              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-node-border)',
                color: 'var(--color-text-primary)'
              }}
            />

            <button
              onClick={() => handleRemoveCondition(index)}
              className="p-2 rounded transition-colors hover:opacity-80"
              style={{
                color: 'var(--color-status-error)'
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {stopConditions.length === 0 && (
          <div 
            className="p-4 rounded text-sm text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            No stop conditions configured. Click "Add Condition" to add one.
          </div>
        )}
      </div>

      <div 
        className="p-4 rounded text-sm border mt-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-accent-primary)',
          color: 'var(--color-text-primary)'
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--color-accent-primary)' }}>
          Stop Condition Types
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li><strong>Max Iterations</strong>: Stop after N iterations (e.g., "5")</li>
          <li><strong>Goal Achieved</strong>: Stop when model declares goal met (value: "true")</li>
          <li><strong>Timeout</strong>: Stop after N seconds (e.g., "30")</li>
          <li><strong>Error</strong>: Stop on any error (value: "true")</li>
        </ul>
      </div>
    </div>
  )
}

