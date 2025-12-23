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
  
  // Los nodos inject ya no se ejecutan al hacer clic
  // Solo se ejecutan mediante el botón "Ejecutar Flow"
  // No se pasa onIconClick para desactivar la ejecución al hacer clic
  
  return (
    <BaseNode
      {...props}
      id={id}
      data={{
        ...baseNodeData,
        // Sin bodyContent - solo icono y nombre (estilo n8n)
        bodyContent: null,
        // No se pasa onIconClick - los nodos inject solo se ejecutan con el botón "Ejecutar Flow"
      } as any}
      selected={selected}
      dragging={dragging}
    />
  )
})

InjectNode.displayName = 'InjectNode'

