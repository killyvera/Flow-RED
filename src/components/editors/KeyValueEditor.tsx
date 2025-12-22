/**
 * KeyValueEditor Component
 * 
 * Editor genérico de pares clave/valor con capacidad de agregar/eliminar filas,
 * validación inline, y toggle para habilitar/deshabilitar items.
 */

import { useState, useCallback } from 'react'
import { Plus, Trash2, Upload, Download } from 'lucide-react'

export interface KeyValueItem {
  key: string
  value: string
  enabled?: boolean
}

export interface KeyValueEditorProps {
  items: KeyValueItem[]
  onChange: (items: KeyValueItem[]) => void
  placeholder?: { key: string; value: string }
  allowToggle?: boolean
  keyLabel?: string
  valueLabel?: string
  addButtonText?: string
  readOnly?: boolean
}

export function KeyValueEditor({
  items,
  onChange,
  placeholder = { key: 'Key', value: 'Value' },
  allowToggle = false,
  keyLabel = 'Key',
  valueLabel = 'Value',
  addButtonText = 'Add Item',
  readOnly = false,
}: KeyValueEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Agregar nuevo item
  const handleAdd = useCallback(() => {
    const newItem: KeyValueItem = {
      key: '',
      value: '',
      enabled: true,
    }
    onChange([...items, newItem])
    setExpandedIndex(items.length) // Expandir el nuevo item
  }, [items, onChange])

  // Eliminar item
  const handleRemove = useCallback((index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }, [items, onChange, expandedIndex])

  // Actualizar key
  const handleKeyChange = useCallback((index: number, newKey: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], key: newKey }
    onChange(newItems)
  }, [items, onChange])

  // Actualizar value
  const handleValueChange = useCallback((index: number, newValue: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], value: newValue }
    onChange(newItems)
  }, [items, onChange])

  // Toggle enabled/disabled
  const handleToggle = useCallback((index: number) => {
    const newItems = [...items]
    newItems[index] = { 
      ...newItems[index], 
      enabled: !newItems[index].enabled 
    }
    onChange(newItems)
  }, [items, onChange])

  // Export to JSON
  const handleExportJson = useCallback(() => {
    const json = items.reduce((acc, item) => {
      if (item.key) {
        acc[item.key] = item.value
      }
      return acc
    }, {} as Record<string, string>)

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'key-value-pairs.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [items])

  // Import from JSON
  const handleImportJson = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          const newItems: KeyValueItem[] = Object.entries(json).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true,
          }))
          onChange(newItems)
        } catch (err) {
          alert('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [onChange])

  return (
    <div className="keyvalue-editor space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div 
          className="flex items-center gap-4 text-xs font-medium"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {allowToggle && <span className="w-8"></span>}
          <span className="flex-1">{keyLabel}</span>
          <span className="flex-1">{valueLabel}</span>
          <span className="w-8"></span>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportJson}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Import from JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportJson}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Export to JSON"
              disabled={items.length === 0}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.length === 0 && (
          <div 
            className="text-center py-8 text-sm border border-dashed rounded"
            style={{
              color: 'var(--color-text-tertiary)',
              borderColor: 'var(--color-node-border)',
            }}
          >
            No items yet. Click "{addButtonText}" to get started.
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded border transition-colors"
            style={{
              backgroundColor: !item.enabled && allowToggle 
                ? 'var(--color-bg-tertiary)' 
                : 'var(--color-bg-secondary)',
              borderColor: 'var(--color-node-border)',
              opacity: !item.enabled && allowToggle ? 0.5 : 1,
            }}
          >
            {/* Toggle checkbox */}
            {allowToggle && (
              <input
                type="checkbox"
                checked={item.enabled !== false}
                onChange={() => handleToggle(index)}
                className="w-4 h-4 rounded focus:ring-2 focus:ring-offset-0"
                style={{
                  borderColor: 'var(--color-node-border)',
                  accentColor: 'var(--color-accent-primary)',
                }}
                disabled={readOnly}
              />
            )}

            {/* Key input */}
            <input
              type="text"
              value={item.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              placeholder={placeholder.key}
              className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-node-border)',
                color: 'var(--color-text-primary)',
              }}
              disabled={readOnly}
            />

            {/* Value input */}
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleValueChange(index, e.target.value)}
              placeholder={placeholder.value}
              className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-node-border)',
                color: 'var(--color-text-primary)',
              }}
              disabled={readOnly}
            />

            {/* Delete button */}
            {!readOnly && (
              <button
                onClick={() => handleRemove(index)}
                className="p-2 rounded transition-colors"
                style={{ color: 'var(--color-status-error)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-status-error)'
                  e.currentTarget.style.opacity = '0.1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.opacity = '1'
                }}
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      {!readOnly && (
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors w-full justify-center"
          style={{
            color: 'var(--color-accent-primary)',
            borderColor: 'var(--color-accent-primary)',
            borderOpacity: 0.3,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-primary)'
            e.currentTarget.style.opacity = '0.1'
            e.currentTarget.style.borderOpacity = '0.5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.borderOpacity = '0.3'
          }}
        >
          <Plus className="w-4 h-4" />
          {addButtonText}
        </button>
      )}
    </div>
  )
}
