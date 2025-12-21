/**
 * Modal para confirmar eliminación de flows
 */

import { X, Trash2, AlertTriangle } from 'lucide-react'

export interface DeleteFlowModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  flowName: string
  isLoading?: boolean
}

export function DeleteFlowModal({
  isOpen,
  onClose,
  onConfirm,
  flowName,
  isLoading = false,
}: DeleteFlowModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Eliminar flow
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
        <div className="p-6 space-y-4">
          <p className="text-text-primary">
            ¿Estás seguro de que deseas eliminar el flow <strong>"{flowName}"</strong>?
          </p>
          <p className="text-sm text-text-secondary">
            Esta acción no se puede deshacer. Se eliminarán todos los nodos del flow.
          </p>
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
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-status-error text-white rounded hover:bg-status-error/90 transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

