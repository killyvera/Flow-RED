/**
 * Componente de Paleta de Nodos
 * 
 * Muestra una lista de nodos disponibles que se pueden arrastrar al canvas.
 * Incluye búsqueda, categorías y drag & drop.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { getAvailableNodes } from '@/api/client'
import { getNodeIcon } from '@/utils/nodeIcons'

/**
 * Lista de nodos comunes de Node-RED como fallback
 * cuando la API no está disponible
 */
function getDefaultNodes(): Array<{
  id: string
  type: string
  name: string
  category?: string
  module: string
  enabled: boolean
}> {
  return [
    // Layout nodes
    { id: 'group', type: 'group', name: 'Group', category: 'layout', module: 'node-red', enabled: true },
    
    // Input nodes
    { id: 'inject', type: 'inject', name: 'Inject', category: 'input', module: 'node-red', enabled: true },
    { id: 'catch', type: 'catch', name: 'Catch', category: 'input', module: 'node-red', enabled: true },
    { id: 'status', type: 'status', name: 'Status', category: 'input', module: 'node-red', enabled: true },
    
    // Output nodes
    { id: 'debug', type: 'debug', name: 'Debug', category: 'output', module: 'node-red', enabled: true },
    { id: 'complete', type: 'complete', name: 'Complete', category: 'output', module: 'node-red', enabled: true },
    
    // Function nodes
    { id: 'function', type: 'function', name: 'Function', category: 'function', module: 'node-red', enabled: true },
    { id: 'switch', type: 'switch', name: 'Switch', category: 'function', module: 'node-red', enabled: true },
    { id: 'change', type: 'change', name: 'Change', category: 'function', module: 'node-red', enabled: true },
    { id: 'template', type: 'template', name: 'Template', category: 'function', module: 'node-red', enabled: true },
    
    // Network nodes
    { id: 'http in', type: 'http in', name: 'HTTP In', category: 'network', module: 'node-red', enabled: true },
    { id: 'http out', type: 'http out', name: 'HTTP Out', category: 'network', module: 'node-red', enabled: true },
    { id: 'mqtt in', type: 'mqtt in', name: 'MQTT In', category: 'network', module: 'node-red', enabled: true },
    { id: 'mqtt out', type: 'mqtt out', name: 'MQTT Out', category: 'network', module: 'node-red', enabled: true },
    
    // Sequence nodes
    { id: 'delay', type: 'delay', name: 'Delay', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'trigger', type: 'trigger', name: 'Trigger', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'join', type: 'join', name: 'Join', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'split', type: 'split', name: 'Split', category: 'sequence', module: 'node-red', enabled: true },
    
    // Parser nodes
    { id: 'json', type: 'json', name: 'JSON', category: 'parser', module: 'node-red', enabled: true },
    { id: 'xml', type: 'xml', name: 'XML', category: 'parser', module: 'node-red', enabled: true },
    { id: 'csv', type: 'csv', name: 'CSV', category: 'parser', module: 'node-red', enabled: true },
    { id: 'html', type: 'html', name: 'HTML', category: 'parser', module: 'node-red', enabled: true },
  ]
}

export interface NodePaletteProps {
  isOpen: boolean
  onClose: () => void
  onNodeDragStart?: (nodeType: string, event: React.DragEvent) => void
  onNodeClick?: (nodeType: string) => void
}

