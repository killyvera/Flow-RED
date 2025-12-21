/**
 * Componente GroupNode - Nodo de grupo compatible con React Flow
 * 
 * Representa un grupo de Node-RED como un nodo React Flow nativo.
 * Esto permite aprovechar todas las funcionalidades de React Flow:
 * - Posicionamiento automático
 * - Zoom y pan automáticos
 * - Arrastre nativo
 * - Selección y estados
 * 
 * Características:
 * - Fondo transparente con borde
 * - Header con botón de colapsar/expandir
 * - Redimensionable
 * - Los nodos hijos se posicionan dentro del grupo
 */

import { memo, useCallback, useEffect, useState, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NodeProps } from 'reactflow'
import { NodeResizeControl } from 'reactflow'
import { useGroupCollapse } from '@/canvas/groups/useGroupCollapse'
import type { NodeRedGroup } from '@/api/types'
import { useReactFlow } from 'reactflow'

// Ref global para marcar si estamos redimensionando un grupo
const isResizingGroupRef = { current: false }

export interface GroupNodeData {
  /** Información del grupo de Node-RED */
  group: NodeRedGroup
  /** Número de nodos dentro del grupo */
  nodesCount?: number
  /** Handler para redimensionar el grupo (opcional) */
  onResize?: (groupId: string, newWidth: number, newHeight: number) => void
  /** Si el grupo es redimensionable (por defecto true en modo edición) */
  resizable?: boolean
}

export type GroupNodeProps = NodeProps<GroupNodeData>

/**
 * Componente GroupNode
 * 
 * Renderiza un nodo de grupo con:
 * - Header con nombre y botón de colapsar/expandir
 * - Fondo transparente con borde
 * - Contador de nodos
 */
