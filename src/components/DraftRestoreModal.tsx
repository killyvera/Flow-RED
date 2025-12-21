/**
 * Modal para restaurar drafts
 * 
 * Se muestra al cargar un flow si se detecta un draft guardado.
 */

import { X, RotateCcw, Trash2, Clock } from 'lucide-react'

export interface DraftRestoreModalProps {
  isOpen: boolean
  onClose: () => void
  onRestore: () => void
  onDiscard: () => void
  draftTimestamp: number
  flowName?: string
}

export function DraftRestoreModal({
  isOpen,
  onClose,
  onRestore,
  onDiscard,
  draftTimestamp,
  flowName,
}: DraftRestoreModalProps) {
  if (!isOpen) {
    return null
  }

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return 'hace menos de un minuto'
    } else if (diffMins < 60) {
      return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
    } else if (diffHours < 24) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    } else if (diffDays < 7) {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
    } else {
      return date.toLocaleString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-status-info" />
            <h2 className="text-lg font-semibold text-text-primary">
              Draft encontrado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-node-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-text-primary">
            Se encontró un draft guardado automáticamente{flowName ? ` para "${flowName}"` : ''}.
          </p>

          <div className="bg-bg-secondary border border-node-border rounded-md p-4">
            <p className="text-sm text-text-secondary">
              <strong className="text-text-primary">Guardado:</strong> {formatTimestamp(draftTimestamp)}
            </p>
          </div>

          <p className="text-sm text-text-secondary">
            ¿Deseas restaurar este draft o descartarlo y cargar la versión del servidor?
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-node-border">
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 rounded"
          >
            <Trash2 className="w-4 h-4" />
            Descartar
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 text-sm bg-accent-primary text-white hover:bg-accent-secondary rounded transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar draft
          </button>
        </div>
      </div>
    </div>
  )
}

