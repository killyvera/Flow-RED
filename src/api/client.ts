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
      const defaultHeaders: Record<string, string> = {}
      
      // Solo agregar Content-Type si hay body y no está ya especificado
      const existingHeaders = options?.headers as Record<string, string> | undefined
      if (options?.body && !existingHeaders?.['Content-Type']) {
        defaultHeaders['Content-Type'] = 'application/json'
      }
      
      // Si no hay Accept header, agregarlo por defecto para JSON
      if (!existingHeaders?.['Accept'] && !existingHeaders?.['accept']) {
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
    
    
    entries.forEach((entry: [string, any] | any[]) => {
      const [moduleId, moduleInfo] = Array.isArray(entry) && entry.length >= 2 ? entry : [String(entry[0]), entry[1]]
      
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
    // Verificar primero si el nodo existe en Node-RED obteniendo todos los flows
    // Esto nos ayuda a diagnosticar si el problema es que el nodo no existe o el ID no coincide
    let nodeExists = false
    let nodeDisabled = false
    let availableInjectNodes: Array<{ id: string; name?: string; z?: string; disabled?: boolean }> = []
    try {
      const allFlows = await getFlows('v2')
      apiLogger(`🔍 [triggerInjectNode] Verificando nodo "${nodeId}" en ${allFlows.length} nodos totales`)
      
      const targetNode = allFlows.find(node => node.id === nodeId && node.type === 'inject')
      nodeExists = !!targetNode
      
      if (targetNode) {
        nodeDisabled = targetNode.disabled === true
        apiLogger(`✅ [triggerInjectNode] Nodo encontrado en flow JSON:`, {
          id: targetNode.id,
          type: targetNode.type,
          name: targetNode.name || targetNode.label,
          z: targetNode.z,
          disabled: targetNode.disabled,
        })
      } else {
        apiLogger(`❌ [triggerInjectNode] Nodo "${nodeId}" NO encontrado en flow JSON`)
      }
      
      availableInjectNodes = allFlows
        .filter(n => n.type === 'inject')
        .map(n => ({ id: n.id, name: n.name || n.label, z: n.z, disabled: n.disabled }))
      
      apiLogger(`📋 [triggerInjectNode] Total de nodos inject en flow JSON: ${availableInjectNodes.length}`)
      apiLogger(`📋 [triggerInjectNode] Primeros 10 nodos inject:`, availableInjectNodes.slice(0, 10))
      
      if (!nodeExists) {
        apiLogger(`⚠️ Nodo inject con ID "${nodeId}" no encontrado en los flows de Node-RED`)
        apiLogger(`📋 Nodos inject disponibles:`, availableInjectNodes)
        // Si el nodo no existe en el flow JSON, no intentar activarlo
        // Lanzar error inmediatamente en lugar de hacer polling
        throw new Error(`El nodo inject con ID "${nodeId}" no existe en Node-RED. Asegúrate de que el flow esté guardado y desplegado antes de intentar activar el nodo.`)
      } else if (nodeDisabled) {
        apiLogger(`⚠️ Nodo inject con ID "${nodeId}" está deshabilitado`)
        throw new Error(`El nodo inject con ID "${nodeId}" está deshabilitado. Habilítalo en el panel de propiedades antes de activarlo.`)
      } else if (targetNode) {
        apiLogger(`✅ [triggerInjectNode] Nodo existe y está habilitado en flow JSON, intentando activar en runtime...`)
        
        // CRÍTICO: Verificar si el flow está deshabilitado
        const flowTab = allFlows.find(n => n.type === 'tab' && n.id === targetNode.z)
        if (flowTab) {
          apiLogger(`📋 [triggerInjectNode] Estado del flow:`, {
            id: flowTab.id,
            label: flowTab.label,
            disabled: flowTab.disabled,
          })
          if (flowTab.disabled === true) {
            apiLogger(`⚠️ [triggerInjectNode] El flow "${targetNode.z}" está deshabilitado`)
            throw new Error(`El flow "${flowTab.label || flowTab.id}" está deshabilitado. Habilítalo antes de activar nodos inject.`)
          }
        } else {
          apiLogger(`⚠️ [triggerInjectNode] No se encontró el flow tab "${targetNode.z}" para el nodo`)
        }
      }
    } catch (verifyErr) {
      // Si es un error que lanzamos nosotros (nodo deshabilitado o no existe), re-lanzarlo
      if (verifyErr instanceof Error && (
        verifyErr.message.includes('deshabilitado') || 
        verifyErr.message.includes('no existe en Node-RED')
      )) {
        throw verifyErr
      }
      apiLogger(`⚠️ No se pudo verificar si el nodo existe:`, verifyErr)
      // Continuar de todos modos - el polling intentará activar el nodo
      // Si el nodo no existe, el polling fallará con un mensaje claro
    }
    
    // Node-RED API para activar un nodo inject: POST /inject/:id
    // El endpoint está bajo el admin API, que por defecto está en la raíz
    // pero puede estar en /admin/ si httpAdminRoot está configurado
    const baseUrl = getNodeRedBaseUrl()
    
    // HIPÓTESIS: El problema podría ser que el nodo se guarda pero no se despliega correctamente.
    // Verificar si el nodo está disponible en el runtime ANTES de intentar activarlo.
    // Si el nodo no está disponible después de guardar, podría ser un problema con el despliegue.
    // 
    // CRÍTICO: El despliegue en Node-RED es completamente asíncrono
    // Si el nodo existe en el flow JSON pero no está disponible en el runtime,
    // puede ser que el despliegue aún no haya terminado. 
    // 
    // SOLUCIÓN: Hacer polling del endpoint con retry exponencial hasta que esté disponible
    // o hasta alcanzar el tiempo máximo. Esto es más robusto que esperar un tiempo fijo.
    // 
    // NOTA: El despliegue puede tardar más de 10 segundos en flows complejos o con muchos nodos.
    // Aumentamos el tiempo máximo a 30 segundos para dar más margen.
    const maxPollingAttempts = 10 // Reducir a 10 intentos (suficiente para la mayoría de casos)
    const initialPollingInterval = 1000 // 1 segundo inicial (más tiempo entre intentos)
    const maxPollingInterval = 3000 // 3 segundos máximo entre intentos
    const maxPollingTime = 20000 // 20 segundos máximo total (suficiente para la mayoría de casos)
    
    // URLs posibles para el endpoint (dependiendo de la configuración de httpAdminRoot)
    // Según la documentación de Node-RED, el endpoint está registrado como:
    // RED.httpAdmin.post("/inject/:id", ...)
    // Esto significa que está bajo httpAdminRoot, que por defecto es "/"
    // Pero si httpAdminRoot está configurado como "/admin", el endpoint completo sería "/admin/inject/:id"
    // IMPORTANTE: El orden importa - intentar primero la URL más común
    const possibleUrls = [
      `${baseUrl}/inject/${nodeId}`,      // URL por defecto (httpAdminRoot = "/")
      `${baseUrl}/admin/inject/${nodeId}`, // URL alternativa (httpAdminRoot = "/admin")
    ]
    
    let response: Response | null = null
    let lastError: string | null = null
    
    // Intentar activar el nodo con polling inteligente
    // Si recibimos 404, esperamos y volvemos a intentar hasta que el endpoint esté disponible
    const pollingStartTime = Date.now()
    let pollingInterval = initialPollingInterval
    
    for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
      // Verificar si hemos excedido el tiempo máximo
      if (Date.now() - pollingStartTime > maxPollingTime) {
        apiLogger(`⏱️ [triggerInjectNode] Tiempo máximo de polling excedido (${maxPollingTime}ms)`)
        break
      }
      
      if (attempt > 1) {
        apiLogger(`🔄 [triggerInjectNode] Reintentando activación (intento ${attempt}/${maxPollingAttempts})...`)
        await new Promise(resolve => setTimeout(resolve, pollingInterval))
        // Aumentar el intervalo exponencialmente, pero con un máximo
        pollingInterval = Math.min(pollingInterval * 1.2, maxPollingInterval)
      }
      
      // Intentar ambas URLs posibles en cada intento
      // Esto es necesario porque no sabemos cuál es la configuración de httpAdminRoot
      let foundWorkingUrl = false
      
      for (const url of possibleUrls) {
        // Solo loguear el primer intento y cada 5 intentos para evitar spam en la consola
        if (attempt === 1 || attempt % 5 === 0) {
          apiLogger(`📡 [triggerInjectNode] Intentando activar nodo en: ${url} (intento ${attempt}/${maxPollingAttempts})`)
        }
        
        try {
          // CRÍTICO: Usar XMLHttpRequest en lugar de fetch para poder silenciar completamente los errores 404
          // Esto evita que el navegador muestre los errores en la consola
          response = await new Promise<Response>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', url, true)
            xhr.setRequestHeader('Content-Type', 'application/json')
            
            // Silenciar errores: no mostrar en consola
            xhr.onerror = () => {
              // Crear una respuesta simulada con 404 sin mostrar error en consola
              resolve(new Response(null, { status: 404, statusText: 'Not Found' }))
            }
            
            xhr.onload = () => {
              // Crear una respuesta desde XMLHttpRequest
              const response = new Response(xhr.responseText, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers({
                  'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json',
                }),
              })
              resolve(response)
            }
            
            xhr.send()
          })
          
          // Solo loguear respuestas exitosas o errores no-404 para evitar spam
          if (response.ok) {
            apiLogger(`✅ [triggerInjectNode] Nodo activado exitosamente después de ${attempt} intentos en ${url}`)
            foundWorkingUrl = true
            break
          } else if (response.status !== 404) {
            // Solo loguear errores que no sean 404
            apiLogger(`📡 [triggerInjectNode] Respuesta del servidor: ${response.status} ${response.statusText}`)
          }
          
          // Si es 404, el endpoint aún no está disponible o esta URL no es la correcta
          // Continuar con la siguiente URL o con el siguiente intento
          // CRÍTICO: No loguear errores 404 para evitar spam en la consola del navegador
          // El navegador ya muestra el error 404 en la consola, no necesitamos duplicarlo
          if (response.status === 404) {
            lastError = `${response.status} ${response.statusText}`
            // Silenciar: no loguear errores 404 para evitar spam
            // Continuar con la siguiente URL si hay más
            continue
          }
          
          // Si es otro error (no 404), el endpoint está disponible pero hay un problema
          // Salir del loop de URLs
          lastError = `${response.status} ${response.statusText}`
          foundWorkingUrl = true
          break
        } catch (fetchErr: any) {
          lastError = fetchErr.message || 'Error de red'
          apiLogger(`⚠️ [triggerInjectNode] Error en intento ${attempt} con URL ${url}:`, lastError)
          // Continuar con la siguiente URL si hay más
          continue
        }
      }
      
      // Si encontramos una URL que funciona (aunque haya dado error), salir del loop de intentos
      if (foundWorkingUrl && response && response.ok) {
        break
      }
      
      // Si encontramos una URL que funciona pero dio error (no 404), también salir
      // porque el endpoint está disponible pero hay otro problema
      if (foundWorkingUrl && response && !response.ok && response.status !== 404) {
        break
      }
      
      // Si todas las URLs dieron 404, continuar con el siguiente intento de polling
      // (el delay ya se aplicó arriba si attempt > 1)
    }
    
    // Si después de todos los intentos no hay respuesta exitosa, procesar el error
    if (!response || !response.ok) {
      const errorText = lastError || (response ? await response.text().catch(() => 'Unknown error') : 'No response')
      const statusCode = response?.status || 404
      
      // Mensajes de error más descriptivos
      if (statusCode === 404) {
        // Si verificamos que el nodo no existe en el flow JSON, dar un mensaje más específico
        if (!nodeExists) {
          const availableIds = availableInjectNodes.slice(0, 5).map(n => n.id).join(', ')
          throw new Error(`Nodo no encontrado (404). El nodo con ID "${nodeId}" no existe en Node-RED.\n\nPosibles causas:\n1. El nodo no se guardó correctamente. Guarda el flow usando "Save & Deploy".\n2. El ID del nodo cambió después de guardar. Recarga los flows para sincronizar.\n\nNodos inject disponibles (primeros 5): ${availableIds || 'ninguno'}`)
        }
        // Si el nodo existe en el flow JSON pero el endpoint devuelve 404, puede ser que no esté desplegado
        // o que el ID haya cambiado después de guardar
        throw new Error(`Nodo no encontrado (404). El nodo con ID "${nodeId}" existe en el flow pero no está desplegado en el runtime después de ${maxPollingAttempts} intentos (${maxPollingTime}ms).\n\nPosibles causas:\n1. El despliegue está tomando más tiempo del esperado. Espera unos segundos y vuelve a intentar.\n2. El ID del nodo cambió después de guardar. Recarga los flows para sincronizar.\n3. El flow no se desplegó correctamente. Guarda el flow nuevamente usando "Save & Deploy".`)
      } else if (statusCode === 403) {
        throw new Error(`Acceso denegado (403). Verifica la autenticación de Node-RED.`)
      } else if (statusCode === 500) {
        throw new Error(`Error del servidor (500). El nodo puede no estar desplegado o tener un error.`)
      }
      
      throw new Error(`HTTP ${statusCode}: ${errorText}`)
    }
    
    apiLogger(`✅ Nodo inject activado: ${nodeId}`)
  } catch (err: any) {
    apiLogger(`❌ Error al activar nodo inject ${nodeId}:`, err.message)
    throw err
  }
}

