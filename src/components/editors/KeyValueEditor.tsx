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
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
          {allowToggle && <span className="w-8"></span>}
          <span className="flex-1">{keyLabel}</span>
          <span className="flex-1">{valueLabel}</span>
          <span className="w-8"></span>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportJson}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              title="Import from JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportJson}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
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
          <div className="text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-700 rounded">
            No items yet. Click "{addButtonText}" to get started.
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-2 rounded border transition-colors ${
              !item.enabled && allowToggle
                ? 'bg-zinc-900 border-zinc-800 opacity-50'
                : 'bg-zinc-800 border-zinc-700'
            }`}
          >
            {/* Toggle checkbox */}
            {allowToggle && (
              <input
                type="checkbox"
                checked={item.enabled !== false}
                onChange={() => handleToggle(index)}
                className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                disabled={readOnly}
              />
            )}

            {/* Key input */}
            <input
              type="text"
              value={item.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              placeholder={placeholder.key}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={readOnly}
            />

            {/* Value input */}
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleValueChange(index, e.target.value)}
              placeholder={placeholder.value}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={readOnly}
            />

            {/* Delete button */}
            {!readOnly && (
              <button
                onClick={() => handleRemove(index)}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
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
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded border border-blue-500/30 hover:border-blue-500/50 transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          {addButtonText}
        </button>
      )}
    </div>
  )
}
