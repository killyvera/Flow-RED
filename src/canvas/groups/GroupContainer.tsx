/**
 * Componente visual para renderizar grupos de Node-RED
 * 
 * Renderiza un contenedor visual con fondo, borde y label que agrupa
 * nodos relacionados. Soporta colapsar/expandir para mejorar la legibilidad.
 * 
 * IMPORTANTE: Este componente debe renderizarse dentro del contexto de ReactFlow
 * para que useReactFlow funcione correctamente.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useReactFlow } from 'reactflow'
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow'
import type { NodeRedGroup } from '@/api/types'
import { useGroupCollapse } from './useGroupCollapse'

export interface GroupContainerProps {
  /** Grupo de Node-RED */
  group: NodeRedGroup
  /** Nodos que pertenecen a este grupo */
  nodes: ReactFlowNode[]
  /** Edges que conectan nodos dentro del grupo */
  edges: ReactFlowEdge[]
  /** Si el grupo está colapsado */
  isCollapsed?: boolean
  /** Callback cuando se cambia el estado de colapso */
  onToggleCollapse?: (groupId: string) => void
  /** Callback cuando se redimensiona el grupo */
  onResize?: (groupId: string, width: number, height: number) => void
  /** Callback cuando se mueve el grupo */
  onMove?: (groupId: string, x: number, y: number) => void
  /** Si el grupo se puede redimensionar (solo en modo edición) */
  resizable?: boolean
  /** Si el grupo se puede mover (solo en modo edición) */
  draggable?: boolean
}

