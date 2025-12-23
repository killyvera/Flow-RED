/**
 * RequestTab Component
 * 
 * Tab de configuración básica de HTTP Request:
 * - Method (GET, POST, PUT, PATCH, DELETE)
 * - URL
 * - Timeout
 * - Follow Redirects
 */

import { useCallback } from 'react'
import { SelectField, TextField, NumberField, BooleanField } from '../../../fields'
import { AlertCircle } from 'lucide-react'

export interface RequestTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
]

export function RequestTab({ nodeData, onNodeDataChange }: RequestTabProps) {
  const method = nodeData.method || 'GET'
  const url = nodeData.url || ''
  const timeout = nodeData.timeout !== undefined ? nodeData.timeout : 60000
  const followRedirects = nodeData.followRedirects !== undefined ? nodeData.followRedirects : true

  // Validar URL
  const validateUrl = useCallback((value: string): { valid: boolean; error?: string } => {
    if (!value || value.trim() === '') {
      return { valid: false, error: 'URL is required' }
    }

    // Permitir URLs dinámicas con mustache {{}}
    if (value.includes('{{') && value.includes('}}')) {
      return { valid: true }
    }

    // Validación básica de URL
    try {
      const urlObj = new URL(value)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must use http:// or https://' }
      }
      return { valid: true }
    } catch (err) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }, [])

  const urlValidation = validateUrl(url)

  // Validar timeout
  const validateTimeout = useCallback((value: number): { valid: boolean; warning?: string } => {
    if (value < 0) {
      return { valid: false, warning: 'Timeout cannot be negative' }
    }
    if (value < 1000) {
      return { valid: true, warning: 'Very low timeout (< 1 second) may cause failures' }
    }
    if (value > 300000) {
      return { valid: true, warning: 'Very high timeout (> 5 minutes)' }
    }
    return { valid: true }
  }, [])

  const timeoutValidation = validateTimeout(timeout)

  // Handlers
  const handleMethodChange = useCallback((value: string) => {
    onNodeDataChange({ ...nodeData, method: value })
  }, [nodeData, onNodeDataChange])

  const handleUrlChange = useCallback((value: string) => {
    onNodeDataChange({ ...nodeData, url: value })
  }, [nodeData, onNodeDataChange])

  const handleTimeoutChange = useCallback((value: number) => {
    onNodeDataChange({ ...nodeData, timeout: value })
  }, [nodeData, onNodeDataChange])

  const handleFollowRedirectsChange = useCallback((value: boolean) => {
    onNodeDataChange({ ...nodeData, followRedirects: value })
  }, [nodeData, onNodeDataChange])

  return (
    <div className="request-tab space-y-6">
      <div className="space-y-4">
        {/* Method */}
        <SelectField
          id="method"
          label="HTTP Method"
          value={method}
          onChange={handleMethodChange}
          options={HTTP_METHODS}
          description="The HTTP method to use for the request"
        />

        {/* URL */}
        <div className="space-y-2">
          <TextField
            id="url"
            label="URL"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://api.example.com/endpoint"
            required={true}
            description="The URL to make the request to. Use {{msg.property}} for dynamic values."
          />
          
          {/* URL Validation */}
          {url && !urlValidation.valid && (
            <div 
              className="flex items-start gap-2 p-3 rounded text-sm border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-status-error)',
                borderWidth: '1px',
                color: 'var(--color-status-error)',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{urlValidation.error}</span>
            </div>
          )}
          
          {/* URL Helpers */}
          <div 
            className="text-xs space-y-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <p>Examples:</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li><code style={{ color: 'var(--color-text-secondary)' }}>https://api.example.com/users</code></li>
              <li><code style={{ color: 'var(--color-text-secondary)' }}>{'https://api.example.com/users/{{msg.userId}}'}</code></li>
              <li><code style={{ color: 'var(--color-text-secondary)' }}>{'{{msg.url}}'}</code></li>
            </ul>
          </div>
        </div>

        {/* Timeout */}
        <div className="space-y-2">
          <NumberField
            id="timeout"
            label="Timeout (ms)"
            value={timeout}
            onChange={handleTimeoutChange}
            description="Request timeout in milliseconds. 0 = no timeout."
          />
          
          {/* Timeout Warning */}
          {timeoutValidation.warning && (
            <div 
              className="flex items-start gap-2 p-3 rounded text-sm border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-status-warning)',
                borderWidth: '1px',
                color: 'var(--color-status-warning)',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{timeoutValidation.warning}</span>
            </div>
          )}
        </div>

        {/* Follow Redirects */}
        <BooleanField
          id="followRedirects"
          label="Follow Redirects"
          value={followRedirects}
          onChange={handleFollowRedirectsChange}
          description="Automatically follow HTTP 3xx redirects"
        />
      </div>

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
        <p className="font-medium mb-2" style={{ color: 'var(--color-accent-primary)' }}>Dynamic Values</p>
        <p style={{ color: 'var(--color-text-secondary)' }}>You can use mustache template syntax to insert values from the message:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 pl-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li><code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{msg.payload}}'}</code> - Insert the message payload</li>
          <li><code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{msg.topic}}'}</code> - Insert the message topic</li>
          <li><code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{flow.variable}}'}</code> - Insert a flow variable</li>
          <li><code style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>{'{{global.variable}}'}</code> - Insert a global variable</li>
        </ul>
      </div>
    </div>
  )
}