export function NodePalette({ isOpen, onClose, onNodeDragStart, onNodeClick }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [nodes, setNodes] = useState<Array<{
    id: string
    type: string
    name: string
    category?: string
    module: string
    enabled: boolean
  }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false) // Ref para evitar cargas duplicadas

  // Cargar nodos disponibles (solo una vez cuando se abre)
  useEffect(() => {
    if (isOpen && nodes.length === 0 && !isLoading && !hasLoadedRef.current) {
      hasLoadedRef.current = true // Marcar como cargado
      setIsLoading(true)
      setError(null)
      
      console.log('🔄 Iniciando carga de nodos para la paleta...')
      
      // Intentar cargar desde la API primero
      getAvailableNodes()
        .then((availableNodes) => {
          
          if (availableNodes.length > 0) {
            console.log('✅ Nodos cargados desde la API:', availableNodes.length)
            
            // Verificar si "group" está en los nodos de la API
            const hasGroup = availableNodes.some(n => n.type === 'group')
            console.log('🔍 ¿Grupo está en nodos de API?', hasGroup)
            
            // Agregar "group" si no está presente (los grupos son especiales y pueden no estar en /nodes)
            if (!hasGroup) {
              console.log('➕ Agregando "group" a la lista de nodos disponibles')
              const groupNode = {
                id: 'group',
                type: 'group',
                name: 'Group',
                category: 'layout',
                module: 'node-red',
                enabled: true,
              }
              availableNodes.unshift(groupNode) // Agregar al inicio
            }
            
            setNodes(availableNodes)
          } else {
            // Si no hay nodos disponibles desde la API, usar lista hardcodeada
            console.log('⚠️ No hay nodos desde la API, usando lista por defecto')
            const defaultNodes = getDefaultNodes()
            console.log('📦 Nodos por defecto cargados:', defaultNodes.length)
            setNodes(defaultNodes)
          }
        })
        .catch((err) => {
          // En caso de error, usar lista hardcodeada
          console.warn('⚠️ Error al cargar nodos desde la API, usando lista por defecto:', err.message)
          const defaultNodes = getDefaultNodes()
          console.log('📦 Nodos por defecto cargados:', defaultNodes.length)
          setNodes(defaultNodes)
        })
        .finally(() => setIsLoading(false))
    }
    
    // Resetear el ref cuando se cierra la paleta
    if (!isOpen) {
      hasLoadedRef.current = false
    }
  }, [isOpen, nodes.length, isLoading]) // Incluir dependencias necesarias

  // Filtrar nodos por búsqueda
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes
    
    const query = searchQuery.toLowerCase()
    return nodes.filter(node => 
      node.type.toLowerCase().includes(query) ||
      node.name.toLowerCase().includes(query) ||
      (node.category && node.category.toLowerCase().includes(query))
    )
  }, [nodes, searchQuery])

  // Agrupar nodos por categoría
  const nodesByCategory = useMemo(() => {
    const grouped: Record<string, typeof nodes> = {}
    filteredNodes.forEach(node => {
      const category = node.category || 'Otros'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(node)
    })
    return grouped
  }, [filteredNodes])

  if (!isOpen) return null

  return (
    <div className="absolute left-0 top-0 bottom-0 w-64 bg-bg-primary border-r border-node-border shadow-lg z-50 flex flex-col">
          {/* Header - más compacto estilo n8n */}
          <div className="p-3 border-b border-node-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Paleta de Nodos</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-1"
              aria-label="Cerrar paleta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Búsqueda - más compacto */}
          <div className="p-3 border-b border-node-border">
            <input
              type="text"
              placeholder="Buscar nodos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            />
          </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-3 text-center text-text-secondary text-xs">
            Cargando nodos...
          </div>
        )}

        {error && (
          <div className="p-3 text-center text-status-error text-xs">
            {error}
          </div>
        )}

        {!isLoading && !error && Object.keys(nodesByCategory).length === 0 && (
          <div className="p-3 text-center text-text-secondary text-xs">
            No se encontraron nodos
          </div>
        )}

        {!isLoading && !error && Object.entries(nodesByCategory).map(([category, categoryNodes]) => (
          <div key={category} className="mb-4">
            <div className="px-3 py-1.5 bg-bg-secondary text-[10px] font-semibold text-text-secondary uppercase">
              {category}
            </div>
            <div className="space-y-1">
              {categoryNodes.map((node, index) => (
                <div
                  key={`${node.type}-${category}-${index}`}
                  draggable
                  onDragStart={(e) => {
                    if (onNodeDragStart) {
                      onNodeDragStart(node.type, e)
                    } else {
                      // Default: pasar el tipo de nodo en dataTransfer
                      e.dataTransfer.setData('application/reactflow', node.type)
                      e.dataTransfer.effectAllowed = 'move'
                    }
                  }}
                  onClick={() => {
                    if (onNodeClick) {
                      onNodeClick(node.type)
                    }
                  }}
                  className="px-3 py-1.5 hover:bg-node-hover cursor-pointer transition-colors flex items-center gap-2"
                >
                  {(() => {
                    const IconComponent = getNodeIcon(node.type)
                    return (
                      <IconComponent 
                        className="w-4 h-4 text-text-primary flex-shrink-0" 
                        strokeWidth={2}
                      />
                    )
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {node.name || node.type}
                    </div>
                    {node.name !== node.type && (
                      <div className="text-[10px] text-text-tertiary truncate">
                        {node.type}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

