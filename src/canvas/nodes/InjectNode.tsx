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
      
      console.log('✅ [InjectNode] Nodo inject activado exitosamente:', nodeId)
      // Feedback visual breve
      setTimeout(() => setIsTriggering(false), 500)
    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido'
      
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
  
  // Handler para click en el nodo completo (estilo n8n)
  const handleNodeClick = async (e: React.MouseEvent) => {
    // Solo ejecutar si no se está haciendo click en un handle o en el panel de propiedades
    if (e.target instanceof HTMLElement) {
      // Si el click es en un handle, no hacer nada (dejar que React Flow lo maneje)
      if (e.target.closest('.react-flow__handle')) {
        return
      }
      // Si el click es para abrir el panel, no ejecutar
      if (e.target.closest('[data-node-properties]')) {
        return
      }
    }
    
    // Ejecutar trigger
    await handleTrigger(e)
  }
  
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
            
            {/* Indicador de que se puede hacer click (estilo n8n) */}
            {canTrigger && !isTriggering && (
              <div className="mt-1.5 pt-1.5 border-t border-node-border/50 text-[10px] text-text-tertiary text-center">
                Click para ejecutar
              </div>
            )}
            {isTriggering && (
              <div className="mt-1.5 pt-1.5 border-t border-node-border/50 text-[10px] text-accent-primary text-center font-medium">
                ⏳ Ejecutando...
              </div>
            )}
            {!canTrigger && (
              <div className="mt-1.5 pt-1.5 border-t border-node-border/50 text-[10px] text-text-tertiary text-center">
                Guarda el flow primero
              </div>
            )}
          </div>
        ),
        // Agregar handler de click al nodo
        onNodeClick: handleNodeClick,
      } as any}
      selected={selected}
      dragging={dragging}
    />
  )
})

InjectNode.displayName = 'InjectNode'

