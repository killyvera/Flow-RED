/**
 * Componente GroupSelector - Selector de grupo para agregar nodos
 * 
 * Muestra un modal/dropdown para seleccionar un grupo al agregar un nodo.
 * Permite seleccionar un grupo existente o crear uno nuevo.
 */

import { useState, useEffect, useRef } from 'react'
import { X, Plus, FolderPlus } from 'lucide-react'
import type { NodeRedGroup } from '@/api/types'

export interface GroupSelectorProps {
  /** Grupos disponibles */
  groups: NodeRedGroup[]
  /** Si el selector está abierto */
  isOpen: boolean
  /** Callback para cerrar el selector */
  onClose: () => void
  /** Callback cuando se selecciona un grupo */
  onSelectGroup: (groupId: string | null) => void
  /** Callback para crear un nuevo grupo */
  onCreateGroup?: () => void
  /** Posición del modal (opcional, para posicionamiento) */
  position?: { x: number; y: number }
}

export function GroupSelector({
  groups,
  isOpen,
  onClose,
  onSelectGroup,
  onCreateGroup,
  position,
}: GroupSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Filtrar grupos por término de búsqueda
  const filteredGroups = groups.filter((group) => {
    if (!searchTerm) return true
    const name = group.name || group.label || group.id
    return name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Resetear búsqueda cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])

  const handleSelectGroup = (groupId: string) => {
    onSelectGroup(groupId)
    onClose()
  }

  const handleCreateNew = () => {
    if (onCreateGroup) {
      onCreateGroup()
    }
    onClose()
  }

  const handleRemoveFromGroup = () => {
    onSelectGroup(null) // null significa remover del grupo
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-bg-primary border border-node-border rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={position ? { position: 'absolute', left: `${position.x}px`, top: `${position.y}px` } : undefined}
      >
        {/* Header */}
        <div className="p-3 border-b border-node-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Seleccionar grupo
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-3 border-b border-node-border">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar grupo..."
            className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            autoFocus
          />
        </div>

        {/* Lista de grupos */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">
              <p className="text-xs">
                {searchTerm ? 'No se encontraron grupos' : 'No hay grupos disponibles'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredGroups.map((group) => {
                const groupName = group.name || group.label || `Grupo ${group.id.slice(0, 8)}`
                const groupColor = group.color || 'var(--color-group-text)'
                
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelectGroup(group.id)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-node-hover rounded transition-colors flex items-center gap-2 group"
                  >
                    {/* Indicador de color */}
                    <div
                      className="w-3 h-3 rounded border border-node-border flex-shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                    <span className="flex-1 truncate text-text-primary group-hover:text-text-primary">
                      {groupName}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="p-3 border-t border-node-border flex flex-col gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full px-3 py-2 text-xs bg-accent-primary text-white rounded hover:bg-accent-secondary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear nuevo grupo
          </button>
          <button
            type="button"
            onClick={handleRemoveFromGroup}
            className="w-full px-3 py-2 text-xs border border-node-border rounded hover:bg-node-hover transition-colors flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Quitar de grupo
          </button>
        </div>
      </div>
    </div>
  )
}

