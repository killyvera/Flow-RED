/**
 * AzureOpenAIModelNode - Nodo personalizado para Azure OpenAI Model
 * 
 * Este nodo representa un modelo de lenguaje:
 * - Handler solo arriba (input): Recibe ModelInput del Agent Core
 * - Forma cuadrada con información mínima (estilo n8n)
 * - Tamaño igual al resto de nodos (80px)
 */

import { memo, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { AzureIcon } from '@/utils/azureIcon'
import { useCanvasStore } from '@/state/canvasStore'

/**
 * AzureOpenAIModelNode Component
 * 
 * Nodo cuadrado estilo n8n con handler solo arriba
 * Tamaño: 80px (igual que BaseNode)
 */
export const AzureOpenAIModelNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const nodeData = (data.data || data) as any
  // Usar label del nodo o nombre amigable por defecto
  const label = nodeData.label || nodeData.nodeRedNode?.name || 'Azure OpenAI'
  const nodeRedNodeId = nodeData.nodeRedNode?.id
  
  // Obtener estado de ejecución y duración desde el store
  const nodeRuntimeStates = useCanvasStore((state) => state.nodeRuntimeStates)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  
  const runtimeState = nodeRedNodeId ? nodeRuntimeStates.get(nodeRedNodeId) : null
  const isExecuting = runtimeState === 'running'
  
  // Obtener duración desde el snapshot más reciente
  const executionDuration = useMemo(() => {
    if (!nodeRedNodeId) return 0
    const snapshots = nodeSnapshots.get(nodeRedNodeId) || []
    if (snapshots.length === 0 || !currentFrame) return 0
    
    const latestSnapshot = snapshots[snapshots.length - 1]
    if (latestSnapshot && currentFrame) {
      return latestSnapshot.ts - currentFrame.startedAt
    }
    return 0
  }, [nodeRedNodeId, nodeSnapshots, currentFrame])

  // Calcular animación de rebote basada en el tiempo de ejecución
  // Si está ejecutando, usar animación de rebote continua
  // Si tiene duración, usar animación sincronizada con el timing
  const bounceAnimation = isExecuting ? 'animate-bounce' : ''

  return (
    <div
      className={`
        relative bg-node-default border-2 rounded-lg shadow-node
        w-[80px] min-w-[80px] max-w-[80px]
        transition-all duration-200 ease-in-out
        ${selected ? 'ring-2 ring-accent-primary ring-opacity-50 border-node-border-selected shadow-node-selected' : 'border-node-border hover:border-node-border-hover hover:shadow-node-hover'}
        ${bounceAnimation}
      `}
      style={{
        // Sincronizar animación con duración si está disponible y ejecutando
        animationDuration: isExecuting && executionDuration > 0 
          ? `${Math.max(executionDuration, 300)}ms` 
          : undefined,
        animationIterationCount: isExecuting && executionDuration > 0 ? 1 : 'infinite',
      }}
    >
      {/* Handle de entrada OCULTO - Solo se conecta automáticamente desde Agent Core */}
      {/* El handle de entrada está oculto pero sigue funcionando para conexiones automáticas */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-0 !h-0 !opacity-0 !pointer-events-none"
        style={{
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      {/* Handle de salida visible - Para conectar al Agent Core */}
      <Handle
        type="source"
        position={Position.Top}
        id="output-0"
        className="!w-3 !h-3 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
        style={{
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Contenido centrado - Solo icono */}
      <div 
        className="flex items-center justify-center min-h-[80px] px-4 py-4 rounded-lg"
        style={{
          backgroundColor: '#0078D420', // Color Azure con transparencia
        }}
      >
        {/* Icono de Azure */}
        <AzureIcon size={32} className="text-[#0078D4]" />
      </div>

      {/* Label debajo del nodo (fuera del contenedor) */}
      <div className="absolute top-full left-0 right-0 mt-1 text-center">
        <span className="text-[10px] text-text-secondary font-medium">
          {label}
        </span>
      </div>
    </div>
  )
})

AzureOpenAIModelNode.displayName = 'AzureOpenAIModelNode'

