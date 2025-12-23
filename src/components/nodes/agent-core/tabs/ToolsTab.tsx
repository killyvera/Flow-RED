/**
 * Tools Tab - Agent Core Configuration
 */

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface ToolsTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function ToolsTab({ nodeData, onNodeDataChange }: ToolsTabProps) {
  const allowedTools = nodeData.allowedTools || []

  const handleAddTool = () => {
    const newTools = [...allowedTools, '']
    onNodeDataChange({ ...nodeData, allowedTools: newTools })
  }

  const handleRemoveTool = (index: number) => {
    const newTools = allowedTools.filter((_: any, i: number) => i !== index)
    onNodeDataChange({ ...nodeData, allowedTools: newTools })
  }

  const handleToolChange = (index: number, value: string) => {
    const newTools = [...allowedTools]
    newTools[index] = value
    onNodeDataChange({ ...nodeData, allowedTools: newTools })
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Allowed Tools
        </h3>
        <button
          onClick={handleAddTool}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: 'white'
          }}
        >
          <Plus className="w-4 h-4" />
          Add Tool
        </button>
      </div>

      <div className="space-y-2">
        {allowedTools.map((tool: string, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={tool}
              onChange={(e) => handleToolChange(index, e.target.value)}
              placeholder="Tool name (e.g., http-request)"
              className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 border"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-node-border)',
                color: 'var(--color-text-primary)'
              }}
            />
            <button
              onClick={() => handleRemoveTool(index)}
              className="p-2 rounded transition-colors hover:opacity-80"
              style={{
                color: 'var(--color-status-error)'
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {allowedTools.length === 0 && (
          <div 
            className="p-4 rounded text-sm text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            No tools configured. Click "Add Tool" to add one.
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
          Tool Configuration
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li>Only listed tools can be called by the agent</li>
          <li>Tool names should match Node-RED node types</li>
          <li>Leave empty to allow all tools (not recommended)</li>
        </ul>
      </div>
    </div>
  )
}

