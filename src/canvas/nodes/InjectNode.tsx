/**
 * Componente InjectNode - Nodo específico para nodos "inject" de Node-RED
 * 
 * Extiende BaseNode con funcionalidades específicas:
 * - Botón trigger visible
 * - Indicador de configuración (repeat, once, etc.)
 */

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from './types'
import { BaseNode } from './BaseNode'

/**
 * Componente InjectNode
 * 
 * Renderiza un nodo inject con características específicas.
 */
export const InjectNode = memo(({ data, selected }: BaseNodeProps) => {
  const { nodeRedNode } = data
  
  // Extraer configuración del nodo inject
  const repeat = nodeRedNode?.repeat
  const once = nodeRedNode?.once
  const payloadType = nodeRedNode?.payloadType || 'date'
  const topic = nodeRedNode?.topic

  return (
    <BaseNode
      data={{
        ...data,
        bodyContent: (
          <div className="space-y-1">
            {/* Información de configuración - más compacto */}
            {repeat && (
              <div className="text-[11px] text-text-secondary">
                <span className="font-medium">Repeat:</span> {repeat}
              </div>
            )}
            {once && (
              <div className="text-[11px] text-text-secondary">
                <span className="font-medium">Once:</span> ✓
              </div>
            )}
            {topic && (
              <div className="text-[11px] text-text-secondary truncate">
                <span className="font-medium">Topic:</span> {topic}
              </div>
            )}
            <div className="text-[11px] text-text-secondary">
              <span className="font-medium">Payload:</span> {payloadType}
            </div>
            
            {/* Botón trigger simulado (visual) */}
            <div className="mt-1.5 pt-1.5 border-t border-node-border/50">
              <div className="text-[10px] text-text-tertiary italic">
                Click para trigger
              </div>
            </div>
          </div>
        ),
      }}
      selected={selected}
    />
  )
})

InjectNode.displayName = 'InjectNode'

