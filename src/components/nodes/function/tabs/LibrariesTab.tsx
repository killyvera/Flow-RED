/**
 * LibrariesTab Component
 * 
 * Tab para gestionar librerías externas (npm modules) que el nodo Function puede usar.
 * Permite agregar, editar y eliminar módulos npm.
 */

import { useState, useMemo } from 'react'
import { CodeEditor } from '../../../editors/CodeEditor'
import { Plus, Trash2, Info, AlertTriangle } from 'lucide-react'

export interface LibrariesTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

interface Library {
  module: string
  var?: string
}

export function LibrariesTab({ nodeData, onNodeDataChange }: LibrariesTabProps) {
  const [libsJson, setLibsJson] = useState(() => {
    try {
      const libs = nodeData.libs || []
      return JSON.stringify(libs, null, 2)
    } catch {
      return '[]'
    }
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  const libraries = useMemo(() => {
    try {
      return JSON.parse(libsJson) as Library[]
    } catch {
      return []
    }
  }, [libsJson])

  const updateLibraries = (newLibsJson: string) => {
    setLibsJson(newLibsJson)
    try {
      const parsed = JSON.parse(newLibsJson)
      if (Array.isArray(parsed)) {
        setValidationError(null)
        onNodeDataChange({
          ...nodeData,
          libs: parsed,
        })
      } else {
        setValidationError('Libraries must be an array')
      }
    } catch (err) {
      setValidationError('Invalid JSON format')
    }
  }

  const addLibrary = () => {
    const newLibs = [...libraries, { module: '', var: '' }]
    updateLibraries(JSON.stringify(newLibs, null, 2))
  }

  const removeLibrary = (index: number) => {
    const newLibs = libraries.filter((_, i) => i !== index)
    updateLibraries(JSON.stringify(newLibs, null, 2))
  }

  return (
    <div className="libraries-tab space-y-4">
      <div
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Add npm modules that your function code can use. These modules must be installed in your Node-RED environment.
      </div>

      {/* Validation error */}
      {validationError && (
        <div
          className="flex items-start gap-2 p-3 rounded text-sm"
          style={{
            backgroundColor: 'var(--color-status-error)',
            opacity: 0.1,
            border: '1px solid var(--color-status-error)',
            borderOpacity: 0.3,
            color: 'var(--color-status-error)',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Libraries list */}
      {libraries.length > 0 && (
        <div className="space-y-2">
          {libraries.map((lib, index) => (
            <div
              key={index}
              className="p-3 rounded border flex items-center justify-between"
              style={{
                borderColor: 'var(--color-node-border)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {lib.module || '(module name)'}
                </div>
                {lib.var && (
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Available as: <code>{lib.var}</code>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeLibrary(index)}
                className="p-2 rounded transition-colors"
                style={{
                  color: 'var(--color-status-error)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-status-error)'
                  e.currentTarget.style.opacity = '0.1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.opacity = '1'
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add library button */}
      <button
        onClick={addLibrary}
        className="flex items-center gap-2 px-4 py-2 rounded border transition-colors"
        style={{
          borderColor: 'var(--color-node-border)',
          color: 'var(--color-text-secondary)',
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
        <Plus className="w-4 h-4" />
        Add Library
      </button>

      {/* JSON Editor */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Libraries JSON
        </label>
        <CodeEditor
          value={libsJson}
          onChange={updateLibraries}
          language="json"
          height="300px"
          showPrettyButton={true}
          validateJson={true}
          onValidationError={setValidationError}
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
          <div>
            <p className="mb-1">Format: <code>[{`{ "module": "module-name", "var": "variableName" }`}]</code></p>
            <p>Example: <code>[{`{ "module": "lodash", "var": "_" }`}]</code> makes lodash available as <code>_</code> in your code</p>
          </div>
        </div>
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
        <p className="font-medium mb-2">About External Libraries</p>
        <ul className="list-disc list-inside space-y-1 text-xs pl-2">
          <li>Modules must be installed in your Node-RED environment first</li>
          <li>Use <code>npm install &lt;module-name&gt;</code> in your <code>.node-red</code> directory</li>
          <li>The <code>var</code> field is optional - if omitted, the module name is used</li>
          <li>Access the module in your code using the variable name you specified</li>
        </ul>
      </div>
    </div>
  )
}

