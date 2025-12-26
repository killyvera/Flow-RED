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

import { memo, useState, useEffect, useMemo } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import type { BaseNodeProps, BaseNodeData } from './types'
import { getNodeIcon } from '@/utils/nodeIcons'
import { getNodeHeaderColor } from '@/utils/nodeColors'
import type { LucideIcon } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'
import { getRuntimeStateColor } from '@/utils/runtimeStatusMapper'
import { generateNodeSummary } from '@/utils/summaryEngine'
import { SummaryBadge } from '@/components/SummaryBadge'
import { getNodeExplanation } from '@/utils/nodeExplanations'
import { isLinkIn, isLinkOut } from '@/utils/linkUtils'
import { Link, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

/**
 * Componente BaseNode
 * 
 * Renderiza un nodo moderno con:
 * - Header: fondo con color de acento, título e icono
 * - Body: contenido del nodo
 * - Handles: puertos de entrada (izquierda) y salida (derecha)
 */
export const BaseNode = memo(({ data, selected, dragging, id }: BaseNodeProps) => {
  // Obtener zoom level para LOD
  const { getViewport } = useReactFlow()
  const perfMode = useCanvasStore((state) => state.perfMode)
  const viewport = getViewport()
  const zoom = viewport.zoom
  const shouldUseLOD = perfMode && zoom < 0.5
  
  // Estado para detectar cambios de tema
  const [, setIsDark] = useState(() => {
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
  const nodeData: BaseNodeData = (data.data || data) as BaseNodeData
  const label = nodeData.label || ''
  const nodeRedType = nodeData.nodeRedType || 'unknown'
  const bodyContent = nodeData.bodyContent
  const headerColor = nodeData.headerColor
  const icon = nodeData.icon
  const outputPortsCount = nodeData.outputPortsCount || 1
  const nodeRedNode = nodeData.nodeRedNode
  const onNodeClick = nodeData.onNodeClick // Handler de click personalizado (para triggers)
  const onIconClick = nodeData.onIconClick // Handler de click específico para el icono

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
  
  // Obtener snapshots y logs para generar resumen (necesario antes de usar en useMemo)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)
  const executionLogs = useCanvasStore((state) => state.executionLogs)
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const explainMode = useCanvasStore((state) => state.explainMode)
  
  // Determinar si el nodo se ejecutó correctamente (usando snapshots)
  const hasSuccessfulExecution = useMemo(() => {
    if (!nodeRedNode?.id) return false
    const snapshots = nodeSnapshots.get(nodeRedNode.id) || []
    if (snapshots.length === 0) return false
    
    // Si hay un snapshot reciente con status 'idle' o 'warning' (no error), es éxito
    const recentSnapshot = snapshots[0]
    return recentSnapshot.status === 'idle' || recentSnapshot.status === 'warning'
  }, [nodeRedNode?.id, nodeSnapshots])
  
  // Determinar color del borde según estado de ejecución (estilo n8n)
  const getBorderColorByStatus = () => {
    if (!runtimeState) {
      // Si no hay runtimeState pero hubo ejecución exitosa reciente, mostrar verde
      if (hasSuccessfulExecution) {
        return '#10b981' // Verde
      }
      return undefined
    }
    
    // Verde para éxito (idle después de ejecución o running), rojo para error, amarillo para warning
    if (runtimeState === 'idle' && hasSuccessfulExecution) {
      return '#10b981' // Verde - ejecutado correctamente
    }
    if (runtimeState === 'running') {
      return '#3b82f6' // Azul - ejecutando
    }
    if (runtimeState === 'error') {
      return '#ef4444' // Rojo
    }
    if (runtimeState === 'warning') {
      return '#f59e0b' // Amarillo
    }
    return undefined
  }
  
  const borderStatusColor = getBorderColorByStatus()
  
  // Determinar iconos de estado para esquina inferior derecha (estilo n8n)
  const getStatusIcons = () => {
    const icons: Array<{ icon: LucideIcon; color: string; title: string }> = []
    
    // Icono de éxito/error según runtimeState y snapshots
    if (runtimeState === 'error') {
      icons.push({
        icon: XCircle,
        color: '#ef4444',
        title: 'Error en ejecución'
      })
    } else if (runtimeState === 'warning') {
      icons.push({
        icon: AlertCircle,
        color: '#f59e0b',
        title: 'Advertencia'
      })
    } else if (runtimeState === 'idle' && hasSuccessfulExecution) {
      icons.push({
        icon: CheckCircle2,
        color: '#10b981',
        title: 'Ejecutado correctamente'
      })
    } else if (runtimeState === 'running') {
      // No mostrar icono cuando está ejecutando (ya hay indicador en el header)
    }
    
    // Agregar icono de información si hay status text importante
    if (hasStatus && nodeStatus?.text && nodeStatus.text.length > 0) {
      icons.push({
        icon: Info,
        color: statusColor || '#6b7280',
        title: nodeStatus.text
      })
    }
    
    return icons
  }
  
  const statusIcons = getStatusIcons()
  
  // Obtener último snapshot del nodo (del frame actual si existe)
  const lastSnapshot = useMemo(() => {
    if (!nodeRedNode?.id) return null
    const snapshots = nodeSnapshots.get(nodeRedNode.id) || []
    // Filtrar por frame actual si existe, sino tomar el más reciente
    const frameSnapshots = currentFrame
      ? snapshots.filter(s => s.frameId === currentFrame.id)
      : snapshots
    return frameSnapshots.length > 0 ? frameSnapshots[0] : null
  }, [nodeRedNode?.id, nodeSnapshots, currentFrame])
  
  // Obtener último log del nodo
  const lastLog = useMemo(() => {
    if (!nodeRedNode?.id) return null
    const nodeLogs = executionLogs.filter(log => log.nodeId === nodeRedNode.id)
    return nodeLogs.length > 0 ? nodeLogs[0] : null
  }, [nodeRedNode?.id, executionLogs])
  
  // Generar resumen del nodo
  const nodeSummary = useMemo(() => {
    // Intentar obtener payload del snapshot o log
    let payload: any = undefined
    let payloadPreview: string | undefined = undefined
    let statusCode: number | undefined = undefined
    let errorMessage: string | undefined = undefined
    
    if (lastSnapshot?.payloadPreview) {
      payloadPreview = lastSnapshot.payloadPreview
      // Intentar parsear el preview si es JSON
      try {
        payload = JSON.parse(lastSnapshot.payloadPreview)
      } catch {
        payload = lastSnapshot.payloadPreview
      }
    } else if (lastLog?.data) {
      payload = lastLog.data
      // Generar preview truncado
      try {
        const jsonString = JSON.stringify(payload)
        payloadPreview = jsonString.length > 100 ? jsonString.substring(0, 100) + '...' : jsonString
      } catch {
        payloadPreview = String(payload)
      }
    }
    
    // Extraer statusCode si existe en el payload
    if (payload && typeof payload === 'object' && 'statusCode' in payload) {
      statusCode = payload.statusCode
    }
    
    // Extraer errorMessage si existe
    if (lastLog?.level === 'error' && lastLog?.message) {
      errorMessage = lastLog.message
    }
    
    return generateNodeSummary({
      nodeType: nodeRedType || 'unknown',
      nodeName: label,
      runtimeState,
      payloadPreview,
      payload,
      statusCode,
      errorMessage,
    })
  }, [nodeRedType, label, runtimeState, lastSnapshot, lastLog])
  
  // Log para debugging (solo cuando cambia el estado)
  useEffect(() => {
    if (nodeRedNode?.id && runtimeState) {
      console.log('🎨 [BaseNode] Estado de runtime:', {
        nodeId: nodeRedNode.id,
        nodeName: label,
        runtimeState,
        color: runtimeStateColor
      })
    }
  }, [nodeRedNode?.id, runtimeState, runtimeStateColor, label])

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

  // Renderizar versión simplificada si LOD está activo
  if (shouldUseLOD) {
    return (
      <div
        className={`
          relative
          bg-node-default
          border
          rounded-xl
          min-w-[120px]
          max-w-[160px]
          ${dragging ? '' : 'transition-none'}
          ${isDisabled ? 'opacity-50 border-dashed cursor-not-allowed' : ''}
          ${isSelected ? 'border-node-border-selected ring-1 ring-accent-primary ring-opacity-50' : 'border-node-border'}
        `}
        style={{
          opacity: isDisabled ? 'var(--node-disabled-opacity)' : undefined,
          willChange: 'transform',
          boxShadow: 'none', // Sin sombras en LOD
        }}
        title={tooltipContent}
      >
        {/* Header simplificado */}
        <div
          className="px-2 py-1.5 rounded-t-xl border-b border-node-border/50"
          style={{
            backgroundColor: nodeHeaderColor,
          }}
        >
          <div className="flex items-center gap-1.5">
            {IconComponent && (
              <IconComponent 
                className="w-3 h-3 text-text-primary flex-shrink-0" 
                strokeWidth={2}
              />
            )}
            <h3 className="text-[10px] font-semibold text-text-primary truncate flex-1">
              {label || nodeRedType || 'Node'}
            </h3>
            {runtimeStateColor && (
              <div
                className="w-2 h-2 rounded-full border border-white"
                style={{
                  backgroundColor: runtimeStateColor,
                }}
              />
            )}
          </div>
        </div>
        
        {/* Handles simplificados */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-2 !h-2 !bg-node-default !border !border-node-border"
          style={{ left: -4, top: '50%' }}
        />
        {Array.from({ length: outputPortsCount }, (_, index) => {
          const handleId = `output-${index}`
          return (
            <Handle
              key={handleId}
              type="source"
              position={Position.Right}
              id={handleId}
              className="!w-2 !h-2 !bg-node-default !border !border-node-border"
              style={{
                right: -4,
                top: getOutputHandlePosition(index, outputPortsCount),
              }}
            />
          )
        })}
      </div>
    )
  }

  // Handler de click en el nodo (para triggers) - No necesario, se maneja desde React Flow
  
  return (
    <div
      className={`
        relative
        bg-node-default
        border-2
        rounded-lg
        shadow-node
        w-[80px]
        min-w-[80px]
        max-w-[80px]
        ${dragging ? '' : 'transition-all duration-200 ease-in-out'}
        group
        ${onNodeClick && !onIconClick ? 'cursor-pointer' : ''}
        ${
          isDisabled
            ? 'opacity-50 border-dashed cursor-not-allowed'
            : ''
        }
        ${
          isSelected
            ? borderStatusColor
              ? `shadow-node-selected ring-2 ring-opacity-50`
              : 'border-node-border-selected shadow-node-selected ring-2 ring-accent-primary ring-opacity-50'
            : borderStatusColor
              ? 'hover:shadow-node-hover'
              : 'border-node-border hover:border-node-border-hover hover:shadow-node-hover'
        }
      `}
      style={{
        opacity: isDisabled ? 'var(--node-disabled-opacity)' : undefined,
        // Borde según estado de ejecución (estilo n8n)
        borderColor: borderStatusColor || (isSelected ? undefined : undefined),
        // Optimizar renderizado durante el arrastre
        ...(dragging ? {
          willChange: 'transform',
          transition: 'none', // Forzar sin transiciones durante arrastre
        } : {}),
        // Deshabilitar sombras en perf mode
        ...(perfMode ? {
          boxShadow: 'none',
        } : {}),
        // Ring color según estado
        ...(isSelected && borderStatusColor ? {
          '--tw-ring-color': borderStatusColor,
        } : {}),
      } as React.CSSProperties}
      title={tooltipContent}
    >
      {/* Header del nodo - solo icono grande */}
      <div
        className="px-4 py-4 rounded-lg relative flex items-center justify-center min-h-[80px]"
        style={{
          backgroundColor: nodeHeaderColor,
        }}
      >
        <div className="flex items-center justify-center relative">
          {/* Icono Lucide - grande y centrado */}
          {IconComponent && (
            <IconComponent 
              className={`w-8 h-8 text-text-primary flex-shrink-0 ${onIconClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              strokeWidth={2.5}
              onClick={onIconClick ? (e) => {
                e.stopPropagation()
                onIconClick(e)
              } : undefined}
            />
          )}

          {/* Indicador de link node (portal) - más pequeño, en esquina */}
          {(isLinkIn(nodeRedNode) || isLinkOut(nodeRedNode)) && (
            <div
              className="absolute -top-1 -right-1 flex items-center gap-1 px-1 py-0.5 rounded bg-accent-primary/20 border border-accent-primary/30"
              title={isLinkIn(nodeRedNode) ? 'Link In: Recibe mensajes de Link Out' : 'Link Out: Envía mensajes a Link In'}
            >
              <Link className="w-2 h-2 text-accent-primary" strokeWidth={2.5} />
            </div>
          )}

          {/* Indicador de estado de runtime (pequeño, en esquina superior izquierda) */}
          {runtimeStateColor && (
            <div
              className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm flex-shrink-0"
              style={{
                backgroundColor: runtimeStateColor,
                boxShadow: `0 0 4px ${runtimeStateColor}`,
              }}
              title={
                runtimeState === 'running' ? 'Running: Node is currently executing' :
                runtimeState === 'error' ? 'Error: Node execution failed' :
                runtimeState === 'warning' ? 'Warning: Node completed with warnings' :
                'Idle: Node is ready'
              }
            >
              {/* Animación de pulso para estado running */}
              {runtimeState === 'running' && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    backgroundColor: runtimeStateColor,
                    opacity: 0.5,
                  }}
                />
              )}
            </div>
          )}
          
          {/* Badge de status estático (solo si no hay estado de runtime) */}
          {!runtimeStateColor && hasStatus && statusColor && (
            <div
              className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColor }}
              title={nodeStatus.text || ''}
            />
          )}
        </div>
        
        {/* Badge de disabled - solo si está disabled */}
        {isDisabled && (
          <div className="absolute bottom-0 left-0 right-0">
            <span className="text-[9px] px-1 py-0.5 bg-text-tertiary/20 text-text-tertiary rounded font-medium">
              Disabled
            </span>
          </div>
        )}
      </div>

      {/* Texto del nodo debajo del contenedor */}
      <div className="absolute top-full left-0 right-0 mt-1 text-center">
        <span className="text-[10px] text-text-secondary font-medium">
          {label || nodeRedType || 'Node'}
        </span>
      </div>

      {/* Handles - Puertos de entrada (izquierda) - estilo n8n compacto */}
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
        style={{ position: 'absolute', left: -5, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, zIndex: 10 }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
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
              right: -5,
              top: topPosition,
              transform: 'translateY(-50%)',
              width: 10,
              height: 10,
              zIndex: 10,
            }}
          >
            <Handle
              key={`output-${index}`}
              type="source"
              position={Position.Right}
              id={handleId}
              className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
              style={{
                right: 0,
                top: '50%',
              }}
            />
          </div>
        )
      })}

      {/* Overlay de explicación en Explain Mode */}
      {explainMode && (
        <div className="absolute top-full left-0 right-0 mt-1 px-2 py-1 bg-bg-secondary border border-node-border rounded-md shadow-lg z-50">
          <p className="text-[10px] text-text-primary font-medium text-center">
            {getNodeExplanation(nodeRedType)}
          </p>
        </div>
      )}

      {/* Iconos de estado en esquina inferior derecha (estilo n8n) */}
      {statusIcons.length > 0 && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 z-20">
          {statusIcons.map((statusIcon, index) => {
            const Icon = statusIcon.icon
            return (
              <div
                key={index}
                className="bg-node-default rounded-full p-0.5 shadow-sm border border-node-border/50"
                title={statusIcon.title}
              >
                <Icon 
                  className="w-3 h-3" 
                  style={{ color: statusIcon.color }}
                  strokeWidth={2.5}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Tooltip mejorado (visible en hover) - usando title nativo para simplicidad */}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'

