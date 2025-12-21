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
import { useCanvasStore } from '@/state/canvasStore'

/**
 * Componente InjectNode
 * 
 * Renderiza un nodo inject con características específicas.
 */
export const InjectNode = memo((props: BaseNodeProps) => {
  const { data, selected, dragging, id } = props
  const nodeData = data.data || data as any
  const nodeRedNode = nodeData.nodeRedNode
  const [isTriggering, setIsTriggering] = useState(false)
  
  // Obtener nodeRedNodes del store para verificar si el nodo está guardado
  const nodeRedNodes = useCanvasStore((state) => state.nodeRedNodes)
  
  // Extraer configuración del nodo inject
  const repeat = nodeRedNode?.repeat
  const once = nodeRedNode?.once
  const payloadType = nodeRedNode?.payloadType || 'date'
  const topic = nodeRedNode?.topic
  // IMPORTANTE: Usar el ID de Node-RED, no el ID de React Flow
  // El ID de React Flow debería ser el mismo que el de Node-RED, pero por seguridad
  // usamos nodeRedNode.id si está disponible, sino usamos el ID de React Flow
  // Si nodeRedNode no existe o no tiene id, usar el ID de React Flow directamente
  // porque el ID de React Flow se preserva del ID original de Node-RED
  const nodeId = (nodeRedNode && nodeRedNode.id) ? nodeRedNode.id : id
  
  // Verificar si el nodo está guardado en Node-RED
  // Un nodo está guardado si existe en nodeRedNodes (que vienen de la API)
  const isNodeSaved = nodeRedNodes.some(n => n.id === nodeId && n.type === 'inject')
  const canTrigger = isNodeSaved

  const handleTrigger = async (e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se abra el panel de propiedades
    
    if (!nodeId || isTriggering || !canTrigger) {
      if (!canTrigger) {
        alert('Este nodo no está guardado. Guarda el flow primero usando "Save & Deploy" antes de activar el nodo.')
      }
      return
    }
    
    // #region agent log
    const triggerClickTime = Date.now()
    fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InjectNode.tsx:handleTrigger',message:'Click en botón trigger',data:{nodeId,reactFlowId:id,nodeRedId:nodeRedNode?.id,nodeName:nodeRedNode?.name||nodeRedNode?.label,nodeType:nodeRedNode?.type,nodeZ:nodeRedNode?.z,hasNodeRedNode:!!nodeRedNode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    console.log('🖱️ [InjectNode] Intentando activar nodo:', {
      nodeId,
      reactFlowId: id, // ID del nodo en React Flow
      nodeRedId: nodeRedNode?.id, // ID original de Node-RED
      nodeName: nodeRedNode?.name || nodeRedNode?.label,
      nodeType: nodeRedNode?.type,
      nodeZ: nodeRedNode?.z, // Flow ID
      hasNodeRedNode: !!nodeRedNode
    })
    
    setIsTriggering(true)
    try {
      await triggerInjectNode(nodeId)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InjectNode.tsx:handleTrigger',message:'Nodo inject activado exitosamente',data:{nodeId,timeSinceClick:Date.now()-triggerClickTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log('✅ [InjectNode] Nodo inject activado exitosamente:', nodeId)
      // Feedback visual breve
      setTimeout(() => setIsTriggering(false), 500)
    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido'
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InjectNode.tsx:handleTrigger',message:'Error al activar nodo inject',data:{nodeId,error:errorMessage,timeSinceClick:Date.now()-triggerClickTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('❌ [InjectNode] Error al activar nodo inject:', {
        nodeId,
        error: errorMessage,
        suggestion: 'El nodo puede no estar desplegado. Haz clic en "Save & Deploy" en la barra superior para guardar y desplegar el flow antes de activar el nodo inject.'
      })
      setIsTriggering(false)
      
      // Mostrar alerta al usuario con sugerencia de recargar si el nodo no existe
      const suggestion = errorMessage.includes('no existe en Node-RED') || errorMessage.includes('flows pueden haber cambiado')
        ? 'Los flows pueden haber cambiado. Por favor, recarga la página o haz clic en "Recargar flows" en la barra superior para sincronizar con Node-RED.'
        : 'Haz clic en "Save & Deploy" para guardar y desplegar el flow antes de activar nodos inject.'
      
      alert(`No se pudo activar el nodo inject.\n\n${errorMessage}\n\nSugerencia: ${suggestion}`)
    }
  }

  const baseNodeData = data.data || data as any
  return (
    <BaseNode
      {...props}
      id={id}
      data={{
        ...baseNodeData,
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
                disabled={isTriggering || !nodeId || !canTrigger}
                className={`
                  w-full px-2 py-1 text-[10px] font-medium rounded
                  transition-all duration-200
                  ${isTriggering 
                    ? 'bg-accent-primary/50 text-text-primary cursor-wait' 
                    : canTrigger
                    ? 'bg-accent-primary hover:bg-accent-primary/90 text-white cursor-pointer active:scale-95'
                    : 'bg-node-border text-text-secondary cursor-not-allowed'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={
                  isTriggering 
                    ? 'Activando...' 
                    : !canTrigger 
                    ? 'Guarda el flow primero usando "Save & Deploy"'
                    : 'Haz clic para activar este nodo'
                }
              >
                {isTriggering 
                  ? '⏳ Activando...' 
                  : !canTrigger 
                  ? '💾 Guardar primero'
                  : '▶️ Activar'
                }
              </button>
            </div>
          </div>
        ),
      } as any}
      selected={selected}
      dragging={dragging}
    />
  )
})

InjectNode.displayName = 'InjectNode'

