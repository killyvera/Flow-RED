/**
 * Componente principal para gestión de flows
 * Similar al panel lateral de n8n
 */

import { useState } from 'react'
import { Plus, Upload, X } from 'lucide-react'
import { FlowList } from './FlowList'
import { DeleteFlowModal } from './DeleteFlowModal'
import { ImportFlowModal } from './ImportFlowModal'
import { exportFlow } from '@/api/client'
import type { NodeRedNode } from '@/api/types'

export interface FlowManagerProps {
  flows: NodeRedNode[]
  activeFlowId: string | null
  allNodes: NodeRedNode[]
  isLoading: boolean
  onSelectFlow: (flowId: string) => void
  onCreateFlow: (name: string) => Promise<{ id: string }>
  onEditFlow: (flowId: string) => void
  onDuplicateFlow: (flowId: string) => void
  onDeleteFlow: (flowId: string) => Promise<void>
  onImportFlow: (json: string | object, options?: { name?: string }) => Promise<void>
  onConvertToSubflow?: (flowId: string) => Promise<void>
}

export function FlowManager({
  flows,
  activeFlowId,
  allNodes,
  isLoading,
  onSelectFlow,
  onCreateFlow,
  onEditFlow,
  onDuplicateFlow,
  onDeleteFlow,
  onImportFlow,
  onConvertToSubflow,
}: FlowManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; flowId: string | null; flowName: string }>({
    isOpen: false,
    flowId: null,
    flowName: '',
  })
  const [importModal, setImportModal] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleExport = async (flowId: string) => {
    try {
      const json = await exportFlow(flowId)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flow-${flowId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al exportar flow:', err)
      alert('Error al exportar flow')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.flowId) return
    try {
      await onDeleteFlow(deleteModal.flowId)
      setDeleteModal({ isOpen: false, flowId: null, flowName: '' })
    } catch (err) {
      console.error('Error al eliminar flow:', err)
    }
  }

  const handleCreate = async () => {
    if (!newFlowName.trim()) {
      alert('Por favor, ingresa un nombre para el flow')
      return
    }
    setIsCreating(true)
    try {
      await onCreateFlow(newFlowName.trim())
      setNewFlowName('')
    } catch (err) {
      console.error('Error al crear flow:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-20 z-40 p-3 bg-bg-primary border border-node-border rounded-lg shadow-lg hover:bg-node-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        title="Gestionar flows"
      >
        <Plus className="w-5 h-5 text-text-primary" />
      </button>
    )
  }

  return (
    <>
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-bg-primary border-r border-node-border shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <h2 className="text-lg font-semibold text-text-primary">Flows</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-node-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            title="Cerrar"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-3 border-b border-node-border space-y-2">
          {/* Create flow */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate()
                }
              }}
              placeholder="Nombre del flow..."
              disabled={isCreating || isLoading}
              className="flex-1 px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || isLoading || !newFlowName.trim()}
              className="px-3 py-2 bg-accent-primary text-white rounded hover:bg-accent-secondary transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Crear flow"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Import flow */}
          <button
            onClick={() => setImportModal(true)}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary hover:bg-node-hover transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Importar flow
          </button>
        </div>

        {/* Flow list */}
        <div className="flex-1 min-h-0">
          <FlowList
            flows={flows}
            activeFlowId={activeFlowId}
            allNodes={allNodes}
            onSelectFlow={onSelectFlow}
            onEditFlow={onEditFlow}
            onDuplicateFlow={onDuplicateFlow}
            onExportFlow={handleExport}
            onDeleteFlow={(flowId) => {
              const flow = flows.find((f) => f.id === flowId)
              setDeleteModal({
                isOpen: true,
                flowId,
                flowName: flow?.label || flow?.name || `Flow ${flowId.slice(0, 8)}`,
              })
            }}
            onConvertToSubflow={onConvertToSubflow}
          />
        </div>
      </div>

      {/* Modals */}
      <DeleteFlowModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, flowId: null, flowName: '' })}
        onConfirm={handleDelete}
        flowName={deleteModal.flowName}
        isLoading={isLoading}
      />

      <ImportFlowModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={onImportFlow}
        isLoading={isLoading}
      />
    </>
  )
}

