/**
 * BodyTab Component
 * 
 * Tab para configurar el body del HTTP Request con:
 * - Dos modos: Form (key/value) y Raw (editor de código)
 * - Selector de tipo de contenido (JSON, XML, Text)
 * - Auto-sugerencia de Content-Type
 * - Validación
 */

import { useState, useCallback, useEffect } from 'react'
import { KeyValueEditor, type KeyValueItem } from '../../../editors/KeyValueEditor'
import { CodeEditor } from '../../../editors/CodeEditor'
import { SelectField } from '../../../fields'
import { AlertTriangle, Info } from 'lucide-react'

export interface BodyTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

type BodyMode = 'form' | 'raw'
type ContentTypeOption = 'json' | 'xml' | 'text'

const CONTENT_TYPE_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'text', label: 'Plain Text' },
]

const CONTENT_TYPE_MAP: Record<ContentTypeOption, string> = {
  json: 'application/json',
  xml: 'application/xml',
  text: 'text/plain',
}

export function BodyTab({ nodeData, onNodeDataChange }: BodyTabProps) {
  const [mode, setMode] = useState<BodyMode>('raw')
  const [contentType, setContentType] = useState<ContentTypeOption>('json')
  const [rawBody, setRawBody] = useState('')
  const [formItems, setFormItems] = useState<KeyValueItem[]>([])
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Inicializar desde nodeData
  useEffect(() => {
    const body = nodeData.body
    
    if (typeof body === 'string') {
      setRawBody(body)
      setMode('raw')
      
      // Detectar tipo de contenido
      try {
        JSON.parse(body)
        setContentType('json')
      } catch {
        if (body.trim().startsWith('<')) {
          setContentType('xml')
        } else {
          setContentType('text')
        }
      }
    } else if (typeof body === 'object' && body !== null) {
      // Convertir objeto a form items o JSON string
      if (Array.isArray(body)) {
        setRawBody(JSON.stringify(body, null, 2))
        setMode('raw')
        setContentType('json')
      } else {
        // Objeto plano → puede ser form o raw
        const items = Object.entries(body).map(([key, value]) => ({
          key,
          value: String(value),
          enabled: true,
        }))
        setFormItems(items)
        setRawBody(JSON.stringify(body, null, 2))
      }
    }
  }, [nodeData.body])

  // Convertir form items a objeto
  const formItemsToObject = useCallback((items: KeyValueItem[]) => {
    return items
      .filter(item => item.key.trim() !== '' && item.enabled !== false)
      .reduce((acc, item) => {
        acc[item.key] = item.value
        return acc
      }, {} as Record<string, string>)
  }, [])

  // Cambiar modo
  const handleModeChange = useCallback((newMode: BodyMode) => {
    if (newMode === 'raw' && mode === 'form') {
      // Form → Raw: convertir items a JSON
      const obj = formItemsToObject(formItems)
      setRawBody(JSON.stringify(obj, null, 2))
      onNodeDataChange({ ...nodeData, body: JSON.stringify(obj), bodyMode: 'raw' })
    } else if (newMode === 'form' && mode === 'raw') {
      // Raw → Form: intentar parsear JSON
      try {
        const parsed = JSON.parse(rawBody)
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          const items = Object.entries(parsed).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true,
          }))
          setFormItems(items)
          onNodeDataChange({ ...nodeData, body: parsed, bodyMode: 'form' })
        } else {
          alert('Cannot convert array or non-object to form mode')
          return
        }
      } catch (err) {
        alert('Invalid JSON. Cannot convert to form mode.')
        return
      }
    }
    
    setMode(newMode)
  }, [mode, formItems, rawBody, formItemsToObject, nodeData, onNodeDataChange])

  // Cambios en form mode
  const handleFormChange = useCallback((items: KeyValueItem[]) => {
    setFormItems(items)
    const obj = formItemsToObject(items)
    onNodeDataChange({ ...nodeData, body: obj, bodyMode: 'form' })
  }, [formItemsToObject, nodeData, onNodeDataChange])

  // Cambios en raw mode
  const handleRawChange = useCallback((value: string) => {
    setRawBody(value)
    onNodeDataChange({ ...nodeData, body: value, bodyMode: 'raw' })
  }, [nodeData, onNodeDataChange])

  // Cambio de content type
  const handleContentTypeChange = useCallback((value: string) => {
    setContentType(value as ContentTypeOption)
    
    // Sugerir Content-Type header
    const suggestedHeader = CONTENT_TYPE_MAP[value as ContentTypeOption]
    const currentHeaders = nodeData.headers || {}
    
    if (!currentHeaders['Content-Type']) {
      onNodeDataChange({
        ...nodeData,
        headers: { ...currentHeaders, 'Content-Type': suggestedHeader }
      })
    }
  }, [nodeData, onNodeDataChange])

  // Verificar si Content-Type header coincide
  const currentContentTypeHeader = nodeData.headers?.['Content-Type']
  const suggestedContentType = CONTENT_TYPE_MAP[contentType]
  const contentTypeMismatch = currentContentTypeHeader && 
    currentContentTypeHeader !== suggestedContentType

  return (
    <div className="body-tab space-y-4">
      <div className="text-sm text-zinc-400 mb-4">
        Configure the request body. Available for POST, PUT, and PATCH methods.
      </div>

      {/* Mode and Content Type selectors */}
      <div className="flex items-center gap-4">
        {/* Mode toggle */}
        <div className="flex items-center gap-2 bg-zinc-800 rounded p-1">
          <button
            onClick={() => handleModeChange('form')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'form'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            Form
          </button>
          <button
            onClick={() => handleModeChange('raw')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            Raw
          </button>
        </div>

        {/* Content type selector (solo en modo raw) */}
        {mode === 'raw' && (
          <div className="flex-1">
            <SelectField
              id="contentType"
              label=""
              value={contentType}
              onChange={handleContentTypeChange}
              options={CONTENT_TYPE_OPTIONS}
            />
          </div>
        )}
      </div>

      {/* Content-Type mismatch warning */}
      {contentTypeMismatch && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Content-Type Mismatch</p>
            <p className="text-xs mt-1">
              Your Content-Type header is <code>{currentContentTypeHeader}</code> but 
              the body type is <code>{suggestedContentType}</code>. 
              Update the header in the Headers tab if needed.
            </p>
          </div>
        </div>
      )}

      {/* Editor */}
      {mode === 'form' ? (
        <KeyValueEditor
          items={formItems}
          onChange={handleFormChange}
          placeholder={{ key: 'Property name', value: 'Property value' }}
          keyLabel="Property"
          valueLabel="Value"
          addButtonText="Add Property"
        />
      ) : (
        <CodeEditor
          value={rawBody}
          onChange={handleRawChange}
          language={contentType === 'json' ? 'json' : contentType === 'xml' ? 'xml' : 'text'}
          height="400px"
          showPrettyButton={contentType === 'json'}
          validateJson={contentType === 'json'}
          onValidationError={setJsonError}
        />
      )}

      {/* JSON error */}
      {mode === 'raw' && contentType === 'json' && jsonError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{jsonError}</span>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-2">Dynamic Body Content</p>
            <p className="text-xs">
              You can use mustache templates in both modes:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2 text-xs">
              <li><code>{'{{msg.payload}}'}</code> - Insert the entire message payload</li>
              <li><code>{'{{msg.data.name}}'}</code> - Insert a specific property</li>
              <li>In Form mode, values can be templates</li>
              <li>In Raw mode, the entire body can be a template</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
