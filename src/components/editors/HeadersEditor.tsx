/**
 * HeadersEditor Component
 * 
 * Editor especializado para HTTP headers con:
 * - Presets comunes (Authorization, Content-Type, etc.)
 * - Dos modos: Form y JSON
 * - Sincronización bidireccional entre modos
 * - Validación de JSON
 */

import { useState, useCallback, useEffect } from 'react'
import { KeyValueEditor, type KeyValueItem } from './KeyValueEditor'
import { CodeEditor } from './CodeEditor'
import { AlertTriangle } from 'lucide-react'

export interface HeadersEditorProps {
  headers: Record<string, string>
  onChange: (headers: Record<string, string>) => void
  readOnly?: boolean
}

type EditorMode = 'form' | 'json'

// Headers comunes HTTP
const COMMON_HEADERS = [
  { value: 'Authorization', label: 'Authorization' },
  { value: 'Content-Type', label: 'Content-Type' },
  { value: 'Accept', label: 'Accept' },
  { value: 'User-Agent', label: 'User-Agent' },
  { value: 'Accept-Language', label: 'Accept-Language' },
  { value: 'Accept-Encoding', label: 'Accept-Encoding' },
  { value: 'Cache-Control', label: 'Cache-Control' },
  { value: 'Connection', label: 'Connection' },
  { value: 'Cookie', label: 'Cookie' },
  { value: 'Referer', label: 'Referer' },
]