const GroupNodeComponent = ({ data, dragging, id }: GroupNodeProps) => {
  // useReactFlow debe llamarse siempre (no condicionalmente) - debe estar dentro del contexto
  // Si falla aquí, significa que el componente está fuera del ReactFlowProvider
  const reactFlowInstance = useReactFlow()
  const { setNodes, getNodes } = reactFlowInstance
  
  // Obtener el nodo completo para acceder a style.width y style.height
  const currentNode = getNodes().find(n => n.id === id)
  const nodeStyle = currentNode?.style
  
  // Validar que data exista (data ya es GroupNodeData, no el nodo completo)
  if (!data) {
    console.warn('[GroupNode] data no está definido', { data, id })
    return (
      <div className="group-node-error" style={{ padding: '10px', border: '1px solid red', minWidth: '200px', minHeight: '40px' }}>
        Error: Datos del grupo no disponibles
      </div>
    )
  }
  
  // data ya es GroupNodeData, acceder directamente a sus propiedades
  const { group, nodesCount = 0, onResize: onResizeHandler, resizable = true } = data
  
  // Validar que group exista
  if (!group?.id) {
    console.warn('[GroupNode] group no está definido', { group, id })
    return (
      <div className="group-node-error" style={{ padding: '10px', border: '1px solid red', minWidth: '200px', minHeight: '40px' }}>
        Error: Grupo no definido
      </div>
    )
  }
  
  // Usar hook para manejar el estado de colapso (sincronizado con el store)
  const [isCollapsed, setCollapsed] = useGroupCollapse(group.id)
  
  // Ref para guardar la posición inicial del nodo durante el resize
  // Esto nos permite mantener el nodo anclado en la esquina superior izquierda
  const resizeStartPositionRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  
  // Estado local para el tamaño del grupo (se actualiza durante el resize para feedback visual inmediato)
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null)
  
  // Ancho y alto del grupo
  // Durante el resize, usar el tamaño local para feedback visual inmediato
  // De lo contrario, usar el tamaño del nodo React Flow o del grupo
  const nodeWidth = nodeStyle?.width ? (typeof nodeStyle.width === 'number' ? nodeStyle.width : parseFloat(String(nodeStyle.width).replace('px', ''))) : null
  const nodeHeight = nodeStyle?.height ? (typeof nodeStyle.height === 'number' ? nodeStyle.height : parseFloat(String(nodeStyle.height).replace('px', ''))) : null
  const width = localSize?.width || nodeWidth || group.w || 300
  const height = isCollapsed ? 40 : (localSize?.height || nodeHeight || group.h || 200)
  
  // Sincronizar el tamaño local cuando cambia el grupo (pero no durante el resize)
  useEffect(() => {
    if (!isResizingGroupRef.current) {
      setLocalSize(null) // Resetear para usar el tamaño del grupo/nodo
    }
  }, [group.w, group.h])
  
  // Mantener el nodo como draggable: true
  // El control de si se puede arrastrar o no se hace en onNodeDragStart
  // basándose en si el click provino del header
  useEffect(() => {
    try {
      const nodes = getNodes()
      const currentNode = nodes.find(n => n.id === id)
      // Solo actualizar si el nodo existe y draggable no es true
      // Mantener draggable: true para que React Flow pueda capturar el evento
      // No actualizar durante el resize
      if (currentNode && currentNode.draggable !== true && !isResizingGroupRef.current) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === id ? { ...node, draggable: true } : node
          )
        )
      }
    } catch (error) {
      // Si hay un error, simplemente ignorarlo (puede ser que React Flow aún no esté listo)
      console.debug('[GroupNode] Error al establecer draggable:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]) // Ejecutar cuando cambia el id
  
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // setCollapsed ya maneja la actualización del store y localStorage
    setCollapsed(!isCollapsed)
  }, [isCollapsed, setCollapsed])
  
  // NodeResizer maneja todo el resize, no necesitamos handlers personalizados
  
  // Nombre del grupo
  const groupName = group.name || group.label || `Group ${group.id.slice(0, 8)}`
  
  // Color del grupo - siempre convertir a rgba con opacidad
  const getGroupColorWithOpacity = (color: string | undefined, opacity: number): string => {
    if (!color) {
      // Usar variable CSS para color de grupo por defecto
      // Extraer el color base de la variable CSS y aplicar opacidad
      return `var(--color-group-default)`
    }
    
    // Si el color ya es rgba, extraer RGB y aplicar nueva opacidad
    if (color.startsWith('rgba')) {
      const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/)
      if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10)
        const g = parseInt(rgbaMatch[2], 10)
        const b = parseInt(rgbaMatch[3], 10)
        return `rgba(${r}, ${g}, ${b}, ${opacity})`
      }
    }
    
    // Si es hex, convertir a RGB
    const rgb = hexToRgb(color)
    if (rgb) {
      return `rgba(${rgb.join(', ')}, ${opacity})`
    }
    
    // Fallback a variable CSS
    return `var(--color-group-default)`
  }
  
  // Color de fondo con opacidad baja (0.1)
  const groupColor = getGroupColorWithOpacity(group.color, 0.1)
  // Color de borde con opacidad media (0.3)
  const borderColor = getGroupColorWithOpacity(group.color, 0.3)
  // Color del título - usar el color del grupo con opacidad completa o más oscuro
  const titleColor = group.color 
    ? (() => {
        const rgb = hexToRgb(group.color)
        if (rgb) {
          // Hacer el color más oscuro para mejor contraste (reducir brillo en 20%)
          const darkerRgb = rgb.map(c => Math.max(0, c - 40))
          return `rgba(${darkerRgb.join(', ')}, 1)`
        }
        return undefined
      })()
    : undefined
  
  return (
    <>
      {/* NodeResizeControl con handle circular personalizado - solo visible en hover */}
      {resizable && !isCollapsed && (
        <NodeResizeControl
          style={{
            background: 'transparent',
            border: 'none',
          }}
          minWidth={150}
          minHeight={100}
          position="bottom-right"
          onResizeStart={() => {
            console.log('[GroupNode] NodeResizeControl onResizeStart')
            isResizingGroupRef.current = true
            ;(window as any).__isResizingGroup = true
            
            // Guardar la posición y tamaño inicial del nodo
            const nodes = getNodes()
            const currentNode = nodes.find(n => n.id === id)
            if (currentNode) {
              resizeStartPositionRef.current = {
                x: currentNode.position.x,
                y: currentNode.position.y,
                width: currentNode.width || group.w || 300,
                height: currentNode.height || group.h || 200,
              }
            }
            
            // Deshabilitar arrastre durante el resize
            setNodes((nds) =>
              nds.map((node) =>
                node.id === id ? { ...node, draggable: false } : node
              )
            )
          }}
          onResize={(_: any, params: { width: number; height: number }) => {
            if (!resizeStartPositionRef.current) return
            
            console.log('[GroupNode] NodeResizeControl onResize', { width: params.width, height: params.height })
            
            // Para bottom-right, el nodo debe mantener su posición superior izquierda
            // NodeResizeControl con position="bottom-right" mantiene automáticamente la esquina superior izquierda fija
            // Solo necesitamos actualizar el tamaño inmediatamente
            
            // Actualizar tamaño local para re-render inmediato del contenedor visual
            setLocalSize({ width: params.width, height: params.height })
            
            // Actualizar el nodo en React Flow inmediatamente (sin delay)
            // Asegurar que la posición se mantenga fija durante el resize
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === id && node.type === 'group') {
                  return {
                    ...node,
                    // Mantener la posición inicial durante el resize
                    position: resizeStartPositionRef.current ? {
                      x: resizeStartPositionRef.current.x,
                      y: resizeStartPositionRef.current.y,
                    } : node.position,
                    style: {
                      ...node.style,
                      width: params.width,
                      height: isCollapsed ? 40 : params.height,
                    },
                    data: {
                      ...node.data,
                      group: {
                        ...(node.data as GroupNodeData).group,
                        w: params.width,
                        h: params.height,
                      },
                    },
                  }
                }
                return node
              })
            )
            
            // También actualizamos el grupo en el store inmediatamente
            if (onResizeHandler) {
              onResizeHandler(group.id, params.width, params.height)
            }
          }}
          onResizeEnd={() => {
            console.log('[GroupNode] NodeResizeControl onResizeEnd')
            isResizingGroupRef.current = false
            ;(window as any).__isResizingGroup = false
            resizeStartPositionRef.current = null
            
            // Restaurar draggable inmediatamente (sin delay)
            setNodes((nds) =>
              nds.map((node) =>
                node.id === id ? { ...node, draggable: true } : node
              )
            )
          }}
        >
          {/* Handle circular personalizado - solo visible en hover */}
          <div
            className="group-resize-handle"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-primary)',
              border: '2px solid var(--color-bg-primary)',
              boxShadow: 'var(--shadow-node-hover)',
              cursor: 'nwse-resize',
              opacity: 0,
              transition: 'opacity 0.15s ease',
              transform: 'translate(50%, 50%)',
              zIndex: 10000,
              pointerEvents: 'auto',
            }}
            title="Redimensionar grupo (arrastra para escalar)"
          />
        </NodeResizeControl>
      )}
      
      {/* CSS para mostrar el handle en hover del grupo */}
      <style>{`
        [data-id="${id}"]:hover .group-resize-handle {
          opacity: 1 !important;
        }
        [data-id="${id}"] .group-resize-handle:hover {
          opacity: 1 !important;
        }
      `}</style>
      <div
        className="group-node group rounded-lg transition-all duration-200 relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          minHeight: '40px',
          backgroundColor: groupColor,
          border: `2px solid ${borderColor}`, // Borde con opacidad
          boxShadow: 'none', // Sin sombras - solo estilo visual
          cursor: dragging ? 'grabbing' : 'default',
          // Deshabilitar pointer events en el contenedor principal
          // Solo el header y el handler de resize tendrán pointer events
          pointerEvents: 'none',
          // Asegurar que el grupo esté detrás de los edges
          zIndex: 0,
        }}
      >
      {/* Header del grupo - ÁREA DE ARRASTRE */}
      <div
        className="group-header flex items-center gap-2 px-3 py-2 border-b border-current border-opacity-20"
        data-handle="true"
        style={{
          borderColor: borderColor,
          minHeight: '40px',
          // Habilitar pointer events solo en el header para permitir arrastre
          pointerEvents: 'auto',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => {
          // Solo marcar que el drag está permitido si el click provino del header (no del botón)
          const target = e.target as HTMLElement
          if (target.closest('button')) {
            // Si es el botón, no permitir drag
            return
          }
          
          // Marcar que el drag está permitido desde el header
          // Esto será verificado en onNodeDragStart
          ;(e.currentTarget as any).__allowDrag = true
        }}
      >
        {/* Botón de colapsar/expandir */}
        <button
          type="button"
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          onClick={handleToggleCollapse}
          onMouseDown={(e) => {
            // Prevenir que el nodo se arrastre cuando se hace click en el botón
            e.stopPropagation()
            e.preventDefault()
          }}
          aria-label={isCollapsed ? 'Expandir grupo' : 'Colapsar grupo'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          ) : (
            <ChevronDown className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
        
        {/* Nombre del grupo */}
        <span
          className="text-xs font-semibold flex-1 truncate"
          style={{
            color: titleColor || 'var(--color-text-primary)',
          }}
        >
          {groupName}
        </span>
        
        {/* Contador de nodos */}
        {!isCollapsed && (
          <span className="text-[10px] text-text-tertiary flex-shrink-0">
            {nodesCount} nodo{nodesCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {/* Contenido del grupo (oculto si está colapsado) */}
      {!isCollapsed && (
        <div 
          className="group-content w-full"
          style={{
            height: `${height - 40}px`,
            minHeight: '0px',
            // Mantener pointer events deshabilitados para que no interfiera con el arrastre
            pointerEvents: 'none',
          }}
        >
          {/* Los nodos hijos se renderizan dentro de este contenedor */}
          {/* Nota: Los nodos reales se renderizan por React Flow, este es solo el contenedor visual */}
        </div>
      )}
      
      {/* CSS para personalizar NodeResizer: ocultar todos los handles excepto el de la esquina inferior derecha */}
      {/* y estilizarlo como un círculo rojo */}
      <style>{`
        [data-id="${id}"] .react-flow__resize-control [data-handleid]:not([data-handleid="se"]) {
          display: none !important;
        }
        [data-id="${id}"] .react-flow__resize-control [data-handleid="se"] {
          width: 16px !important;
          height: 16px !important;
          border-radius: 50% !important;
          background-color: var(--color-accent-primary) !important;
          border: 2px solid var(--color-bg-primary) !important;
          box-shadow: var(--shadow-node-hover) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          cursor: nwse-resize !important;
        }
        [data-id="${id}"] .react-flow__resize-control-line {
          display: none !important;
        }
      `}</style>
      
    </div>
    </>
  )
}

// Wrapper con manejo de errores
export const GroupNode = memo((props: GroupNodeProps) => {
  try {
    return <GroupNodeComponent {...props} />
  } catch (error) {
    console.error('[GroupNode] Error al renderizar:', error)
    return (
      <div className="group-node-error" style={{ padding: '10px', border: '1px solid red', minWidth: '200px', minHeight: '40px' }}>
        Error al renderizar grupo
      </div>
    )
  }
})

GroupNode.displayName = 'GroupNode'

/**
 * Convierte un color hexadecimal a RGB
 * 
 * @param hex Color hexadecimal (ej: "#3b82f6" o "3b82f6")
 * @returns Array [r, g, b] o null si el formato es inválido
 */
function hexToRgb(hex: string): [number, number, number] | null {
  // Remover el # si existe
  const cleanHex = hex.replace('#', '')
  
  // Validar formato
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  return [r, g, b]
}
