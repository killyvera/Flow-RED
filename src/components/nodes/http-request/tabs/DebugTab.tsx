/**
 * DebugTab Component
 * 
 * Tab para visualizar la petición HTTP final con:
 * - Preview de URL, headers y body
 * - Redacción de secretos (Authorization, tokens)
 * - Warnings sobre configuración
 * - Copy to clipboard
 */

import { useMemo, useState } from 'react'
import { CodeEditor } from '../../../editors/CodeEditor'
import { AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react'

export interface DebugTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function DebugTab({ nodeData }: DebugTabProps) {
  const [showSecrets, setShowSecrets] = useState(false)

  // Redactar secretos de un valor
  const redactSecret = (value: string, show: boolean): string => {
    if (show) return value

    // Detectar tokens/secrets
    const lowerValue = value.toLowerCase()
    if (
      lowerValue.includes('bearer') ||
      lowerValue.includes('token') ||
      lowerValue.includes('key') ||
      lowerValue.includes('secret') ||
      lowerValue.includes('password')
    ) {
      // Extraer y redactar la parte secreta
      const parts = value.split(' ')
      if (parts.length > 1) {
        return `${parts[0]} ***REDACTED***`
      }
      return '***REDACTED***'
    }

    return value
  }

  // Generar preview de la petición
  const requestPreview = useMemo(() => {
    const method = nodeData.method || 'GET'
    const url = nodeData.url || 'https://api.example.com/endpoint'
    const headers = nodeData.headers || {}
    const body = nodeData.body || ''
    
    // Headers redactados
    const redactedHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      redactedHeaders[key] = redactSecret(value as string, showSecrets)
    }

    // Construir preview
    let preview = `${method} ${url}\n\n`
    
    // Headers
    if (Object.keys(redactedHeaders).length > 0) {
      preview += 'Headers:\n'
      preview += JSON.stringify(redactedHeaders, null, 2)
      preview += '\n\n'
    }

    // Body (solo para POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      preview += 'Body:\n'
      if (typeof body === 'string') {
        preview += body
      } else {
        preview += JSON.stringify(body, null, 2)
      }
    }

    return preview
  }, [nodeData, showSecrets])

  // Detectar warnings
  const warnings = useMemo(() => {
    const warns: string[] = []

    // URL vacía
    if (!nodeData.url || nodeData.url.trim() === '') {
      warns.push('URL is not configured')
    }

    // Body vacío cuando se espera
    if (['POST', 'PUT', 'PATCH'].includes(nodeData.method)) {
      if (!nodeData.body || 
          (typeof nodeData.body === 'string' && nodeData.body.trim() === '') ||
          (typeof nodeData.body === 'object' && Object.keys(nodeData.body).length === 0)) {
        warns.push(`${nodeData.method} request has no body configured`)
      }
    }

    // Content-Type missing para requests con body
    if (['POST', 'PUT', 'PATCH'].includes(nodeData.method) && nodeData.body) {
      const headers = nodeData.headers || {}
      if (!headers['Content-Type'] && !headers['content-type']) {
        warns.push('Content-Type header is not set. API may reject the request.')
      }
    }

    // Timeout muy bajo
    if (nodeData.timeout && nodeData.timeout < 1000) {
      warns.push('Timeout is very low (< 1 second). Requests may fail frequently.')
    }

    // URL sin protocolo
    if (nodeData.url && !nodeData.url.startsWith('http') && !nodeData.url.includes('{{')) {
      warns.push('URL does not start with http:// or https://')
    }

    return warns
  }, [nodeData])

  // Copiar al portapapeles
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(requestPreview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="debug-tab space-y-4">
      <div 
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Preview of the HTTP request that will be sent. Secrets are redacted by default for security.
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-status-warning)',
                opacity: 0.1,
                border: '1px solid var(--color-status-warning)',
                borderOpacity: 0.3,
                color: 'var(--color-status-warning)',
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors border"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-node-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {showSecrets ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide Secrets
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show Secrets
            </>
          )}
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors border"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-node-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Request Preview */}
      <CodeEditor
        value={requestPreview}
        onChange={() => {}} // Read-only
        language="text"
        height="500px"
        readOnly={true}
        showPrettyButton={false}
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
        <p className="font-medium mb-2">About This Preview</p>
        <ul className="list-disc list-inside space-y-1 text-xs pl-2">
          <li>This is a static preview of your configuration</li>
          <li>Dynamic values (mustache templates) will be resolved at runtime</li>
          <li>Secrets in headers are redacted for security</li>
          <li>Use "Show Secrets" to reveal redacted values</li>
          <li>The actual request may differ if you use msg properties to override settings</li>
        </ul>
      </div>
    </div>
  )
}
