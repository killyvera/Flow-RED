/**
 * Node Data Transformers
 * 
 * Funciones para convertir entre el formato interno de la UI y el formato
 * que espera Node-RED. Esto asegura compatibilidad con el runtime.
 */

// ========== HTTP Request Transformers ==========

export interface HttpRequestUIData {
  method: string
  url: string
  timeout: number
  followRedirects: boolean
  headers: Record<string, string>
  body: any
  bodyMode?: 'form' | 'raw'
  contentType?: string
  // Advanced
  retryCount: number
  retryDelay: number
  useTls: boolean
  tlsConfig: string
  useProxy: boolean
  proxyConfig: string
}

export interface HttpRequestNodeRedData {
  method: string
  url: string
  timeout?: number
  followRedirects?: boolean
  headers?: Array<{ h: string; v: string }> // Node-RED format
  ret?: string // return type
  paytoqs?: string // payload to query string
  // Body data se maneja aparte en msg.payload
  // Advanced
  retry?: number
  retryDelay?: number
  tls?: string
  proxy?: string
  [key: string]: any // Allow additional properties
}

/**
 * Convertir datos de UI a formato Node-RED
 */
export function toNodeRedFormat(uiData: HttpRequestUIData): HttpRequestNodeRedData {
  const nodeRedData: HttpRequestNodeRedData = {
    method: uiData.method || 'GET',
    url: uiData.url || '',
  }

  // Timeout
  if (uiData.timeout !== undefined && uiData.timeout !== 60000) {
    nodeRedData.timeout = uiData.timeout
  }

  // Follow redirects
  if (uiData.followRedirects !== undefined && !uiData.followRedirects) {
    nodeRedData.followRedirects = false
  }

  // Headers: convertir de objeto a array de {h, v}
  if (uiData.headers && Object.keys(uiData.headers).length > 0) {
    nodeRedData.headers = Object.entries(uiData.headers).map(([key, value]) => ({
      h: key,
      v: value,
    }))
  }

  // Retry
  if (uiData.retryCount && uiData.retryCount > 0) {
    nodeRedData.retry = uiData.retryCount
    nodeRedData.retryDelay = uiData.retryDelay || 1000
  }

  // TLS
  if (uiData.useTls && uiData.tlsConfig) {
    nodeRedData.tls = uiData.tlsConfig
  }

  // Proxy
  if (uiData.useProxy && uiData.proxyConfig) {
    nodeRedData.proxy = uiData.proxyConfig
  }

  // Body se maneja en el runtime via msg.payload
  // No se guarda en la configuración del nodo

  return nodeRedData
}

/**
 * Convertir datos de Node-RED a formato UI
 */
export function fromNodeRedFormat(nodeRedData: HttpRequestNodeRedData): HttpRequestUIData {
  const uiData: HttpRequestUIData = {
    method: nodeRedData.method || 'GET',
    url: nodeRedData.url || '',
    timeout: nodeRedData.timeout !== undefined ? nodeRedData.timeout : 60000,
    followRedirects: nodeRedData.followRedirects !== undefined ? nodeRedData.followRedirects : true,
    headers: {},
    body: null,
    retryCount: nodeRedData.retry || 0,
    retryDelay: nodeRedData.retryDelay || 1000,
    useTls: Boolean(nodeRedData.tls),
    tlsConfig: nodeRedData.tls || '',
    useProxy: Boolean(nodeRedData.proxy),
    proxyConfig: nodeRedData.proxy || '',
  }

  // Headers: convertir de array {h, v} a objeto
  if (nodeRedData.headers && Array.isArray(nodeRedData.headers)) {
    uiData.headers = nodeRedData.headers.reduce((acc, header) => {
      if (header.h) {
        acc[header.h] = header.v || ''
      }
      return acc
    }, {} as Record<string, string>)
  }

  return uiData
}

/**
 * Mergear cambios de la UI con datos existentes de Node-RED,
 * preservando propiedades que la UI no maneja
 */
export function mergeNodeData(
  existingNodeRedData: any,
  uiChanges: Partial<HttpRequestUIData>
): any {
  // Convertir cambios de UI a formato Node-RED
  const fullUIData: HttpRequestUIData = {
    ...fromNodeRedFormat(existingNodeRedData),
    ...uiChanges,
  }

  const newNodeRedData = toNodeRedFormat(fullUIData)

  // Preservar propiedades que la UI no maneja
  const preservedKeys = ['x', 'y', 'z', 'id', 'type', 'name', 'wires']
  for (const key of preservedKeys) {
    if (existingNodeRedData[key] !== undefined) {
      newNodeRedData[key] = existingNodeRedData[key]
    }
  }

  return newNodeRedData
}

// ========== Generic Transformers ==========

/**
 * Convertir key-value items a objeto
 */
export function keyValueItemsToObject(
  items: Array<{ key: string; value: string; enabled?: boolean }>
): Record<string, string> {
  return items
    .filter(item => item.key.trim() !== '' && item.enabled !== false)
    .reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {} as Record<string, string>)
}

/**
 * Convertir objeto a key-value items
 */
export function objectToKeyValueItems(
  obj: Record<string, string>
): Array<{ key: string; value: string; enabled: boolean }> {
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: String(value),
    enabled: true,
  }))
}

/**
 * Sanitizar datos antes de guardar en Node-RED
 * (eliminar propiedades undefined, null, etc.)
 */
export function sanitizeNodeData(data: any): any {
  const sanitized: any = {}

  for (const [key, value] of Object.entries(data)) {
    // Omitir undefined y null
    if (value === undefined || value === null) {
      continue
    }

    // Omitir strings vacíos (excepto para algunas propiedades específicas)
    if (typeof value === 'string' && value === '' && key !== 'url') {
      continue
    }

    // Omitir arrays vacíos
    if (Array.isArray(value) && value.length === 0) {
      continue
    }

    // Omitir objetos vacíos
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}
