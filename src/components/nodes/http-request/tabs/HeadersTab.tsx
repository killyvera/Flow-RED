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
        className="p-4 rounded text-sm border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-accent-primary)',
          borderWidth: '1px',
          color: 'var(--color-text-primary)',
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--color-accent-primary)' }}>Common Use Cases</p>
        <ul className="list-disc list-inside space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li>
            <strong style={{ color: 'var(--color-text-primary)' }}>Authorization:</strong> Bearer tokens, API keys
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Example: <code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>Bearer {'{{msg.token}}'}</code>
            </div>
          </li>
          <li>
            <strong style={{ color: 'var(--color-text-primary)' }}>Content-Type:</strong> Specify the format of your request body
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Example: <code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>application/json</code>, <code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>application/x-www-form-urlencoded</code>
            </div>
          </li>
          <li>
            <strong style={{ color: 'var(--color-text-primary)' }}>Accept:</strong> Specify the format you want in the response
            <div 
              className="text-xs mt-1 pl-5"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Example: <code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>application/json</code>
            </div>
          </li>
        </ul>
      </div>

      {/* Warning for dynamic headers */}
      {Object.values(headers).some((value: unknown) => typeof value === 'string' && value.includes('{{') && value.includes('}}')) && (
        <div 
          className="p-4 rounded text-sm border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-status-warning)',
            borderWidth: '1px',
            color: 'var(--color-status-warning)',
          }}
        >
          <p className="font-medium mb-1">Dynamic Headers Detected</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Your headers contain mustache templates. Make sure the referenced properties exist 
            in the message at runtime.
          </p>
        </div>
      )}
    </div>
  )
}
