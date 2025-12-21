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
import { getFlows, createFlow, deleteFlow, duplicateFlow, importFlow } from '@/api/client'
import { extractFlows, transformNodeRedFlow } from './mappers'
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

  /**
   * Crea un nuevo flow vacío
   * Después de crear, recarga flows desde la API
   */
  const createNewFlow = useCallback(async (name: string, options?: { disabled?: boolean; info?: string }) => {
    flowLogger('➕ Creando nuevo flow:', { name, options })
    setLoading(true)
    setError(null)
    
    try {
      const result = await createFlow(name, options)
      
      // COMENTADO: Recarga innecesaria que solo alenta la app
      // await loadFlows()
      
      // Seleccionar el nuevo flow
      setActiveFlowId(result.id)
      renderFlow(result.id)
      
      flowLogger('✅ Flow creado:', { id: result.id, name })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear flow'
      flowLogger('❌ Error al crear flow:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadFlows, renderFlow, setLoading, setError, setActiveFlowId])

  /**
   * Elimina un flow
   * Después de eliminar, recarga flows desde la API
   */
  const removeFlow = useCallback(async (flowId: string) => {
    flowLogger('🗑️ Eliminando flow:', { flowId })
    setLoading(true)
    setError(null)
    
    try {
      await deleteFlow(flowId)
      
      // COMENTADO: Recarga innecesaria que solo alenta la app
      // await loadFlows()
      
      // Si se eliminó el flow activo, seleccionar el primero disponible
      if (activeFlowId === flowId) {
        const currentFlows = useCanvasStore.getState().flows
        if (currentFlows.length > 0) {
          setActiveFlowId(currentFlows[0].id)
          renderFlow(currentFlows[0].id)
        } else {
          setActiveFlowId(null)
        }
      }
      
      flowLogger('✅ Flow eliminado:', { flowId })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar flow'
      flowLogger('❌ Error al eliminar flow:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadFlows, renderFlow, activeFlowId, setLoading, setError, setActiveFlowId])

  /**
   * Duplica un flow
   * Después de duplicar, recarga flows desde la API
   */
  const duplicateExistingFlow = useCallback(async (flowId: string, newName?: string) => {
    flowLogger('📋 Duplicando flow:', { flowId, newName })
    setLoading(true)
    setError(null)
    
    try {
      const result = await duplicateFlow(flowId, newName)
      
      // COMENTADO: Recarga innecesaria que solo alenta la app
      // await loadFlows()
      
      // Seleccionar el flow duplicado
      setActiveFlowId(result.id)
      renderFlow(result.id)
      
      flowLogger('✅ Flow duplicado:', { originalId: flowId, newId: result.id })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al duplicar flow'
      flowLogger('❌ Error al duplicar flow:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadFlows, renderFlow, setLoading, setError, setActiveFlowId])

  /**
   * Importa un flow desde JSON
   * Después de importar, recarga flows desde la API
   */
  const importFlowFromJson = useCallback(async (json: string | object, options?: { name?: string; duplicate?: boolean }) => {
    flowLogger('📥 Importando flow desde JSON:', { hasName: !!options?.name })
    setLoading(true)
    setError(null)
    
    try {
      const result = await importFlow(json, options)
      
      // COMENTADO: Recarga innecesaria que solo alenta la app
      // await loadFlows()
      
      // Seleccionar el flow importado
      setActiveFlowId(result.id)
      renderFlow(result.id)
      
      flowLogger('✅ Flow importado:', { id: result.id })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al importar flow'
      flowLogger('❌ Error al importar flow:', errorMessage)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [loadFlows, renderFlow, setLoading, setError, setActiveFlowId])

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
    createNewFlow,
    removeFlow,
    duplicateExistingFlow,
    importFlowFromJson,
  }
}

