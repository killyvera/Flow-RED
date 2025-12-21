/**
 * Modal para importar flows desde JSON
 */

import { useState } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'
import { validateFlowJson } from '@/utils/flowUtils'

export interface ImportFlowModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (json: string | object, options?: { name?: string }) => Promise<void>
  isLoading?: boolean
}

export function ImportFlowModal({
  isOpen,
  onClose,
  onImport,
  isLoading = false,
}: ImportFlowModalProps) {
  const [jsonText, setJsonText] = useState('')
  const [flowName, setFlowName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  if (!isOpen) {
    return null
  }

  const handleValidate = () => {
    if (!jsonText.trim()) {
      setError('Por favor, ingresa el JSON del flow')
      return false
    }

    setIsValidating(true)
    const validation = validateFlowJson(jsonText)
    setIsValidating(false)

    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return false
    }

    setError(null)
    return true
  }

  const handleImport = async () => {
    if (!handleValidate()) {
      return
    }

    try {
      const jsonData = JSON.parse(jsonText)
      await onImport(jsonData, flowName ? { name: flowName } : undefined)
      // Reset form
      setJsonText('')
      setFlowName('')
      setError(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar flow')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setJsonText(content)
      setError(null)
    }
    reader.onerror = () => {
      setError('Error al leer el archivo')
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-status-info" />
            <h2 className="text-lg font-semibold text-text-primary">
              Importar flow
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-node-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Subir archivo JSON
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-accent-primary file:text-white hover:file:bg-accent-secondary disabled:opacity-50"
            />
          </div>

          {/* Flow name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nombre del flow (opcional)
            </label>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              disabled={isLoading}
              placeholder="Dejar vacío para usar el nombre del JSON"
              className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
            />
          </div>

          {/* JSON input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              JSON del flow
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value)
                setError(null)
              }}
              disabled={isLoading}
              placeholder='{"flow": {"label": "Mi Flow", "nodes": [...]}}'
              className="w-full h-64 px-3 py-2 text-sm font-mono border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-status-error/10 border border-status-error rounded-md">
              <AlertCircle className="w-4 h-4 text-status-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-node-border">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || isValidating || !jsonText.trim()}
            className="px-4 py-2 text-sm bg-accent-primary text-white rounded hover:bg-accent-secondary transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {isLoading ? 'Importando...' : isValidating ? 'Validando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

