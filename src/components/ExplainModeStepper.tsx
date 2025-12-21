/**
 * ExplainModeStepper - Componente de navegación para Explain Mode
 * 
 * Permite navegar por los nodos en orden de ejecución (triggers primero, luego downstream)
 * con botones Next/Previous y highlight del nodo actual.
 */

import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'
import { isTriggerNode } from '@/utils/executionFrameManager'

/**
 * Calcula el orden de ejecución de los nodos usando BFS desde los triggers
 */
function calculateExecutionOrder(nodes: any[], edges: any[]): string[] {
  // Encontrar nodos trigger (sin inputs)
  const triggerNodes = nodes.filter(node => {
    const hasInputs = edges.some(edge => edge.target === node.id)
    const nodeType = node.data?.nodeRedType || node.type || ''
    return !hasInputs || isTriggerNode(nodeType)
  })

  if (triggerNodes.length === 0) {
    // Si no hay triggers, usar el primer nodo
    return nodes.length > 0 ? [nodes[0].id] : []
  }

  // BFS desde cada trigger
  const visited = new Set<string>()
  const order: string[] = []
  const queue: string[] = []

  // Agregar todos los triggers a la cola
  triggerNodes.forEach(node => {
    if (!visited.has(node.id)) {
      queue.push(node.id)
      visited.add(node.id)
      order.push(node.id)
    }
  })

  // BFS
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!
    
    // Encontrar nodos downstream (targets de edges que salen de este nodo)
    const downstreamEdges = edges.filter(edge => edge.source === currentNodeId)
    downstreamEdges.forEach(edge => {
      if (!visited.has(edge.target)) {
        visited.add(edge.target)
        order.push(edge.target)
        queue.push(edge.target)
      }
    })
  }

  // Agregar nodos no visitados al final
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      order.push(node.id)
    }
  })

  return order
}

export function ExplainModeStepper() {
  const explainMode = useCanvasStore((state) => state.explainMode)
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId)
  const toggleExplainMode = useCanvasStore((state) => state.toggleExplainMode)

  // Calcular orden de ejecución
  const executionOrder = useMemo(() => {
    return calculateExecutionOrder(nodes, edges)
  }, [nodes, edges])

  // Estado del índice actual
  const [currentIndex, setCurrentIndex] = useState(0)

  // Actualizar nodo seleccionado cuando cambia el índice
  useEffect(() => {
    if (executionOrder.length > 0 && currentIndex < executionOrder.length) {
      const currentNodeId = executionOrder[currentIndex]
      setSelectedNodeId(currentNodeId)
    }
  }, [currentIndex, executionOrder, setSelectedNodeId])

  // Resetear índice cuando cambia explainMode
  useEffect(() => {
    if (explainMode) {
      setCurrentIndex(0)
    }
  }, [explainMode])

  // Si explainMode está desactivado, no mostrar
  if (!explainMode || executionOrder.length === 0) {
    return null
  }

  const currentNodeId = executionOrder[currentIndex]
  const currentNode = nodes.find(n => n.id === currentNodeId)
  const currentNodeName = currentNode?.data?.label || currentNode?.data?.nodeRedType || 'Node'

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < executionOrder.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleExit = () => {
    toggleExplainMode()
    setSelectedNodeId(null)
  }

  // Navegación con teclado
  useEffect(() => {
    if (!explainMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleExit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [explainMode, currentIndex, executionOrder.length])

  return (
    <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-bg-secondary border border-node-border rounded-lg shadow-lg px-4 py-2 z-40 flex items-center gap-4">
      {/* Botón Previous */}
      <button
        onClick={handlePrevious}
        disabled={currentIndex === 0}
        className="p-1.5 rounded hover:bg-node-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        title="Previous node (←)"
      >
        <ChevronLeft className="w-4 h-4 text-text-primary" />
      </button>

      {/* Información del nodo actual */}
      <div className="text-center min-w-[200px]">
        <p className="text-xs text-text-secondary">
          {currentIndex + 1} of {executionOrder.length}
        </p>
        <p className="text-sm font-medium text-text-primary truncate">
          {currentNodeName}
        </p>
      </div>

      {/* Botón Next */}
      <button
        onClick={handleNext}
        disabled={currentIndex === executionOrder.length - 1}
        className="p-1.5 rounded hover:bg-node-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        title="Next node (→)"
      >
        <ChevronRight className="w-4 h-4 text-text-primary" />
      </button>

      {/* Separador */}
      <div className="w-px h-6 bg-node-border" />

      {/* Botón Exit */}
      <button
        onClick={handleExit}
        className="px-3 py-1.5 text-xs bg-status-error/10 hover:bg-status-error/20 text-status-error rounded transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        title="Exit Explain Mode (Esc)"
      >
        <X className="w-3 h-3" />
        <span>Exit</span>
      </button>
    </div>
  )
}

