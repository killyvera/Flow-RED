/**
 * Model Tab - Agent Core Configuration
 */

import React from 'react'

export interface ModelTabProps {
  nodeData: any
  onChange: (data: any) => void
}

export function ModelTab({ nodeData, onChange }: ModelTabProps) {
  const handleChange = (value: string) => {
    onChange({ ...nodeData, modelPromptTemplate: value })
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label 
          htmlFor="modelPromptTemplate" 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Model Prompt Template
        </label>
        <textarea
          id="modelPromptTemplate"
          value={nodeData.modelPromptTemplate || ''}
          onChange={(e) => handleChange(e.target.value)}
          rows={15}
          className="w-full px-3 py-2 rounded text-sm font-mono focus:outline-none focus:ring-2 border"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-node-border)',
            color: 'var(--color-text-primary)'
          }}
          placeholder={`You are an AI agent that follows the REACT strategy...

Available Tools:
{{tools}}

Current Iteration: {{iteration}}
History: {{history}}

Task: {{task}}

Respond with JSON:
{
  "reason": "your reasoning",
  "action": "tool_name",
  "parameters": {...}
}`}
        />
      </div>

      <div 
        className="p-4 rounded text-sm border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-accent-primary)',
          color: 'var(--color-text-primary)'
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--color-accent-primary)' }}>
          Template Variables
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li><code style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{tools}}'}</code>: List of available tools</li>
          <li><code style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{iteration}}'}</code>: Current iteration number</li>
          <li><code style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{history}}'}</code>: Previous actions and results</li>
          <li><code style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{task}}'}</code>: The current task/goal</li>
          <li><code style={{ backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{state}}'}</code>: Current agent state</li>
        </ul>
      </div>
    </div>
  )
}

