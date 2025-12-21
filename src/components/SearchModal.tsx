/**
 * Modal de búsqueda de nodos
 * 
 * Permite buscar nodos por nombre, tipo o ID y navegar a ellos.
 * Se abre con Ctrl+K (Cmd+K en Mac).
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Search, ArrowRight } from 'lucide-react'
import type { Node } from 'reactflow'

export interface SearchResult {
  node: Node
  matchType: 'name' | 'type' | 'id'
  matchText: string
}

export interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  nodes: Node[]
  onJumpToNode: (nodeId: string) => void
}

export function SearchModal({
  isOpen,
  onClose,
  nodes,
  onJumpToNode,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filtrar resultados basado en la query
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      return []
    }

    const lowerQuery = query.toLowerCase()
    const matches: SearchResult[] = []

    nodes.forEach(node => {
      const nodeName = node.data?.label || node.data?.nodeRedNode?.name || ''
      const nodeType = node.data?.nodeRedType || node.type || ''
      const nodeId = node.id

      // Buscar por nombre
      if (nodeName.toLowerCase().includes(lowerQuery)) {
        matches.push({
          node,
          matchType: 'name',
          matchText: nodeName,
        })
        return
      }

      // Buscar por tipo
      if (nodeType.toLowerCase().includes(lowerQuery)) {
        matches.push({
          node,
          matchType: 'type',
          matchText: nodeType,
        })
        return
      }

      // Buscar por ID
      if (nodeId.toLowerCase().includes(lowerQuery)) {
        matches.push({
          node,
          matchType: 'id',
          matchText: nodeId,
        })
      }
    })

    // Ordenar: nombre primero, luego tipo, luego ID
    matches.sort((a, b) => {
      if (a.matchType === 'name' && b.matchType !== 'name') return -1
      if (a.matchType !== 'name' && b.matchType === 'name') return 1
      if (a.matchType === 'type' && b.matchType === 'id') return -1
      if (a.matchType === 'id' && b.matchType === 'type') return 1
      return a.matchText.localeCompare(b.matchText)
    })

    return matches.slice(0, 20) // Limitar a 20 resultados
  }, [query, nodes])

  // Resetear índice seleccionado cuando cambian los resultados
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length])

  // Manejar navegación con teclado
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        const selected = results[selectedIndex]
        if (selected) {
          onJumpToNode(selected.node.id)
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onJumpToNode, onClose])

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen) {
      const input = document.getElementById('search-input')
      if (input) {
        setTimeout(() => input.focus(), 100)
      }
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const handleResultClick = useCallback((nodeId: string) => {
    onJumpToNode(nodeId)
    onClose()
  }, [onJumpToNode, onClose])

  if (!isOpen) {
    return null
  }

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) {
      return text
    }

    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) {
      return text
    }

    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)

    return (
      <>
        {before}
        <span className="bg-accent-primary/30 font-semibold">{match}</span>
        {after}
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-primary border border-node-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-node-border">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Buscar nodos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-node-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-node-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, tipo o ID..."
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-node-border rounded-md text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
            />
          </div>
          {query && (
            <p className="text-xs text-text-tertiary mt-2">
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {query && results.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              <p>No se encontraron nodos</p>
            </div>
          )}

          {!query && (
            <div className="text-center py-8 text-text-secondary">
              <p>Escribe para buscar nodos por nombre, tipo o ID</p>
              <p className="text-xs mt-2 text-text-tertiary">
                Usa ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((result, index) => {
                const isSelected = index === selectedIndex
                const nodeName = result.node.data?.label || result.node.data?.nodeRedNode?.name || 'Sin nombre'
                const nodeType = result.node.data?.nodeRedType || result.node.type || 'unknown'
                const nodeId = result.node.id

                return (
                  <button
                    key={result.node.id}
                    onClick={() => handleResultClick(result.node.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-accent-primary/20 border border-accent-primary'
                        : 'hover:bg-node-hover border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {highlightMatch(nodeName, query)}
                        </span>
                        <span className="text-xs text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
                          {result.matchType === 'name' ? 'nombre' : result.matchType === 'type' ? 'tipo' : 'ID'}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {nodeType} • {nodeId.slice(0, 8)}...
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

