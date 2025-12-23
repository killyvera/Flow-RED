/**
 * Lista de flows con búsqueda y filtrado
 */

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { NodeRedNode } from '@/api/types'
import { FlowItem } from './FlowItem'

export interface FlowListProps {
  flows: NodeRedNode[]
  activeFlowId: string | null
  allNodes: NodeRedNode[]
  onSelectFlow: (flowId: string) => void
  onEditFlow: (flowId: string) => void
  onDuplicateFlow: (flowId: string) => void
  onExportFlow: (flowId: string) => void
  onDeleteFlow: (flowId: string) => void
  onConvertToSubflow?: (flowId: string) => Promise<void>
  onRemoveFromProject?: (flowId: string) => void
}

export function FlowList({
  flows,
  activeFlowId,
  allNodes,
  onSelectFlow,
  onEditFlow,
  onDuplicateFlow,
  onExportFlow,
  onDeleteFlow,
  onConvertToSubflow,
  onRemoveFromProject,
}: FlowListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Incluir tanto tabs (flows) como subflows en la lista
  // Similar a n8n donde todos los flows pueden ser tratados como subflows
  const validFlows = flows.filter((flow) => flow.type === 'tab' || flow.type === 'subflow')

  const filteredFlows = validFlows.filter((flow) => {
    if (!searchQuery.trim()) return true
    const flowName = (flow.label || flow.name || '').toLowerCase()
    return flowName.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-node-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar flows..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredFlows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              {searchQuery ? 'No se encontraron flows' : 'No hay flows'}
            </p>
          </div>
        ) : (
          filteredFlows.map((flow) => (
            <FlowItem
              key={flow.id}
              flow={flow}
              isActive={flow.id === activeFlowId}
              allNodes={allNodes}
              onSelect={() => onSelectFlow(flow.id)}
              onEdit={() => onEditFlow(flow.id)}
              onDuplicate={() => onDuplicateFlow(flow.id)}
              onExport={() => onExportFlow(flow.id)}
              onDelete={() => onDeleteFlow(flow.id)}
              onConvertToSubflow={onConvertToSubflow ? () => onConvertToSubflow(flow.id) : undefined}
              onRemoveFromProject={onRemoveFromProject ? () => onRemoveFromProject(flow.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

