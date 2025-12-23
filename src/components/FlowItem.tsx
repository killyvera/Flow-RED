/**
 * Item individual de flow en la lista
 */

import { MoreVertical, Edit, Copy, Download, Trash2, Workflow, X } from 'lucide-react'
import { useState } from 'react'
import type { NodeRedNode } from '@/api/types'
import { countFlowNodes } from '@/utils/flowUtils'
import { countSubflowInstances } from '@/utils/subflowUtils'

export interface FlowItemProps {
  flow: NodeRedNode
  isActive: boolean
  allNodes: NodeRedNode[]
  onSelect: () => void
  onEdit: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  onConvertToSubflow?: () => void
  onRemoveFromProject?: () => void
}

export function FlowItem({
  flow,
  isActive,
  allNodes,
  onSelect,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onConvertToSubflow,
  onRemoveFromProject,
}: FlowItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const nodeCount = countFlowNodes(flow, allNodes)
  const flowName = flow.label || flow.name || `Flow ${flow.id.slice(0, 8)}`
  const isSubflow = flow.type === 'subflow'
  const isTab = flow.type === 'tab'
  const instanceCount = isSubflow ? countSubflowInstances(flow.id, allNodes) : 0

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
        isActive
          ? 'bg-accent-primary/10 border-accent-primary'
          : 'bg-bg-secondary border-node-border hover:border-node-hover hover:bg-node-hover'
      }`}
      onClick={onSelect}
    >
      {/* Flow info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isSubflow && (
            <Workflow className="w-4 h-4 text-text-secondary flex-shrink-0" strokeWidth={2} />
          )}
          <h3 className="text-sm font-medium text-text-primary truncate">
            {flowName}
          </h3>
          {isActive && (
            <span className="px-2 py-0.5 text-xs bg-accent-primary text-white rounded">
              Activo
            </span>
          )}
          {isSubflow && (
            <span className="px-2 py-0.5 text-xs bg-bg-tertiary text-text-secondary rounded">
              Subflow
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-1">
          {isSubflow ? (
            <>
              {nodeCount} {nodeCount === 1 ? 'nodo interno' : 'nodos internos'}
              {instanceCount > 0 && (
                <> • {instanceCount} {instanceCount === 1 ? 'instancia' : 'instancias'}</>
              )}
            </>
          ) : (
            <>
              {nodeCount} {nodeCount === 1 ? 'nodo' : 'nodos'}
            </>
          )}
        </p>
      </div>

      {/* Actions menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-1.5 rounded hover:bg-node-hover transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          title="Acciones"
        >
          <MoreVertical className="w-4 h-4 text-text-secondary" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
              }}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-bg-primary border border-node-border rounded-md shadow-lg z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onEdit()
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-node-hover flex items-center gap-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDuplicate()
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-node-hover flex items-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onExport()
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-node-hover flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              {/* Opción para convertir flow a subflow (solo para tabs, no para subflows) */}
              {isTab && onConvertToSubflow && (
                <>
                  <div className="border-t border-node-border my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onConvertToSubflow()
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-node-hover flex items-center gap-2 transition-colors"
                  >
                    <Workflow className="w-4 h-4" />
                    Convertir a Subflow
                  </button>
                </>
              )}
              {/* Opción para remover del proyecto (solo si está disponible) */}
              {onRemoveFromProject && (
                <>
                  <div className="border-t border-node-border my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onRemoveFromProject()
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-status-warning hover:bg-node-hover flex items-center gap-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Remover del proyecto
                  </button>
                </>
              )}
              <div className="border-t border-node-border my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm text-status-error hover:bg-node-hover flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

