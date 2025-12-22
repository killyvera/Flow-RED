/**
 * HeadersTab Component
 * 
 * Tab para configurar HTTP headers con:
 * - Editor de headers (form/JSON modes)
 * - Presets comunes
 */

import { useCallback } from 'react'
import { HeadersEditor } from '../../../editors/HeadersEditor'

export interface HeadersTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function HeadersTab({ nodeData, onNodeDataChange }: HeadersTabProps) {
  const headers = nodeData.headers || {}

  const handleHeadersChange = useCallback((newHeaders: Record<string, string>) => {
    onNodeDataChange({ ...nodeData, headers: newHeaders })
  }, [nodeData, onNodeDataChange])

  return (
    <div className="headers-tab space-y-4">
      <div 
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Configure HTTP headers for your request. Common headers like Content-Type and Authorization 
        are available as presets in Form mode.
      </div>

      <HeadersEditor
        headers={headers}
        onChange={handleHeadersChange}
      />

      {/* Info Box */}
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
        <p className="font-medium mb-2">Common Use Cases</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>
            <strong>Authorization:</strong> Bearer tokens, API keys
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-accent-primary)', opacity: 0.8 }}
            >
              Example: <code>Bearer {'{{msg.token}}'}</code>
            </div>
          </li>
          <li>
            <strong>Content-Type:</strong> Specify the format of your request body
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-accent-primary)', opacity: 0.8 }}
            >
              Example: <code>application/json</code>, <code>application/x-www-form-urlencoded</code>
            </div>
          </li>
          <li>
            <strong>Accept:</strong> Specify the format you want in the response
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-accent-primary)', opacity: 0.8 }}
            >
              Example: <code>application/json</code>
            </div>
          </li>
        </ul>
      </div>

      {/* Warning for dynamic headers */}
      {Object.values(headers).some((value: unknown) => typeof value === 'string' && value.includes('{{') && value.includes('}}')) && (
        <div 
          className="p-4 rounded text-sm"
          style={{
            backgroundColor: 'var(--color-status-warning)',
            opacity: 0.1,
            border: '1px solid var(--color-status-warning)',
            borderOpacity: 0.3,
            color: 'var(--color-status-warning)',
          }}
        >
          <p className="font-medium mb-1">Dynamic Headers Detected</p>
          <p className="text-xs">
            Your headers contain mustache templates. Make sure the referenced properties exist 
            in the message at runtime.
          </p>
        </div>
      )}
    </div>
  )
}
