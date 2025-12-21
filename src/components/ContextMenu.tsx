/**
 * Componente ContextMenu - Menú contextual estilo Node-RED
 * 
 * Características:
 * - Aparece con click derecho en nodo o canvas
 * - Opciones según contexto (nodo vs canvas)
 * - Posicionamiento dinámico cerca del cursor
 * - Cierra al hacer click fuera o presionar Escape
 */

import { useEffect, useRef } from 'react'
import type { Node } from 'reactflow'
import { Edit, Copy, Scissors, Trash2, Power, PowerOff, Plus, Clipboard, FolderPlus, FolderMinus, Palette } from 'lucide-react'

export interface ContextMenuOption {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  separator?: boolean
}

export interface ContextMenuProps {
  /** Posición del menú (x, y) */
  position: { x: number; y: number } | null
  /** Nodo seleccionado (si el menú es para un nodo) */
  node: Node | null
  /** Callback para cerrar el menú */
  onClose: () => void
  /** Callbacks para acciones */
  onEdit?: (nodeId: string) => void
  onToggleDisabled?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onCopy?: (nodeId: string) => void
  onCut?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onPaste?: () => void
  onInsertNode?: () => void
  onCreateGroup?: () => void
  onAddToGroup?: (nodeId: string) => void
  onRemoveFromGroup?: (nodeId: string) => void
  /** Callbacks específicos para grupos */
  onEditGroup?: (groupId: string) => void
  onChangeGroupColor?: (groupId: string) => void
  onDuplicateGroup?: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
  /** Si hay nodos en el clipboard para pegar */
  hasClipboard?: boolean
  /** Si el nodo está en un grupo */
  nodeInGroup?: boolean
}

export function ContextMenu({
  position,
  node,
  onClose,
  onEdit,
  onToggleDisabled,
  onDuplicate,
  onCopy,
  onCut,
  onDelete,
  onPaste,
  onInsertNode,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onEditGroup,
  onChangeGroupColor,
  onDuplicateGroup,
  onDeleteGroup,
  hasClipboard = false,
  nodeInGroup = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!position) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Agregar listeners después de un pequeño delay para evitar cerrar inmediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [position, onClose])

  if (!position) return null

  // Detectar si es un grupo
  const isGroup = node?.type === 'group'

  // Opciones específicas para grupos
  const groupOptions: ContextMenuOption[] = isGroup
    ? [
        {
          id: 'edit-group',
          label: 'Editar propiedades',
          icon: <Edit className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onEditGroup) onEditGroup(node.id)
            onClose()
          },
        },
        {
          id: 'change-color',
          label: 'Cambiar color',
          icon: <Palette className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onChangeGroupColor) onChangeGroupColor(node.id)
            onClose()
          },
        },
        { id: 'sep-group-1', label: '', separator: true },
        {
          id: 'duplicate-group',
          label: 'Duplicar grupo',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onDuplicateGroup) onDuplicateGroup(node.id)
            onClose()
          },
        },
        {
          id: 'copy-group',
          label: 'Copiar',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onCopy) onCopy(node.id)
            onClose()
          },
        },
        {
          id: 'cut-group',
          label: 'Cortar',
          icon: <Scissors className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onCut) onCut(node.id)
            onClose()
          },
        },
        { id: 'sep-group-2', label: '', separator: true },
        {
          id: 'delete-group',
          label: 'Eliminar grupo',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onDeleteGroup) onDeleteGroup(node.id)
            onClose()
          },
        },
      ]
    : []

  // Opciones para nodo normal
  const nodeOptions: ContextMenuOption[] = node && !isGroup
    ? [
        {
          id: 'edit',
          label: 'Editar propiedades',
          icon: <Edit className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onEdit) onEdit(node.id)
            onClose()
          },
        },
        {
          id: 'toggle-disabled',
          label: node.data?.nodeRedNode?.disabled ? 'Habilitar' : 'Deshabilitar',
          icon: node.data?.nodeRedNode?.disabled ? (
            <Power className="w-3.5 h-3.5" />
          ) : (
            <PowerOff className="w-3.5 h-3.5" />
          ),
          onClick: () => {
            if (onToggleDisabled) onToggleDisabled(node.id)
            onClose()
          },
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'duplicate',
          label: 'Duplicar',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onDuplicate) onDuplicate(node.id)
            onClose()
          },
        },
        {
          id: 'copy',
          label: 'Copiar',
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onCopy) onCopy(node.id)
            onClose()
          },
        },
        {
          id: 'cut',
          label: 'Cortar',
          icon: <Scissors className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onCut) onCut(node.id)
            onClose()
          },
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: nodeInGroup ? 'remove-from-group' : 'add-to-group',
          label: nodeInGroup ? 'Quitar de grupo' : 'Agregar a grupo',
          icon: nodeInGroup ? (
            <FolderMinus className="w-3.5 h-3.5" />
          ) : (
            <FolderPlus className="w-3.5 h-3.5" />
          ),
          onClick: () => {
            if (nodeInGroup && onRemoveFromGroup) {
              onRemoveFromGroup(node.id)
            } else if (!nodeInGroup && onAddToGroup) {
              onAddToGroup(node.id)
            }
            onClose()
          },
        },
        { id: 'sep3', label: '', separator: true },
        {
          id: 'delete',
          label: 'Eliminar',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          onClick: () => {
            if (onDelete) onDelete(node.id)
            onClose()
          },
        },
      ]
    : []

  // Opciones para canvas
  const canvasOptions: ContextMenuOption[] = [
    {
      id: 'paste',
      label: 'Pegar',
      icon: <Clipboard className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onPaste) onPaste()
        onClose()
      },
      disabled: !hasClipboard,
    },
    {
      id: 'insert-node',
      label: 'Insertar nodo',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onInsertNode) onInsertNode()
        onClose()
      },
    },
    { id: 'sep-canvas-1', label: '', separator: true },
    {
      id: 'create-group',
      label: 'Crear grupo',
      icon: <FolderPlus className="w-3.5 h-3.5" />,
      onClick: () => {
        if (onCreateGroup) onCreateGroup()
        onClose()
      },
    },
  ]

  const options = isGroup ? groupOptions : (node ? nodeOptions : canvasOptions)

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-bg-secondary border border-node-border rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {options.map((option) => {
        if (option.separator) {
          return (
            <div
              key={option.id}
              className="my-1 border-t border-node-border"
            />
          )
        }

        return (
          <button
            key={option.id}
            onClick={option.onClick}
            disabled={option.disabled}
            className={`
              w-full px-3 py-2 text-left text-xs font-medium
              flex items-center gap-2
              transition-colors duration-150
              ${
                option.disabled
                  ? 'text-text-tertiary cursor-not-allowed opacity-50'
                  : 'text-text-primary hover:bg-node-hover active:bg-node-selected'
              }
            `}
          >
            {option.icon && (
              <span className="flex-shrink-0 text-text-secondary">
                {option.icon}
              </span>
            )}
            <span className="flex-1">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

