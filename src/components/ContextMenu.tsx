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
import type { Node } from '@xyflow/react'
import { Edit, Copy, Scissors, Trash2, Power, PowerOff, Plus, Clipboard, FolderPlus, FolderMinus, Palette, Workflow, ArrowRight } from 'lucide-react'
import { isSubflowInstance } from '@/utils/subflowUtils'
import { isLinkIn, isLinkOut, findLinkOutTargets, findLinkInTargets } from '@/utils/linkUtils'

export interface ContextMenuOption {
  id: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
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
  /** Callback para abrir subflow */
  onOpenSubflow?: (subflowId: string) => void
  /** Callback para navegar a nodo link conectado */
  onNavigateToLink?: (nodeId: string) => void
  /** Todos los nodos (para encontrar links conectados) */
  allNodes?: any[]
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
  onOpenSubflow,
  onNavigateToLink,
  allNodes = [],
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!position) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement | null)) {
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
  
  // Detectar si es un subflow
  const isSubflow = node?.type === 'subflow' || (node?.data?.nodeRedNode && isSubflowInstance(node.data.nodeRedNode))
  
  // Detectar si es un link node y encontrar targets
  const isLink = node?.data?.nodeRedNode && (isLinkIn(node.data.nodeRedNode) || isLinkOut(node.data.nodeRedNode))
  const linkTargets = isLink && node?.data?.nodeRedNode && allNodes.length > 0
    ? (isLinkIn(node.data.nodeRedNode)
        ? findLinkOutTargets(node.data.nodeRedNode, allNodes.map(n => n.data?.nodeRedNode).filter(Boolean))
        : findLinkInTargets(node.data.nodeRedNode, allNodes.map(n => n.data?.nodeRedNode).filter(Boolean))
      )
    : []

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
        // Opción para abrir subflow
        ...(isSubflow && onOpenSubflow && node.data?.nodeRedNode
          ? [{
              id: 'open-subflow',
              label: 'Abrir subflow',
              icon: <Workflow className="w-3.5 h-3.5" />,
              onClick: () => {
                const subflowId = node.data.nodeRedNode.type.replace('subflow:', '')
                if (onOpenSubflow) onOpenSubflow(subflowId)
                onClose()
              },
            }]
          : []),
        // Opciones de navegación para link nodes
        ...(isLink && linkTargets.length > 0 && onNavigateToLink
          ? linkTargets.slice(0, 5).map((target, index) => ({
              id: `navigate-link-${index}`,
              label: `Ir a ${target.name || target.id.slice(0, 8)}`,
              icon: <ArrowRight className="w-3.5 h-3.5" />,
              onClick: () => {
                // Encontrar el nodo React Flow correspondiente
                const targetNode = allNodes.find(n => n.data?.nodeRedNode?.id === target.id)
                if (targetNode && onNavigateToLink) {
                  onNavigateToLink(targetNode.id)
                }
                onClose()
              },
            }))
          : []),
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
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
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

