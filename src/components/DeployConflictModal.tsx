/**
 * Modal de conflictos de deploy
 * 
 * Se muestra cuando hay un conflicto de versión (HTTP 409) o rev mismatch
 * al intentar guardar un flow.
 */

import { X, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import type { NodeRedNode } from '@/api/types'

export interface DeployConflictModalProps {
  isOpen: boolean
  onClose: () => void
  onReload: () => void
  onExport: () => void
  onForceOverwrite: () => void
  localFlow: NodeRedNode[]
  conflictType: 'version' | 'rev_mismatch'
}

export function DeployConflictModal({
  isOpen,
  onClose,
  onReload,
  onExport,
  onForceOverwrite,
  localFlow,
  conflictType,
}: DeployConflictModalProps) {
  if (!isOpen) {
    return null
  }

  const handleExport = () => {
    const flowJson = JSON.stringify(localFlow, null, 2)
    const blob = new Blob([flowJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flow-backup-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onExport()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Conflicto al guardar
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
            {conflictType === 'version'
              ? 'El flow fue modificado por otro usuario o en otra sesión. Tus cambios locales no se han guardado.'
              : 'La versión del flow en el servidor ha cambiado. Tus cambios locales no se han guardado.'}
          </p>

          <div className="bg-bg-secondary border border-node-border rounded-md p-4">
            <p className="text-sm text-text-secondary mb-2">
              <strong className="text-text-primary">Opciones disponibles:</strong>
            </p>
            <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
              <li>
                <strong className="text-text-primary">Recargar desde el servidor:</strong> Descarta tus cambios locales y carga la versión más reciente del servidor.
              </li>
              <li>
                <strong className="text-text-primary">Exportar backup local:</strong> Descarga tus cambios locales como un archivo JSON antes de recargar.
              </li>
              <li>
                <strong className="text-text-primary">Forzar sobrescritura:</strong> Sobrescribe la versión del servidor con tus cambios locales (solo si estás seguro).
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-node-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary hover:bg-node-hover rounded transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            <Download className="w-4 h-4" />
            Exportar backup
          </button>
          <button
            onClick={onReload}
            className="px-4 py-2 text-sm bg-status-info/10 text-status-info hover:bg-status-info/20 rounded transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar desde servidor
          </button>
          <button
            onClick={onForceOverwrite}
            className="px-4 py-2 text-sm bg-status-error/10 text-status-error hover:bg-status-error/20 rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            Forzar sobrescritura
          </button>
        </div>
      </div>
    </div>
  )
}

