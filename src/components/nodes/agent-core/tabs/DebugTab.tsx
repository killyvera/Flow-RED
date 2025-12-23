/**
 * Debug Tab - Agent Core Configuration
 */

import React from 'react'
import { BooleanField } from '@/components/fields'

export interface DebugTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function DebugTab({ nodeData, onNodeDataChange }: DebugTabProps) {
  const handleChange = (value: boolean) => {
    onNodeDataChange({ ...nodeData, debug: value })
  }

  return (
    <div className="space-y-4 p-4">
      <BooleanField
        id="debug"
        label="Enable Debug Mode"
        value={nodeData.debug || false}
        onChange={handleChange}
        description="Log detailed information about each iteration"
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
          Debug Mode
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li>Logs detailed information about each iteration</li>
          <li>Shows model requests and responses</li>
          <li>Displays tool execution details</li>
          <li>Tracks envelope transformations</li>
          <li><strong>Warning:</strong> May generate large amounts of log data</li>
        </ul>
      </div>
    </div>
  )
}

