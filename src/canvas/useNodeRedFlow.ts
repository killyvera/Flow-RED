/**
 * Hook personalizado para cargar y transformar flows de Node-RED
 * 
 * Este hook maneja:
 * - Carga de flows desde Node-RED
 * - Transformación automática a React Flow
 * - Manejo de estados de carga y errores
 * - Selección automática del primer flow si hay múltiples
 */

import { useEffect, useCallback, useRef } from 'react'
import { getFlows } from '@/api/client'
import { extractFlows, transformNodeRedFlow } from './mappers'
import { useCanvasStore } from '@/state/canvasStore'
import { useCanvasStore } from '@/state/canvasStore'
import { flowLogger, appLogger } from '@/utils/logger'

/**
 * Hook para cargar flows de Node-RED y transformarlos a React Flow
 * 
 * @param autoLoad Si es true, carga automáticamente al montar el componente
 * @returns Objeto con funciones para cargar flows y estado
 */
export function useNodeRedFlow(autoLoad: boolean = true) {
  const {
    nodeRedNodes,
    flows,
    activeFlowId,
    isLoading,
    error,
    setNodeRedNodes,
    setFlows,
    setActiveFlowId,
    setNodes,
    setEdges,
    setGroups,
    setLoading,
    setError,
  } = useCanvasStore()

  // Ref para evitar múltiples cargas simultáneas
  const hasAttemptedLoad = useRef(false)

  /**
   * Carga flows desde Node-RED
   */
  const loadFlows = useCallback(async () => {
    // Evitar múltiples cargas simultáneas
    if (isLoading) {
      flowLogger('⏸️ Carga ya en progreso, ignorando solicitud')
      return
    }

    flowLogger('🔄 Iniciando carga de flows desde Node-RED...')
    setLoading(true)
    setError(null)
    hasAttemptedLoad.current = true

    try {
      // Obtener todos los nodos (incluyendo flows/tabs)
      const allNodes = await getFlows('v2')
      flowLogger('📦 Nodos recibidos:', { total: allNodes.length })

      // Extraer flows (tabs)
      const extractedFlows = extractFlows(allNodes)
      flowLogger('📋 Flows extraídos:', { 
        count: extractedFlows.length,
        flows: extractedFlows.map(f => ({ id: f.id, name: f.name || f.label || 'Sin nombre' }))
      })

      // Guardar en el store
      setNodeRedNodes(allNodes)
      setFlows(extractedFlows)
      flowLogger('💾 Flows guardados en el store')

      // Si hay flows y no hay flow activo, seleccionar el primero
      if (extractedFlows.length > 0 && !activeFlowId) {
        const firstFlowId = extractedFlows[0].id
        flowLogger('🎯 Seleccionando primer flow automáticamente:', firstFlowId)
        setActiveFlowId(firstFlowId)
      } else if (extractedFlows.length === 0) {
        flowLogger('⚠️ No se encontraron flows en Node-RED')
      }
      
      flowLogger('✅ Carga de flows completada exitosamente')
    } catch (err) {
      // Mejorar mensaje de error para conexión rechazada
      let errorMessage = 'Error al cargar flows'
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorMessage =
          'No se puede conectar a Node-RED. Asegúrate de que esté corriendo en http://localhost:1880'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      flowLogger('❌ Error al cargar flows:', errorMessage, err)
      setError(errorMessage)
    } finally {
      setLoading(false)
      flowLogger('🏁 Finalizada carga de flows (loading:', isLoading, ')')
    }
  }, [
    isLoading,
    setLoading,
    setError,
    setNodeRedNodes,
    setFlows,
    activeFlowId,
    setActiveFlowId,
  ])

  /**
   * Transforma y renderiza un flow específico
   * 
   * @param flowId ID del flow a renderizar
   */
  const renderFlow = useCallback(
    (flowId: string) => {
      if (!nodeRedNodes.length) {
        flowLogger('⚠️ No hay nodos cargados. Carga flows primero.')
        return
      }

      flowLogger('🎨 Renderizando flow:', flowId)
      
      try {
        // Transformar el flow a React Flow
        const { nodes, edges, groups } = transformNodeRedFlow(nodeRedNodes, flowId)
        
        const flowInfo = {
          flowId,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          groupsCount: groups.length,
          nodeTypes: [...new Set(nodes.map(n => n.data.nodeRedType))],
        }
        
        flowLogger('✨ Flow transformado:', flowInfo)
        
        // Log detallado de grupos
        if (groups.length > 0) {
          flowLogger('📦 Grupos:', groups.map(g => ({
            id: g.id,
            name: g.name || g.label,
            position: `${g.x},${g.y}`,
            size: `${g.w}x${g.h}`,
          })))
        }
        
        // Log detallado de nodos y edges
        if (nodes.length > 0) {
          flowLogger('📊 Nodos:', nodes.map(n => ({
            id: n.id,
            type: n.data.nodeRedType,
            label: n.data.label,
            position: n.position,
          })))
        }
        
        if (edges.length > 0) {
          flowLogger('🔗 Edges:', edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })))
        }

        // Actualizar el canvas
        setNodes(nodes)
        setEdges(edges)
        setGroups(groups)
        setActiveFlowId(flowId)
        flowLogger('✅ Flow renderizado en el canvas:', flowInfo)
        
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al renderizar flow'
        flowLogger('❌ Error al renderizar flow:', errorMessage, err)
        setError(errorMessage)
      }
    },
    [nodeRedNodes, setNodes, setEdges, setGroups, setActiveFlowId, setError]
  )

  /**
   * Cambia el flow activo y lo renderiza
   * 
   * @param flowId ID del flow a activar
   */
  const switchFlow = useCallback(
    (flowId: string) => {
      renderFlow(flowId)
    },
    [renderFlow]
  )

  // Cargar flows automáticamente al montar si autoLoad es true
  // Solo intentar una vez para evitar loops infinitos
  useEffect(() => {
    if (
      autoLoad &&
      !isLoading &&
      nodeRedNodes.length === 0 &&
      !hasAttemptedLoad.current
    ) {
      appLogger('🚀 Auto-cargando flows al montar componente')
      loadFlows()
    }
  }, [autoLoad, isLoading, nodeRedNodes.length, loadFlows])

  // Renderizar el flow activo cuando cambie
  useEffect(() => {
    if (activeFlowId && nodeRedNodes.length > 0) {
      flowLogger('🔄 Flow activo cambió, renderizando:', activeFlowId)
      renderFlow(activeFlowId)
    }
  }, [activeFlowId, nodeRedNodes, renderFlow])

  return {
    // Estado
    flows,
    activeFlowId,
    isLoading,
    error,
    nodeRedNodes,

    // Acciones
    loadFlows,
    renderFlow,
    switchFlow,
  }
}

