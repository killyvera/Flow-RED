/**
 * Cliente API base para Node-RED
 * 
 * Configuración del cliente HTTP que se conectará a la API de Node-RED.
 */

import type {
  NodeRedFlowsResponse,
  NodeRedNodesResponse,
  NodeRedNode,
} from './types'
import { extractFlows as extractFlowsHelper, isV2Response } from './types'
import { apiLogger, logRequest, logResponse, logError } from '@/utils/logger'
import { validateFlowBeforeDeploy } from '@/utils/flowValidator'

/**
 * Obtiene la URL base de Node-RED desde las variables de entorno
 * @returns URL base de Node-RED (default: http://localhost:1880)
 */
export function getNodeRedBaseUrl(): string {
  const url = import.meta.env.VITE_NODE_RED_URL
  if (!url) {
    apiLogger('⚠️ VITE_NODE_RED_URL no está definida. Usando http://localhost:1880 por defecto.')
    return 'http://localhost:1880'
  }
  apiLogger('📍 URL base de Node-RED:', url)
  return url
}

/**
 * Cliente HTTP base para hacer requests a Node-RED
 * 
 * Por ahora es una función helper básica. En el futuro se puede
 * extender con interceptors, manejo de errores centralizado, etc.
 */
export async function nodeRedRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getNodeRedBaseUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  const method = options?.method || 'GET'
  logRequest(method, url, options)
  
  try {
      // Preparar headers: Content-Type para requests con body, Accept para indicar formato deseado
      const defaultHeaders: HeadersInit = {}
      
      // Solo agregar Content-Type si hay body y no está ya especificado
      if (options?.body && !options?.headers?.['Content-Type']) {
        defaultHeaders['Content-Type'] = 'application/json'
      }
      
      // Si no hay Accept header, agregarlo por defecto para JSON
      if (!options?.headers?.['Accept'] && !options?.headers?.['accept']) {
        defaultHeaders['Accept'] = 'application/json'
      }
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options?.headers,
        },
      })
    
    logResponse(url, response.status)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      const error = new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`)
      logError(url, error)
      throw error
    }
    
    // Verificar que la respuesta sea JSON antes de parsear
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      // Si es HTML, es probable que el endpoint no esté disponible o esté devolviendo documentación
      if (contentType.includes('text/html')) {
        const error = new Error(`Endpoint ${endpoint} devuelve HTML en lugar de JSON. El endpoint puede no estar disponible en esta versión de Node-RED.`)
        logError(url, error)
        throw error
      }
      // Para otros tipos de contenido, intentar parsear de todos modos (algunos servidores no envían el header correcto)
      const text = await response.text()
      // Si el texto comienza con HTML, es definitivamente HTML
      if (text.trim().startsWith('<!--') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        const error = new Error(`Endpoint ${endpoint} devuelve HTML en lugar de JSON. El endpoint puede no estar disponible en esta versión de Node-RED.`)
        logError(url, error)
        throw error
      }
      // Si no es HTML obvio, intentar parsear como JSON
      try {
        return JSON.parse(text)
      } catch (parseErr) {
        const error = new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`)
        logError(url, error)
        throw error
      }
    }
    
    const data = await response.json()
    apiLogger('✓ Response recibida:', { endpoint, dataLength: JSON.stringify(data).length })
    return data
  } catch (err) {
    logError(url, err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}

/**
 * Obtiene los flows desde Node-RED
 * 
 * Soporta ambas versiones de la API:
 * - v1: Retorna array directo de flows
 * - v2: Retorna objeto con {rev, flows}
 * 
 * Por defecto usa v2, pero maneja automáticamente ambas versiones.
 * 
 * @param apiVersion Versión de la API a usar ('v1' | 'v2'). Por defecto 'v2'
 * @returns Promise con el array de flows (NodeRedNode[])
 */
export async function getFlows(
  apiVersion: 'v1' | 'v2' = 'v2'
): Promise<NodeRedNode[]> {
  apiLogger('📥 Obteniendo flows desde Node-RED (API v' + apiVersion + ')...')
  
  const headers: HeadersInit = {
    'Node-RED-API-Version': apiVersion,
  }

  const response = await nodeRedRequest<NodeRedFlowsResponse>('/flows', {
    headers,
  })

  // Extraer el array de flows independientemente de la versión
  const flows = extractFlowsHelper(response)
  apiLogger('✓ Flows obtenidos:', { count: flows.length, flows: flows.map(f => ({ id: f.id, type: f.type, name: f.name || f.label })) })
  
  return flows
}

// Cache para evitar llamadas duplicadas simultáneas
let nodesCache: { promise: Promise<NodeRedNodesResponse> | null; data: NodeRedNodesResponse | null } = {
  promise: null,
  data: null,
}

/**
 * Obtiene información sobre los tipos de nodos disponibles en Node-RED
 * 
 * Usa un cache para evitar llamadas duplicadas simultáneas.
 * 
 * @returns Promise con información de los nodos disponibles
 */
export async function getNodes(): Promise<NodeRedNodesResponse> {
  // Si hay una petición en curso, reutilizarla
  if (nodesCache.promise) {
    apiLogger('📥 Reutilizando petición de nodos en curso...')
    return nodesCache.promise
  }
  
  // Si ya tenemos datos cacheados, retornarlos
  if (nodesCache.data) {
    apiLogger('📥 Usando nodos desde cache')
    return Promise.resolve(nodesCache.data)
  }
  
  apiLogger('📥 Obteniendo información de nodos desde Node-RED...')
  
  // Crear la petición y guardarla en cache
  nodesCache.promise = (async () => {
    try {
      // IMPORTANTE: Node-RED requiere el header Accept: application/json
      // para devolver JSON en lugar de HTML (documentación)
      const nodes = await nodeRedRequest<NodeRedNodesResponse>('/nodes', {
        headers: {
          'Accept': 'application/json',
        },
      })
      apiLogger('✓ Nodos obtenidos:', { count: Object.keys(nodes).length })
      nodesCache.data = nodes
      return nodes
    } catch (err) {
      // El endpoint /nodes puede no estar disponible en todas las versiones de Node-RED
      // o puede requerir autenticación. Retornar objeto vacío en caso de error.
      apiLogger('⚠️ No se pudo obtener información de nodos. El endpoint /nodes puede no estar disponible.')
      const emptyResponse = {}
      nodesCache.data = emptyResponse
      return emptyResponse
    } finally {
      // Limpiar la petición en curso después de completarse
      nodesCache.promise = null
    }
  })()
  
  return nodesCache.promise
}

/**
 * Obtiene los nodos disponibles para usar en la paleta
 * 
 * Parsea la respuesta de /nodes y estructura la información de manera útil
 * para mostrar en la paleta de nodos.
 * 
 * @returns Promise con array de definiciones de nodos disponibles
 */
export async function getAvailableNodes(): Promise<Array<{
  id: string
  type: string
  name: string
  category?: string
  module: string
  enabled: boolean
  [key: string]: any
}>> {
  apiLogger('📥 Obteniendo nodos disponibles para paleta...')
  
  try {
    const nodesResponse = await getNodes()
    
    const availableNodes: Array<{
      id: string
      type: string
      name: string
      category?: string
      module: string
      enabled: boolean
      [key: string]: any
    }> = []
    
    // Parsear la respuesta y extraer tipos de nodos
    // La respuesta de Node-RED puede ser un array o un objeto
    // Usar un Map para evitar duplicados basados en el tipo de nodo
    const seenNodeTypes = new Set<string>()
    
    // Manejar tanto array como objeto
    const entries = Array.isArray(nodesResponse) 
      ? nodesResponse.map((item, index) => [index.toString(), item])
      : Object.entries(nodesResponse)
    
    
    entries.forEach(([moduleId, moduleInfo]: [string, any]) => {
      
      if (moduleInfo && moduleInfo.types && Array.isArray(moduleInfo.types)) {
        moduleInfo.types.forEach((nodeType: string) => {
          // Usar el tipo de nodo como clave única (case-insensitive para evitar duplicados)
          const normalizedType = nodeType.toLowerCase().trim()
          
          // Si ya existe, no agregarlo de nuevo
          if (!seenNodeTypes.has(normalizedType)) {
            seenNodeTypes.add(normalizedType)
            availableNodes.push({
              id: `${moduleId}.${nodeType}`, // ID único con módulo para referencia
              type: nodeType, // Tipo único del nodo (usado como clave principal)
              name: moduleInfo.name || nodeType,
              category: moduleInfo.category || moduleId,
              module: moduleId,
              enabled: moduleInfo.enabled !== false,
            })
          }
        })
      }
    })
    
    
    // Agregar "group" si no está presente (los grupos son especiales y pueden no estar en /nodes)
    const hasGroup = availableNodes.some(n => n.type.toLowerCase() === 'group')
    if (!hasGroup) {
      apiLogger('➕ Agregando "group" a la lista de nodos disponibles (no está en /nodes)')
      availableNodes.unshift({
        id: 'group',
        type: 'group',
        name: 'Group',
        category: 'layout',
        module: 'node-red',
        enabled: true,
      })
    }
    
    // Ordenar por nombre para mejor visualización
    availableNodes.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return a.type.localeCompare(b.type)
    })
    
    apiLogger('✓ Nodos disponibles parseados:', { 
      count: availableNodes.length,
      uniqueTypes: seenNodeTypes.size,
      modules: entries.length
    })
    return availableNodes
  } catch (err) {
    // Si falla, retornar array vacío (el componente usará la lista por defecto)
    apiLogger('⚠️ Error al obtener nodos disponibles, retornando lista vacía')
    return []
  }
}