/**
 * Guarda un flow en Node-RED
 * 
 * Versión simplificada: envía solo los nodos necesarios sin lógica compleja de preservación.
 * Después de guardar, SIEMPRE se debe recargar desde la API para obtener los IDs correctos.
 * 
 * @param flowId ID del flow a guardar
 * @param nodes Array de nodos del flow en formato Node-RED
 * @param rev Versión/revisión actual del flow (opcional, se obtiene automáticamente si no se proporciona)
 * @returns Promise con la respuesta del servidor (incluye rev actualizado)
 */
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
  // CRÍTICO: No crear un tab automáticamente si flowId es un subflow
  // Verificar si flowId es un subflow (existe un nodo con type='subflow' y id=flowId)
  const isSubflow = nodes.some(n => n.type === 'subflow' && n.id === flowId)
  const flowTab = nodes.find(n => n.type === 'tab' && n.id === flowId)
  
  // Si es un subflow, no crear un tab (los subflows no tienen tabs)
  // Si no es un subflow y no hay tab, crear uno
  const nodesToSave = flowTab ? nodes : (isSubflow ? nodes : [
    {
      id: flowId,
      type: 'tab',
      label: `Flow ${flowId.slice(0, 8)}`,
      disabled: false,
      info: '',
      x: 0,
      y: 0,
    } as NodeRedNode,
    ...nodes,
  ])
  
  // Preparar el payload simple para la API v2
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
      method: 'POST',
      headers: {
        'Node-RED-API-Version': 'v2',
        'Node-RED-Deployment-Type': 'full',
      },
      body: JSON.stringify(payload),
    })
    
    apiLogger('✅ Flow guardado exitosamente:', { rev: response.rev })
    
    // CRÍTICO: El despliegue en Node-RED es completamente asíncrono
    // La función start() se ejecuta pero no se espera antes de devolver la respuesta
    // Si el despliegue falla, el error se captura pero no se propaga al cliente
    // Por lo tanto, no podemos verificar si el despliegue fue exitoso inmediatamente después de guardar
    // El polling en triggerInjectNode manejará el caso donde el usuario intenta activar el nodo
    // 
    // NOTA: No hacemos polling aquí porque:
    // 1. El despliegue puede tardar varios segundos en flows complejos
    // 2. El usuario no está esperando activamente, así que no tiene sentido esperar aquí
    // 3. Si el despliegue falla, el usuario lo notará cuando intente activar el nodo
    // 4. El polling en triggerInjectNode es más robusto y maneja mejor los errores
    
    return response
  } catch (err: any) {
    // Manejo de errores con información específica
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
 * Obtiene un flow específico por ID
 * 
 * @param flowId ID del flow a obtener
 * @returns Promise con el flow completo y todos sus nodos
 */
export async function getFlow(flowId: string): Promise<NodeRedNode> {
  apiLogger('📥 Obteniendo flow:', { flowId })
  
  try {
    const response = await nodeRedRequest<NodeRedNode>(`/flow/${flowId}`, {
      headers: {
        'Node-RED-API-Version': 'v2',
      },
    })
    
    apiLogger('✅ Flow obtenido:', { flowId, hasNodes: !!response })
    return response
  } catch (err) {
    apiLogger('❌ Error al obtener flow:', err)
    throw err
  }
}

/**
 * Crea un nuevo flow vacío
 * 
 * @param name Nombre del flow
 * @param options Opciones adicionales (disabled, info)
 * @returns Promise con el ID del flow creado
 */
export async function createFlow(
  name: string,
  options?: { disabled?: boolean; info?: string }
): Promise<{ id: string }> {
  apiLogger('➕ Creando flow:', { name, options })
  
  try {
    const flowPayload = {
      label: name,
      nodes: [],
      ...(options?.disabled !== undefined && { disabled: options.disabled }),
      ...(options?.info && { info: options.info }),
    }
    
    const response = await nodeRedRequest<{ id: string }>('/flow', {
      method: 'POST',
      headers: {
        'Node-RED-API-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowPayload),
    })
    
    apiLogger('✅ Flow creado:', { id: response.id, name })
    return response
  } catch (err) {
    apiLogger('❌ Error al crear flow:', err)
    throw err
  }
}

/**
 * Elimina un flow y todos sus nodos
 * 
 * @param flowId ID del flow a eliminar
 * @returns Promise que se resuelve cuando el flow se elimina
 */
export async function deleteFlow(flowId: string): Promise<void> {
  apiLogger('🗑️ Eliminando flow:', { flowId })
  
  try {
    await nodeRedRequest(`/flow/${flowId}`, {
      method: 'DELETE',
      headers: {
        'Node-RED-API-Version': 'v2',
      },
    })
    
    apiLogger('✅ Flow eliminado:', { flowId })
  } catch (err) {
    apiLogger('❌ Error al eliminar flow:', err)
    throw err
  }
}

/**
 * Duplica un flow existente
 * 
 * @param flowId ID del flow a duplicar
 * @param newName Nombre para el flow duplicado (opcional)
 * @returns Promise con el ID del flow duplicado
 */
export async function duplicateFlow(
  flowId: string,
  newName?: string
): Promise<{ id: string }> {
  apiLogger('📋 Duplicando flow:', { flowId, newName })
  
  try {
    // Obtener el flow original
    const originalFlow = await getFlow(flowId)
    
    // Obtener todos los nodos del flow original (excepto el tab)
    const allNodes = await getFlows('v2')
    const flowNodes = allNodes.filter(n => n.z === flowId && n.type !== 'tab')
    
    // Crear nuevo flow con el mismo contenido pero nuevo nombre
    const flowName = newName || `${originalFlow.label || 'Flow'} (copia)`
    
    // Crear el flow completo con sus nodos desde el inicio
    // Node-RED generará nuevos IDs automáticamente para el flow y todos los nodos
    const flowPayload = {
      label: flowName,
      nodes: flowNodes.map(node => {
        // Remover el ID para que Node-RED genere uno nuevo
        const { id, ...nodeWithoutId } = node
        return nodeWithoutId
      }),
      ...(originalFlow.disabled !== undefined && { disabled: originalFlow.disabled }),
      ...(originalFlow.info && { info: originalFlow.info }),
    }
    
    // Crear el flow con todos sus nodos
    const response = await nodeRedRequest<{ id: string }>('/flow', {
      method: 'POST',
      headers: {
        'Node-RED-API-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowPayload),
    })
    
    apiLogger('✅ Flow duplicado:', { originalId: flowId, newId: response.id })
    return response
  } catch (err) {
    apiLogger('❌ Error al duplicar flow:', err)
    throw err
  }
}

/**
 * Exporta un flow a JSON
 * 
 * @param flowId ID del flow a exportar
 * @returns Promise con el JSON del flow
 */
export async function exportFlow(flowId: string): Promise<string> {
  apiLogger('📤 Exportando flow:', { flowId })
  
  try {
    const flow = await getFlow(flowId)
    const allNodes = await getFlows('v2')
    const flowNodes = allNodes.filter(n => n.z === flowId)
    
    const exportData = {
      flow: {
        ...flow,
        nodes: flowNodes,
      },
      exportedAt: new Date().toISOString(),
    }
    
    const json = JSON.stringify(exportData, null, 2)
    apiLogger('✅ Flow exportado:', { flowId, size: json.length })
    
    return json
  } catch (err) {
    apiLogger('❌ Error al exportar flow:', err)
    throw err
  }
}

/**
 * Importa un flow desde JSON
 * 
 * @param json JSON del flow a importar (string o objeto)
 * @param options Opciones de importación (name, duplicate)
 * @returns Promise con el ID del flow importado
 */
export async function importFlow(
  json: string | object,
  options?: { name?: string; duplicate?: boolean }
): Promise<{ id: string }> {
  apiLogger('📥 Importando flow:', { hasName: !!options?.name, duplicate: options?.duplicate })
  
  try {
    // Parsear JSON si es string
    const flowData = typeof json === 'string' ? JSON.parse(json) : json
    
    // Extraer el flow del objeto (puede estar en flow.flow o directamente)
    const flow = flowData.flow || flowData
    
    // Validar estructura básica
    if (!flow.label && !flow.name) {
      throw new Error('El flow importado debe tener un nombre (label o name)')
    }
    
    // Usar nombre proporcionado o del JSON
    const flowName = options?.name || flow.label || flow.name || 'Flow importado'
    
    // Si duplicate es true, generar nuevos IDs (Node-RED lo hace automáticamente)
    const flowPayload = {
      label: flowName,
      nodes: flow.nodes || [],
      ...(flow.disabled !== undefined && { disabled: flow.disabled }),
      ...(flow.info && { info: flow.info }),
    }
    
    const response = await nodeRedRequest<{ id: string }>('/flow', {
      method: 'POST',
      headers: {
        'Node-RED-API-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowPayload),
    })
    
    apiLogger('✅ Flow importado:', { id: response.id, name: flowName })
    return response
  } catch (err) {
    apiLogger('❌ Error al importar flow:', err)
    throw err
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
  getFlow,
  createFlow,
  deleteFlow,
  duplicateFlow,
  exportFlow,
  importFlow,
}