export function HeadersEditor({ headers, onChange, readOnly = false }: HeadersEditorProps) {
  const [mode, setMode] = useState<EditorMode>('form')
  const [jsonValue, setJsonValue] = useState('')
  const [formItems, setFormItems] = useState<KeyValueItem[]>([])
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [conversionWarning, setConversionWarning] = useState<string | null>(null)

  // Convertir headers a items de formulario
  const headersToFormItems = useCallback((hdrs: Record<string, string>): KeyValueItem[] => {
    return Object.entries(hdrs).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : (typeof value === 'object' ? JSON.stringify(value) : String(value)),
      enabled: true,
    }))
  }, [])

  // Convertir items de formulario a headers
  const formItemsToHeaders = useCallback((items: KeyValueItem[]): Record<string, string> => {
    return items
      .filter(item => item.key.trim() !== '' && item.enabled !== false)
      .reduce((acc, item) => {
        acc[item.key] = item.value
        return acc
      }, {} as Record<string, string>)
  }, [])

  // Validar si JSON puede representarse como form (solo objeto plano)
  const canRepresentAsForm = useCallback((json: any): { valid: boolean; warning?: string } => {
    if (typeof json !== 'object' || json === null) {
      return { valid: false, warning: 'JSON must be an object' }
    }

    if (Array.isArray(json)) {
      return { valid: false, warning: 'Arrays cannot be represented in form mode' }
    }

    // Verificar que todos los valores son primitivos
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object' && value !== null) {
        return { 
          valid: false, 
          warning: `Header "${key}" contains nested object/array, which cannot be represented in form mode` 
        }
      }
    }

    return { valid: true }
  }, [])

  // Inicializar valores cuando cambian los headers externos
  useEffect(() => {
    setFormItems(headersToFormItems(headers))
    setJsonValue(JSON.stringify(headers, null, 2))
  }, [headers, headersToFormItems])

  // Cambiar de modo
  const handleModeChange = useCallback((newMode: EditorMode) => {
    if (newMode === 'json' && mode === 'form') {
      // Form → JSON
      const hdrs = formItemsToHeaders(formItems)
      setJsonValue(JSON.stringify(hdrs, null, 2))
      setConversionWarning(null)
    } else if (newMode === 'form' && mode === 'json') {
      // JSON → Form
      try {
        const parsed = JSON.parse(jsonValue)
        const validation = canRepresentAsForm(parsed)
        
        if (!validation.valid) {
          setConversionWarning(validation.warning || 'Cannot convert to form mode')
          return // No cambiar de modo
        }

        const items = headersToFormItems(parsed)
        setFormItems(items)
        setConversionWarning(null)
      } catch (err) {
        setConversionWarning('Invalid JSON. Fix errors before switching to form mode.')
        return // No cambiar de modo
      }
    }

    setMode(newMode)
  }, [mode, formItems, jsonValue, formItemsToHeaders, headersToFormItems, canRepresentAsForm])

  // Cambios en form mode
  const handleFormChange = useCallback((items: KeyValueItem[]) => {
    setFormItems(items)
    const hdrs = formItemsToHeaders(items)
    onChange(hdrs)
  }, [formItemsToHeaders, onChange])

  // Cambios en JSON mode
  const handleJsonChange = useCallback((value: string) => {
    setJsonValue(value)
    
    try {
      const parsed = JSON.parse(value)
      const validation = canRepresentAsForm(parsed)
      
      if (!validation.valid) {
        setConversionWarning(`Warning: ${validation.warning}`)
      } else {
        setConversionWarning(null)
      }

      // Actualizar headers
      onChange(parsed)
    } catch (err) {
      // JSON inválido, no actualizar headers
    }
  }, [onChange, canRepresentAsForm])

  // Agregar preset de header
  const handleAddPreset = useCallback((presetKey: string) => {
    const newItem: KeyValueItem = {
      key: presetKey,
      value: '',
      enabled: true,
    }
    const newItems = [...formItems, newItem]
    setFormItems(newItems)
    const hdrs = formItemsToHeaders(newItems)
    onChange(hdrs)
  }, [formItems, formItemsToHeaders, onChange])

  return (
    <div className="headers-editor space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-2 rounded p-1"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <button
            onClick={() => handleModeChange('form')}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={mode === 'form' ? {
              backgroundColor: 'var(--color-accent-primary)',
              color: 'var(--color-text-primary)',
            } : {
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'form') {
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'form') {
                e.currentTarget.style.color = 'var(--color-text-secondary)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            disabled={readOnly}
          >
            Form
          </button>
          <button
            onClick={() => handleModeChange('json')}
            className="px-3 py-1 text-sm rounded transition-colors"
            style={mode === 'json' ? {
              backgroundColor: 'var(--color-accent-primary)',
              color: 'var(--color-text-primary)',
            } : {
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'json') {
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'json') {
                e.currentTarget.style.color = 'var(--color-text-secondary)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            disabled={readOnly}
          >
            JSON
          </button>
        </div>

        {mode === 'form' && !readOnly && (
          <div className="relative group">
            <button 
              className="px-3 py-1 text-sm rounded transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
              }}
            >
              + Add Preset
            </button>
            <div 
              className="absolute right-0 top-full mt-1 rounded shadow-lg z-10 hidden group-hover:block min-w-[200px]"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-node-border)',
              }}
            >
              {COMMON_HEADERS.map((header) => (
                <button
                  key={header.value}
                  onClick={() => handleAddPreset(header.value)}
                  className="block w-full text-left px-3 py-2 text-sm transition-colors first:rounded-t last:rounded-b"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                    e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {header.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversion warning */}
      {conversionWarning && (
        <div 
          className="flex items-start gap-2 p-3 rounded text-sm border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-status-warning)',
            borderWidth: '1px',
            color: 'var(--color-status-warning)',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{conversionWarning}</span>
        </div>
      )}

      {/* Editor */}
      {mode === 'form' ? (
        <KeyValueEditor
          items={formItems}
          onChange={handleFormChange}
          placeholder={{ key: 'Header name', value: 'Header value' }}
          keyLabel="Header Name"
          valueLabel="Header Value"
          addButtonText="Add Header"
          readOnly={readOnly}
        />
      ) : (
        <CodeEditor
          value={jsonValue}
          onChange={handleJsonChange}
          language="json"
          height="400px"
          showPrettyButton={true}
          validateJson={true}
          onValidationError={setJsonError}
          readOnly={readOnly}
        />
      )}

      {/* JSON error */}
      {mode === 'json' && jsonError && (
        <div 
          className="flex items-start gap-2 p-3 rounded text-sm border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-status-error)',
            borderWidth: '1px',
            color: 'var(--color-status-error)',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{jsonError}</span>
        </div>
      )}
    </div>
  )
}
