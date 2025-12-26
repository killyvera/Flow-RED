/**
 * Hook para manejar atajos de teclado
 * 
 * Implementa atajos estándar de editores:
 * - Ctrl/Cmd+C: Copiar
 * - Ctrl/Cmd+V: Pegar
 * - Ctrl/Cmd+X: Cortar
 * - Ctrl/Cmd+A: Seleccionar todo
 * - Ctrl/Cmd+Z: Undo (requiere sistema de historial)
 * - Ctrl/Cmd+Y o Ctrl/Cmd+Shift+Z: Redo
 * - Escape: Deseleccionar todo
 * - Delete/Backspace: Eliminar (ya implementado en CanvasPage)
 */

import { useEffect, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { copyToClipboard, pasteFromClipboard, hasClipboardData } from './clipboard'

export interface KeyboardShortcutsHandlers {
  /** Nodos seleccionados */
  selectedNodes: Node[]
  /** Edges seleccionados */
  selectedEdges: Edge[]
  /** Todos los nodos */
  allNodes: Node[]
  /** Todos los edges */
  allEdges: Edge[]
  /** Callback para actualizar nodos */
  onNodesChange: (nodes: Node[]) => void
  /** Callback para actualizar edges */
  onEdgesChange: (edges: Edge[]) => void
  /** Callback para seleccionar todos los nodos */
  onSelectAll?: () => void
  /** Callback para deseleccionar todo */
  onDeselectAll?: () => void
  /** Callback para eliminar nodos/edges seleccionados */
  onDelete?: (nodeIds: string[], edgeIds: string[]) => void
  /** Si está en modo edición */
  isEditMode?: boolean
  /** Callback para actualizar estado de clipboard (para UI) */
  onClipboardChange?: (hasData: boolean) => void
}

/**
 * Hook para manejar atajos de teclado
 */
export function useKeyboardShortcuts({
  selectedNodes,
  selectedEdges,
  allNodes,
  allEdges,
  onNodesChange,
  onEdgesChange,
  onSelectAll,
  onDeselectAll,
  onDelete,
  isEditMode = false,
  onClipboardChange,
}: KeyboardShortcutsHandlers) {
  // Detectar si es Mac (para usar Cmd en lugar de Ctrl)
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // Función para verificar si se presionó Ctrl/Cmd
  const isModifierKey = useCallback((event: KeyboardEvent): boolean => {
    return isMac ? event.metaKey : event.ctrlKey
  }, [isMac])

  // Copiar nodos y edges seleccionados
  const handleCopy = useCallback(() => {
    if (!isEditMode || selectedNodes.length === 0) return

    // Obtener edges conectados a los nodos seleccionados
    const nodeIds = new Set(selectedNodes.map(n => n.id))
    const connectedEdges = allEdges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )

    copyToClipboard(selectedNodes, connectedEdges)
    if (onClipboardChange) {
      onClipboardChange(true)
    }
  }, [isEditMode, selectedNodes, allEdges, onClipboardChange])

  // Cortar nodos y edges seleccionados (copiar y eliminar)
  const handleCut = useCallback(() => {
    if (!isEditMode || selectedNodes.length === 0) return

    handleCopy()

    // Eliminar nodos y edges seleccionados
    if (onDelete) {
      const nodeIds = selectedNodes.map(n => n.id)
      const edgeIds = selectedEdges.map(e => e.id)
      onDelete(nodeIds, edgeIds)
    }
  }, [isEditMode, selectedNodes, selectedEdges, handleCopy, onDelete])

  // Pegar nodos y edges desde el clipboard
  const handlePaste = useCallback(() => {
    if (!isEditMode) return

    const pasted = pasteFromClipboard(50, 50)
    if (pasted) {
      const updatedNodes = [...allNodes, ...pasted.nodes]
      const updatedEdges = [...allEdges, ...pasted.edges]
      onNodesChange(updatedNodes)
      onEdgesChange(updatedEdges)
    }
  }, [isEditMode, allNodes, allEdges, onNodesChange, onEdgesChange])

  // Seleccionar todos los nodos
  const handleSelectAll = useCallback(() => {
    if (!isEditMode || !onSelectAll) return
    onSelectAll()
  }, [isEditMode, onSelectAll])

  // Deseleccionar todo
  const handleDeselectAll = useCallback(() => {
    if (!onDeselectAll) return
    onDeselectAll()
  }, [onDeselectAll])

  // Manejar eventos de teclado
  useEffect(() => {
    if (!isEditMode) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si se está escribiendo en un input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const modifier = isModifierKey(event)

      // Ctrl/Cmd+C: Copiar
      if (modifier && event.key === 'c' && !event.shiftKey) {
        event.preventDefault()
        handleCopy()
        return
      }

      // Ctrl/Cmd+V: Pegar
      if (modifier && event.key === 'v' && !event.shiftKey) {
        event.preventDefault()
        handlePaste()
        return
      }

      // Ctrl/Cmd+X: Cortar
      if (modifier && event.key === 'x' && !event.shiftKey) {
        event.preventDefault()
        handleCut()
        return
      }

      // Ctrl/Cmd+A: Seleccionar todo
      if (modifier && event.key === 'a' && !event.shiftKey) {
        event.preventDefault()
        handleSelectAll()
        return
      }

      // Escape: Deseleccionar todo
      if (event.key === 'Escape') {
        event.preventDefault()
        handleDeselectAll()
        return
      }

      // Delete/Backspace ya está manejado en CanvasPage
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isEditMode,
    isModifierKey,
    handleCopy,
    handleCut,
    handlePaste,
    handleSelectAll,
    handleDeselectAll,
  ])

  // Verificar estado del clipboard al montar y cuando cambian los nodos
  useEffect(() => {
    if (onClipboardChange) {
      onClipboardChange(hasClipboardData())
    }
  }, [onClipboardChange, allNodes.length])
}

