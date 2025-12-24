/**
 * SettingsTab Component
 * 
 * Tab para configurar opciones del nodo Function:
 * - Número de outputs
 * - Timeout
 * - Manejo de errores
 */

import { NumberField, SelectField } from '../../../fields'
import { Info } from 'lucide-react'

export interface SettingsTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function SettingsTab({ nodeData, onNodeDataChange }: SettingsTabProps) {
  const updateField = (field: string, value: any) => {
    onNodeDataChange({
      ...nodeData,
      [field]: value,
    })
  }

  return (
    <div className="settings-tab space-y-6">
      {/* Outputs */}
      <div>
        <NumberField
          id="function-outputs"
          label="Number of Outputs"
          value={nodeData.outputs || 1}
          onChange={(value) => updateField('outputs', value)}
          min={1}
          max={10}
          description="Number of output ports this function node will have"
        />
        <div
          className="mt-2 flex items-start gap-2 p-2 rounded text-xs"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            opacity: 0.1,
            color: 'var(--color-accent-primary)',
          }}
        >
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Return an array of messages <code>[msg1, msg2]</code> to send to multiple outputs
          </span>
        </div>
      </div>

      {/* Timeout */}
      <div>
        <NumberField
          id="function-timeout"
          label="Timeout (seconds)"
          value={nodeData.timeout || 0}
          onChange={(value) => updateField('timeout', value)}
          min={0}
          description="Maximum execution time in seconds. 0 means no timeout."
        />
        <div
          className="mt-2 flex items-start gap-2 p-2 rounded text-xs"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            opacity: 0.1,
            color: 'var(--color-accent-primary)',
          }}
        >
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            If the function takes longer than this, it will be stopped and an error will be sent to the catch node.
          </span>
        </div>
      </div>

      {/* Error handling */}
      <div>
        <SelectField
          id="function-noerr"
          label="Error Handling"
          value={String(nodeData.noerr || 0)}
          onChange={(value) => updateField('noerr', parseInt(value))}
          options={[
            { value: '0', label: 'Send errors to catch node (default)' },
            { value: '1', label: 'Catch errors and send to second output' },
            { value: '2', label: 'Catch errors and send to second output, then continue' },
          ]}
          description="How to handle errors in the function code"
        />
      </div>

      {/* Info box */}
      <div
        className="p-4 rounded text-sm"
        style={{
          backgroundColor: 'var(--color-accent-primary)',
          opacity: 0.1,
          border: '1px solid var(--color-accent-primary)',
          borderOpacity: 0.3,
          color: 'var(--color-accent-primary)',
        }}
      >
        <p className="font-medium mb-2">About Function Node Settings</p>
        <ul className="list-disc list-inside space-y-1 text-xs pl-2">
          <li>Multiple outputs allow you to route messages to different paths</li>
          <li>Timeout helps prevent functions from running indefinitely</li>
          <li>Error handling gives you control over how exceptions are processed</li>
          <li>Use libraries tab to import external npm modules</li>
        </ul>
      </div>
    </div>
  )
}

