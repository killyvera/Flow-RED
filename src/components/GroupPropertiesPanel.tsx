/**
 * Panel de Propiedades para Grupos
 * 
 * Muestra y permite editar las propiedades de un grupo:
 * - Nombre
 * - Color
 * - Dimensiones (solo lectura)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Node } from 'reactflow'
import { X } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { TextField } from './fields'
import type { NodeRedGroup } from '@/api/types'

export interface GroupPropertiesPanelProps {
  /** Nodo del grupo */
  node: Node | null
  /** Si el panel está abierto */
  isOpen: boolean
  /** Callback para cerrar el panel */
  onClose: () => void
  /** Callback para actualizar el grupo */
  onUpdateGroup?: (groupId: string, updates: Partial<NodeRedGroup>) => void
}

export function GroupPropertiesPanel({
  node,
  isOpen,
  onClose,
  onUpdateGroup,
}: GroupPropertiesPanelProps) {
  const [groupName, setGroupName] = useState('')
  const [groupColor, setGroupColor] = useState<string>('')

  // Cargar datos del grupo cuando cambia el nodo
  useEffect(() => {
    if (!node || node.type !== 'group') {
      setGroupName('')
      setGroupColor('')
      return
    }

    const group = (node.data as { group: NodeRedGroup }).group
    if (group) {
      setGroupName(group.name || group.label || '')
      setGroupColor(group.color || '')
    }
  }, [node])

  // Manejar cambio de nombre
  const handleNameChange = useCallback((value: string) => {
    setGroupName(value)
    if (node && onUpdateGroup) {
      onUpdateGroup(node.id, { name: value })
    }
  }, [node, onUpdateGroup])

  // Manejar cambio de color
  const handleColorChange = useCallback((color: string) => {
    setGroupColor(color)
    if (node && onUpdateGroup) {
      onUpdateGroup(node.id, { color })
    }
  }, [node, onUpdateGroup])

  // Calcular nombre del grupo
  const displayName = useMemo(() => {
    if (!node) return 'Grupo'
    const group = (node.data as { group: NodeRedGroup }).group
    return group?.name || group?.label || `Grupo ${node.id.slice(0, 8)}`
  }, [node])

  // Obtener dimensiones del grupo
  const groupDimensions = useMemo(() => {
    if (!node) return { width: 0, height: 0 }
    const group = (node.data as { group: NodeRedGroup }).group
    return {
      width: group?.w || node.width || 0,
      height: group?.h || node.height || 0,
    }
  }, [node])

  // Obtener número de nodos en el grupo
  const nodesCount = useMemo(() => {
    if (!node) return 0
    return (node.data as { nodesCount?: number }).nodesCount || 0
  }, [node])

  if (!isOpen || !node || node.type !== 'group') return null

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-bg-primary border-l border-node-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-node-border flex items-center justify-between flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {displayName}
          </h2>
          <p className="text-xs text-text-tertiary truncate mt-0.5">
            Grupo
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors p-1 -mr-1 flex-shrink-0"
          aria-label="Cerrar panel"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-4">
          {/* Información básica del grupo (solo lectura) */}
          <div className="space-y-2 pb-3 border-b border-node-border">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                ID
              </label>
              <input
                type="text"
                value={node.id}
                disabled
                className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Ancho
                </label>
                <input
                  type="number"
                  value={Math.round(groupDimensions.width)}
                  disabled
                  className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Alto
                </label>
                <input
                  type="number"
                  value={Math.round(groupDimensions.height)}
                  disabled
                  className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nodos en el grupo
              </label>
              <input
                type="text"
                value={nodesCount}
                disabled
                className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed"
              />
            </div>
          </div>

          {/* Propiedades editables */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Propiedades
            </h3>
            
            {/* Nombre del grupo */}
            <TextField
              id="group-name"
              label="Nombre"
              value={groupName}
              onChange={handleNameChange}
              placeholder="Nombre del grupo"
              description="Nombre descriptivo para el grupo"
            />

            {/* Color del grupo */}
            <ColorPicker
              id="group-color"
              label="Color"
              value={groupColor}
              onChange={handleColorChange}
              description="Color de fondo y borde del grupo"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