export function GroupContainer({
  group,
  nodes,
  edges: _edges,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  onResize,
  onMove,
  resizable = false,
  draggable = false,
}: GroupContainerProps) {
  // Usar hook de React Flow para obtener transformaciones del viewport
  const { flowToScreenPosition, getViewport } = useReactFlow()
  
  // Usar hook interno si no se proporciona estado externo
  const [internalCollapsed, setInternalCollapsed] = useGroupCollapse(group.id)
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  // Estado para redimensionamiento
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  
  // Estado para arrastre
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(group.id)
    } else {
      setInternalCollapsed(!isCollapsed)
    }
  }

  // Calcular dimensiones del grupo
  const width = group.w || 200
  const height = group.h || 200
  const x = group.x || 0
  const y = group.y || 0
  
  // Calcular posición en pantalla usando useMemo para optimizar
  const screenPosition = useMemo(() => {
    try {
      // Usar flowToScreenPosition en lugar de project (deprecado)
      const projected = flowToScreenPosition({ x, y })
      return projected
    } catch (e) {
      console.debug('Error al proyectar posición del grupo:', e)
      return { x, y }
    }
  }, [x, y, flowToScreenPosition, getViewport, group.id])
  
  // Actualizar posición cuando cambia el viewport
  const [currentScreenPosition, setCurrentScreenPosition] = useState(screenPosition)
  
  useEffect(() => {
    setCurrentScreenPosition(screenPosition)
  }, [screenPosition])
  
  // Escuchar cambios en el viewport
  useEffect(() => {
    let animationFrameId: number
    let lastViewport = getViewport()
    
    const updatePosition = () => {
      try {
        const currentViewport = getViewport()
        
        // Solo actualizar si el viewport cambió significativamente
        if (
          Math.abs(currentViewport.x - lastViewport.x) > 0.1 ||
          Math.abs(currentViewport.y - lastViewport.y) > 0.1 ||
          Math.abs(currentViewport.zoom - lastViewport.zoom) > 0.001
        ) {
          // Usar flowToScreenPosition en lugar de project (deprecado)
          const projected = flowToScreenPosition({ x, y })
          setCurrentScreenPosition(projected)
          lastViewport = currentViewport
        }
        
        // Continuar escuchando cambios
        animationFrameId = requestAnimationFrame(updatePosition)
      } catch (e) {
        console.debug('Error al actualizar posición del grupo:', e)
      }
    }
    
    // Iniciar el loop de actualización
    animationFrameId = requestAnimationFrame(updatePosition)
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [x, y, flowToScreenPosition, getViewport])

  // Handlers para arrastre
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!draggable || isResizing) return
    
    // Solo arrastrar desde el header del grupo
    const target = e.target as HTMLElement
    if (!target.closest('.group-header') || target.closest('button')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    // Obtener posición actual del grupo en coordenadas del flow
    const currentFlowPos = { x, y }
    
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      flowX: currentFlowPos.x,
      flowY: currentFlowPos.y,
    })
  }, [draggable, isResizing, x, y, group.id, getViewport])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart || !onMove) return

    // Calcular delta en píxeles de pantalla
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    // Convertir delta de pantalla a coordenadas del flow usando el viewport
    const viewport = getViewport()
    // El delta en pantalla debe dividirse por el zoom para obtener el delta en coordenadas del flow
    const flowDeltaX = deltaX / viewport.zoom
    const flowDeltaY = deltaY / viewport.zoom
    
    // Calcular nueva posición en coordenadas del flow
    const newFlowX = dragStart.flowX + flowDeltaX
    const newFlowY = dragStart.flowY + flowDeltaY
    
    
    // Actualizar posición del grupo
    onMove(group.id, newFlowX, newFlowY)
  }, [isDragging, dragStart, onMove, getViewport, group.id])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  // Efecto para manejar el arrastre
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      return () => {
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Handlers para redimensionamiento
  const handleResizeStart = useCallback((e: React.MouseEvent, _handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's') => {
    if (!resizable || isCollapsed || isDragging) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width,
      height,
    })
  }, [resizable, isCollapsed, isDragging, width, height])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStart || !onResize) return

    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y

    // Calcular nuevo tamaño (mínimo 150x100)
    const newWidth = Math.max(150, resizeStart.width + deltaX)
    const newHeight = Math.max(100, resizeStart.height + deltaY)

    onResize(group.id, newWidth, newHeight)
  }, [isResizing, resizeStart, onResize, group.id])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeStart(null)
  }, [])

  // Efecto para manejar el arrastre de redimensionamiento
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Color del grupo (si está definido)
  const groupColor = group.color || 'var(--color-group-default, rgba(59, 130, 246, 0.1))'
  const borderColor = group.color 
    ? `rgba(${hexToRgb(group.color)?.join(', ') || '59, 130, 246'}, 0.3)`
    : 'var(--color-group-border, rgba(59, 130, 246, 0.3))'

  // Nombre del grupo
  const groupName = group.name || group.label || `Group ${group.id.slice(0, 8)}`


  return (
    <div
      className="react-flow__node-group"
      style={{
        position: 'absolute',
        left: `${currentScreenPosition.x}px`,
        top: `${currentScreenPosition.y}px`,
        width: `${width}px`,
        height: isCollapsed ? 'auto' : `${height}px`,
        minHeight: isCollapsed ? '40px' : `${height}px`,
        zIndex: 1,
        pointerEvents: 'none', // Contenedor externo sin eventos
      }}
    >
      {/* Contenedor del grupo */}
      <div
        className="group rounded-lg border-2"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: groupColor,
          borderColor: borderColor,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          cursor: draggable && !isResizing ? 'move' : 'default',
          pointerEvents: 'auto', // Solo el contenedor interno tiene eventos
        }}
      >
        {/* Header del grupo */}
        <div
          className="group-header flex items-center gap-2 px-3 py-2 border-b border-current border-opacity-20 hover:bg-opacity-20 transition-colors"
          style={{
            borderColor: borderColor,
            cursor: draggable && !isResizing ? 'move' : 'pointer',
          }}
          onMouseDown={(e) => {
            // Solo iniciar arrastre si es draggable y no se está haciendo click en el botón
            const target = e.target as HTMLElement
            if (draggable && !target.closest('button')) {
              handleDragStart(e)
            }
          }}
          onClick={(e) => {
            // Solo colapsar si no se está arrastrando, no es draggable, y no se hizo click en el botón
            const target = e.target as HTMLElement
            if (!isDragging && !draggable && !target.closest('button')) {
              handleToggleCollapse()
            }
          }}
        >
          {/* Icono de colapsar/expandir */}
          <button
            type="button"
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label={isCollapsed ? 'Expandir grupo' : 'Colapsar grupo'}
            onMouseDown={(e) => {
              // Prevenir que el arrastre se active cuando se hace click en el botón
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleToggleCollapse()
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          {/* Nombre del grupo */}
          <span
            className="text-xs font-semibold text-text-primary flex-1 truncate"
            style={{
              color: group.color ? `rgba(${hexToRgb(group.color)?.join(', ') || '59, 130, 246'}, 1)` : undefined,
            }}
          >
            {groupName}
          </span>

          {/* Contador de nodos */}
          {!isCollapsed && (
            <span className="text-[10px] text-text-tertiary flex-shrink-0">
              {nodes.length} nodo{nodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Contenido del grupo (nodos) - oculto si está colapsado */}
        {!isCollapsed && (
          <div className="relative w-full h-full" style={{ minHeight: `${height - 40}px` }}>
            {/* Los nodos se renderizan dentro de este contenedor */}
            {/* Nota: Los nodos reales se renderizan por React Flow, este es solo el contenedor visual */}
          </div>
        )}

        {/* Handles de redimensionamiento (solo en modo edición y cuando no está colapsado) */}
        {resizable && !isCollapsed && (
          <>
            {/* Handle esquina inferior derecha (SE) - solo visible en hover del grupo */}
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize bg-accent-primary rounded-full pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{
                transform: 'translate(50%, 50%)',
                zIndex: 10,
              }}
              onMouseDown={(e) => {
                handleResizeStart(e, 'se')
              }}
              title="Redimensionar grupo"
            />
          </>
        )}
      </div>
    </div>
  )
}

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
