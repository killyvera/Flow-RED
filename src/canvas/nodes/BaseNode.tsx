/**
 * Componente BaseNode - Nodo base moderno estilo Flowise/n8n
 * 
 * Características:
 * - Header con color de acento y título
 * - Body con contenido del nodo
 * - Handles (ports) bien posicionados
 * - Estados: default, hover, selected
 * - Estilos modernos con Tailwind
 */

import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { getNodeIcon } from '@/utils/nodeIcons'
import { getNodeHeaderColor } from '@/utils/nodeColors'
import type { LucideIcon } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'
import { getRuntimeStateColor } from '@/utils/runtimeStatusMapper'

/**
 * Componente BaseNode
 * 
 * Renderiza un nodo moderno con:
 * - Header: fondo con color de acento, título e icono
 * - Body: contenido del nodo
 * - Handles: puertos de entrada (izquierda) y salida (derecha)
 */
export const BaseNode = memo(({ data, selected, dragging, id }: BaseNodeProps) => {
  // Refs para detectar doble clic en handles
  const handleDoubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estado para detectar cambios de tema
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  // Escuchar cambios en el tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const darkMode = document.documentElement.classList.contains('dark')
      setIsDark(darkMode)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  // Extraer datos del nodo
  const {
    label,
    nodeRedType,
    bodyContent,
    headerColor,
    icon,
    outputPortsCount = 1,
    nodeRedNode,
  } = data

  // Obtener icono y color automáticamente si no se proporcionan
  // Si icon es un componente Lucide, usarlo directamente; si es string (legacy), usar getNodeIcon
  const IconComponent: LucideIcon = typeof icon === 'string' 
    ? getNodeIcon(nodeRedType) 
    : (icon || getNodeIcon(nodeRedType))
  
  // Recalcular el color del header cuando cambia el tema
  // Si se proporciona headerColor explícitamente, usarlo; si no, calcular según el tema actual
  // El estado isDark fuerza el re-render cuando cambia el tema
  const nodeHeaderColor = headerColor || getNodeHeaderColor(nodeRedType)

  // Determinar si el nodo está seleccionado
  const isSelected = selected

  // Determinar si el nodo está disabled
  const isDisabled = nodeRedNode?.disabled === true

  // Obtener información de status si existe
  const nodeStatus = nodeRedNode?.status
  const hasStatus = nodeStatus && (nodeStatus.fill || nodeStatus.text)

  // Función para obtener el color del status
  const getStatusColor = (fill?: string) => {
    if (!fill) return undefined
    const fillLower = fill.toLowerCase()
    if (fillLower === 'red' || fillLower === 'error') return 'var(--node-status-error)'
    if (fillLower === 'yellow' || fillLower === 'warning') return 'var(--node-status-warning)'
    if (fillLower === 'green' || fillLower === 'success') return 'var(--node-status-success)'
    if (fillLower === 'blue' || fillLower === 'info') return 'var(--node-status-info)'
    if (fillLower === 'grey' || fillLower === 'gray') return 'var(--color-text-tertiary)'
    return undefined
  }

  const statusColor = hasStatus ? getStatusColor(nodeStatus.fill) : undefined
  const statusShape = nodeStatus?.shape || 'dot'

  // Obtener estado de runtime del store
  const nodeRuntimeStates = useCanvasStore((state) => state.nodeRuntimeStates)
  const runtimeState = nodeRedNode?.id ? nodeRuntimeStates.get(nodeRedNode.id) : undefined
  const runtimeStateColor = runtimeState ? getRuntimeStateColor(runtimeState) : undefined

  // Calcular posiciones de los handles de salida
  // Si hay múltiples puertos, distribuirlos verticalmente
  const getOutputHandlePosition = (index: number, total: number) => {
    if (total === 1) return '50%'
    // Distribuir los handles entre 30% y 70% del nodo
    const start = 30
    const end = 70
    const step = (end - start) / (total - 1)
    return `${start + step * index}%`
  }

  // Información para el tooltip
  const tooltipContent = [
    `Tipo: ${nodeRedType}`,
    `ID: ${nodeRedNode?.id || 'N/A'}`,
    `Estado: ${isDisabled ? 'Deshabilitado' : 'Habilitado'}`,
    nodeRedNode?.name && `Nombre: ${nodeRedNode.name}`,
  ].filter(Boolean).join('\n')

  return (
    <div
      className={`
        relative
        bg-node-default
        border
        rounded-xl
        shadow-node
        min-w-[160px]
        max-w-[220px]
        ${dragging ? '' : 'transition-all duration-200 ease-in-out'}
        group
        ${
          isDisabled
            ? 'opacity-50 border-dashed cursor-not-allowed'
            : ''
        }
        ${
          isSelected
            ? 'border-node-border-selected shadow-node-selected ring-2 ring-accent-primary ring-opacity-50'
            : 'border-node-border hover:border-node-border-hover hover:shadow-node-hover'
        }
      `}
      style={{
        opacity: isDisabled ? 'var(--node-disabled-opacity)' : undefined,
        // Optimizar renderizado durante el arrastre
        ...(dragging ? {
          willChange: 'transform',
          transition: 'none', // Forzar sin transiciones durante arrastre
        } : {}),
      }}
      title={tooltipContent}
    >
      {/* Header del nodo - más compacto estilo n8n */}
      <div
        className="px-3 py-2 rounded-t-xl border-b border-node-border/50 relative"
        style={{
          backgroundColor: nodeHeaderColor,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Icono Lucide */}
          {IconComponent && (
            <IconComponent 
              className="w-4 h-4 text-text-primary flex-shrink-0" 
              strokeWidth={2}
            />
          )}
          
          {/* Título del nodo */}
          <h3 className="text-xs font-semibold text-text-primary truncate flex-1 leading-tight">
            {label || nodeRedType || 'Node'}
          </h3>

          {/* Indicador de estado de runtime (prioridad sobre status estático) */}
          {runtimeStateColor && (
            <div
              className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white shadow-sm"
              style={{
                backgroundColor: runtimeStateColor,
              }}
              title={
                runtimeState === 'running' ? 'Ejecutando' :
                runtimeState === 'error' ? 'Error' :
                runtimeState === 'warning' ? 'Advertencia' :
                'Inactivo'
              }
            />
          )}
          
          {/* Badge de status estático (solo si no hay estado de runtime) */}
          {!runtimeStateColor && hasStatus && statusColor && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1"
              title={nodeStatus.text || ''}
            >
              {statusShape === 'dot' ? (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              ) : statusShape === 'ring' ? (
                <div
                  className="w-2 h-2 rounded-full border-2"
                  style={{ 
                    borderColor: statusColor,
                    backgroundColor: 'transparent',
                  }}
                />
              ) : (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              )}
            </div>
          )}
        </div>
        
        {/* Badge de tipo (más pequeño, en segunda línea) */}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-text-tertiary font-mono opacity-70">
            {nodeRedType}
          </span>
          {/* Badge de disabled */}
          {isDisabled && (
            <span className="text-[9px] px-1.5 py-0.5 bg-text-tertiary/20 text-text-tertiary rounded font-medium">
              Disabled
            </span>
          )}
        </div>
      </div>

      {/* Body del nodo - más compacto */}
      <div className="px-3 py-2 min-h-[32px]">
        {bodyContent || (
          <div className="text-[11px] text-text-secondary">
            {/* Contenido por defecto si no hay bodyContent */}
          </div>
        )}
      </div>

      {/* Handles - Puertos de entrada (izquierda) - estilo n8n */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation()
          // Emitir evento personalizado para abrir paleta
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'input',
              handleType: 'target',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        style={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, zIndex: 10 }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-3 !h-3 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
          style={{
            left: 0,
            top: '50%',
          }}
        />
      </div>

      {/* Handles - Puertos de salida (derecha) - Renderizar dinámicamente */}
      {Array.from({ length: outputPortsCount }, (_, index) => {
        const handleId = `output-${index}`
        const topPosition = getOutputHandlePosition(index, outputPortsCount)
        return (
          <div
            key={`output-wrapper-${index}`}
            onDoubleClick={(e) => {
              e.stopPropagation()
              // Emitir evento personalizado para abrir paleta
              const event = new CustomEvent('handleDoubleClick', {
                detail: {
                  nodeId: id,
                  handleId: handleId,
                  handleType: 'source',
                  position: { x: e.clientX, y: e.clientY },
                },
              })
              window.dispatchEvent(event)
            }}
            style={{
              position: 'absolute',
              right: -6,
              top: topPosition,
              transform: 'translateY(-50%)',
              width: 12,
              height: 12,
              zIndex: 10,
            }}
          >
            <Handle
              key={`output-${index}`}
              type="source"
              position={Position.Right}
              id={handleId}
              className="!w-3 !h-3 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
              style={{
                right: 0,
                top: '50%',
              }}
            />
          </div>
        )
      })}

      {/* Texto de status debajo del nodo */}
      {hasStatus && nodeStatus.text && (
        <div
          className="absolute top-full left-0 right-0 mt-1 px-2 py-1 rounded-b-md text-[10px] font-medium text-text-primary"
          style={{
            backgroundColor: statusColor ? `${statusColor}20` : 'var(--color-bg-secondary)',
            color: statusColor || 'var(--color-text-secondary)',
          }}
        >
          {nodeStatus.text}
        </div>
      )}

      {/* Tooltip mejorado (visible en hover) - usando title nativo para simplicidad */}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'

