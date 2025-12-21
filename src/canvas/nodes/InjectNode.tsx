/**
 * Componente InjectNode - Nodo específico para nodos "inject" de Node-RED
 * 
 * Extiende BaseNode con funcionalidades específicas:
 * - Botón trigger visible
 * - Indicador de configuración (repeat, once, etc.)
 * - Funcionalidad para activar el nodo al hacer clic
 */

import { memo, useState } from 'react'
import type { BaseNodeProps } from './types'
import { BaseNode } from './BaseNode'
import { triggerInjectNode } from '@/api/client'

/**
 * Componente InjectNode
 * 
 * Renderiza un nodo inject con características específicas.
 */
export const InjectNode = memo((props: BaseNodeProps) => {
  const { data, selected, dragging, id } = props
  const { nodeRedNode } = data
  const [isTriggering, setIsTriggering] = useState(false)
  
  // Extraer configuración del nodo inject
  const repeat = nodeRedNode?.repeat
  const once = nodeRedNode?.once
  const payloadType = nodeRedNode?.payloadType || 'date'
  const topic = nodeRedNode?.topic
  const nodeId = nodeRedNode?.id

  const handleTrigger = async (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se abra el panel de propiedades
    
    if (!nodeId || isTriggering) return
    
    setIsTriggering(true)
    try {
      await triggerInjectNode(nodeId)
      // Feedback visual breve
      setTimeout(() => setIsTriggering(false), 500)
    } catch (err) {
      console.error('Error al activar nodo inject:', err)
      setIsTriggering(false)
    }
  }

  return (
    <BaseNode
      {...props}
      id={id}
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
            
            {/* Botón trigger funcional */}
            <div className="mt-1.5 pt-1.5 border-t border-node-border/50">
              <button
                onClick={handleTrigger}
                disabled={isTriggering || !nodeId}
                className={`
                  w-full px-2 py-1 text-[10px] font-medium rounded
                  transition-all duration-200
                  ${isTriggering 
                    ? 'bg-accent-primary/50 text-text-primary cursor-wait' 
                    : 'bg-accent-primary hover:bg-accent-primary/90 text-white cursor-pointer active:scale-95'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={isTriggering ? 'Activando...' : 'Haz clic para activar este nodo'}
              >
                {isTriggering ? '⏳ Activando...' : '▶️ Activar'}
              </button>
            </div>
          </div>
        ),
      }}
      selected={selected}
      dragging={dragging}
    />
  )
})

InjectNode.displayName = 'InjectNode'