/**
 * Guarda un flow en Node-RED
 * 
 * Usa PUT /flows con la API v2 para guardar el flow completo.
 * Maneja la versión (rev) para evitar conflictos.
 * 
 * @param flowId ID del flow a guardar
 * @param nodes Array de nodos del flow en formato Node-RED
 * @param rev Versión/revisión actual del flow (opcional, se obtiene automáticamente si no se proporciona)
 * @returns Promise con la respuesta del servidor
 */
export interface SaveFlowError extends Error {
  code?: string
  validationErrors?: string[]
  validationWarnings?: string[]
  httpStatus?: number
  nodeRedError?: any
}

/**
 * Activa un nodo inject manualmente
 * 
 * @param nodeId ID del nodo inject a activar
 * @returns Promise que se resuelve cuando el nodo se activa
 */
export async function triggerInjectNode(nodeId: string): Promise<void> {
  apiLogger(`🖱️ Activando nodo inject: ${nodeId}`)
  
  try {
    // Node-RED API para activar un nodo inject: POST /inject/:id
    // El endpoint está bajo el admin API, que por defecto está en la raíz
    // pero puede estar en /admin/ si httpAdminRoot está configurado
    const baseUrl = getNodeRedBaseUrl()
    
    // Intentar primero en la raíz (comportamiento por defecto)
    let url = `${baseUrl}/inject/${nodeId}`
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Si falla con 404, intentar con /admin/
    if (!response.ok && response.status === 404) {
      apiLogger(`⚠️ Endpoint /inject/${nodeId} no encontrado, intentando /admin/inject/${nodeId}`)
      url = `${baseUrl}/admin/inject/${nodeId}`
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      
      // Mensajes de error más descriptivos
      if (response.status === 404) {
        throw new Error(`Nodo no encontrado (404). Verifica que el nodo con ID "${nodeId}" existe y está desplegado.`)
      } else if (response.status === 403) {
        throw new Error(`Acceso denegado (403). Verifica la autenticación de Node-RED.`)
      } else if (response.status === 500) {
        throw new Error(`Error del servidor (500). El nodo puede no estar desplegado o tener un error.`)
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    apiLogger(`✅ Nodo inject activado: ${nodeId}`)
  } catch (err: any) {
    apiLogger(`❌ Error al activar nodo inject ${nodeId}:`, err.message)
    throw err
  }
}

export async function saveFlow(
  flowId: string,
  nodes: NodeRedNode[],
  rev?: string
): Promise<{ rev: string }> {
  apiLogger('💾 Guardando flow:', { flowId, nodesCount: nodes.length })
  
  // Validar el flow antes de enviarlo
  const validation = validateFlowBeforeDeploy(nodes)
  if (!validation.isValid) {
    const errorMessage = `El flow no es válido:\n${validation.errors.join('\n')}`
    apiLogger('❌ Validación fallida:', validation.errors)
    const error: SaveFlowError = new Error(errorMessage)
    error.code = 'VALIDATION_ERROR'
    error.validationErrors = validation.errors
    error.validationWarnings = validation.warnings
    throw error
  }

  // Mostrar warnings si existen (pero no bloquear el deploy)
  if (validation.warnings.length > 0) {
    apiLogger('⚠️ Advertencias de validación:', validation.warnings)
  }
  
  // Si no se proporciona rev, obtenerla primero
  let currentRev = rev
  if (!currentRev) {
    try {
      const flowsResponse = await nodeRedRequest<NodeRedFlowsResponse>('/flows', {
        headers: { 'Node-RED-API-Version': 'v2' },
      })
      if (isV2Response(flowsResponse)) {
        currentRev = flowsResponse.rev
      }
    } catch (err) {
      apiLogger('⚠️ No se pudo obtener rev, usando string vacío')
      currentRev = ''
    }
  }
  
  // Incluir el nodo tab del flow en los nodos a guardar
  const flowTab = nodes.find(n => n.type === 'tab' && n.id === flowId)
  const nodesToSave = flowTab ? nodes : [
    {
      id: flowId,
      type: 'tab',
      label: `Flow ${flowId.slice(0, 8)}`,
      disabled: false,
      info: '',
      x: 0,  // Los tabs necesitan x e y para pasar la validación
      y: 0,  // aunque no los usen visualmente
    } as NodeRedNode,
    ...nodes,
  ]
  
  // Preparar el payload para la API v2
  const payload = {
    rev: currentRev || '',
    flows: nodesToSave,
  }
  
  apiLogger('📤 Enviando flow a Node-RED:', { 
    rev: currentRev, 
    totalNodes: nodesToSave.length 
  })
  
  try {
    const response = await nodeRedRequest<{ rev: string }>('/flows', {
      method: 'POST', // Node-RED usa POST para actualizar flows
      headers: {
        'Node-RED-API-Version': 'v2',
      },
      body: JSON.stringify(payload),
    })
    
    apiLogger('✅ Flow guardado exitosamente:', { rev: response.rev })
    return response
  } catch (err: any) {
    // Mejorar el manejo de errores con información específica
    const error: SaveFlowError = new Error(
      err.message || 'Error al guardar el flow en Node-RED'
    )
    error.code = 'SAVE_ERROR'
    
    // Si es un error HTTP, capturar el status
    if (err.message && err.message.includes('HTTP error! status:')) {
      const statusMatch = err.message.match(/status: (\d+)/)
      if (statusMatch) {
        error.httpStatus = parseInt(statusMatch[1], 10)
        
        // Mensajes específicos según el código de estado
        if (error.httpStatus === 400) {
          error.message = 'El flow enviado no es válido. Verifica la estructura de los nodos.'
        } else if (error.httpStatus === 409) {
          error.message = 'Conflicto de versión. El flow fue modificado por otro usuario. Recarga y vuelve a intentar.'
        } else if (error.httpStatus === 404) {
          error.message = 'El flow no existe en Node-RED.'
        } else if (error.httpStatus >= 500) {
          error.message = 'Error del servidor Node-RED. Verifica que Node-RED esté funcionando correctamente.'
        }
      }
    }
    
    // Intentar parsear el error de Node-RED si está disponible
    if (err.nodeRedError) {
      error.nodeRedError = err.nodeRedError
    }
    
    apiLogger('❌ Error al guardar flow:', error.message)
    throw error
  }
}

/**
 * Configuración del cliente API
 * Se puede extender con más opciones en el futuro
 */
export const apiClient = {
  baseUrl: getNodeRedBaseUrl(),
  getFlows,
  getNodes,
  getAvailableNodes,
  saveFlow,
}

