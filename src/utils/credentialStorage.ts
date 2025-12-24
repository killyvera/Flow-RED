/**
 * Sistema de almacenamiento de credenciales encriptadas
 * 
 * Wrapper especializado para API keys, tokens, y credenciales de nodos IA.
 * Usa el sistema de almacenamiento encriptado con convenciones específicas.
 */

import { setEncrypted, getEncrypted, removeEncrypted, listEncryptedKeys } from './encryptedStorage'

// Prefijos para organizar credenciales
const CREDENTIAL_PREFIX = 'credential:'
const API_KEY_PREFIX = 'api-key:'
const NODE_CONFIG_PREFIX = 'node-config:'

/**
 * Guarda una API key encriptada
 * 
 * @param service Nombre del servicio (ej: 'azure-openai', 'anthropic', 'openai')
 * @param apiKey La API key a guardar
 */
export async function saveApiKey(service: string, apiKey: string): Promise<void> {
  const key = `${API_KEY_PREFIX}${service}`
  await setEncrypted(key, { apiKey, service, timestamp: Date.now() }, false)
  console.log(`✅ API key guardada para servicio: ${service}`)
}

/**
 * Obtiene una API key encriptada
 * 
 * @param service Nombre del servicio
 * @returns La API key o null si no existe
 */
export async function getApiKey(service: string): Promise<string | null> {
  const key = `${API_KEY_PREFIX}${service}`
  const data = await getEncrypted(key)
  return data?.apiKey || null
}

/**
 * Elimina una API key
 */
export async function removeApiKey(service: string): Promise<void> {
  const key = `${API_KEY_PREFIX}${service}`
  await removeEncrypted(key)
}

/**
 * Lista todos los servicios con API keys guardadas
 */
export async function listApiKeyServices(): Promise<string[]> {
  const allKeys = await listEncryptedKeys()
  return allKeys
    .filter(key => key.startsWith(API_KEY_PREFIX))
    .map(key => key.replace(API_KEY_PREFIX, ''))
}

/**
 * Guarda credenciales de un nodo específico
 * 
 * @param nodeId ID del nodo
 * @param credentials Objeto con las credenciales (ej: { apiKey: '...', token: '...' })
 */
export async function saveNodeCredentials(
  nodeId: string,
  credentials: Record<string, string>
): Promise<void> {
  const key = `${CREDENTIAL_PREFIX}${nodeId}`
  await setEncrypted(key, {
    nodeId,
    credentials,
    timestamp: Date.now(),
  }, false)
  console.log(`✅ Credenciales guardadas para nodo: ${nodeId}`)
}

/**
 * Obtiene credenciales de un nodo específico
 */
export async function getNodeCredentials(nodeId: string): Promise<Record<string, string> | null> {
  const key = `${CREDENTIAL_PREFIX}${nodeId}`
  const data = await getEncrypted(key)
  return data?.credentials || null
}

/**
 * Elimina credenciales de un nodo
 */
export async function removeNodeCredentials(nodeId: string): Promise<void> {
  const key = `${CREDENTIAL_PREFIX}${nodeId}`
  await removeEncrypted(key)
}

/**
 * Guarda configuración completa de un nodo IA (incluyendo credenciales)
 * 
 * @param nodeId ID del nodo
 * @param config Configuración completa (endpoint, deployment, apiVersion, etc.)
 * @param credentials Credenciales (apiKey, token, etc.)
 */
export async function saveNodeConfig(
  nodeId: string,
  config: Record<string, any>,
  credentials: Record<string, string>
): Promise<void> {
  const key = `${NODE_CONFIG_PREFIX}${nodeId}`
  await setEncrypted(key, {
    nodeId,
    config,
    credentials,
    timestamp: Date.now(),
  }, false)
  console.log(`✅ Configuración completa guardada para nodo: ${nodeId}`)
}

/**
 * Obtiene configuración completa de un nodo IA
 */
export async function getNodeConfig(nodeId: string): Promise<{
  config: Record<string, any>
  credentials: Record<string, string>
} | null> {
  const key = `${NODE_CONFIG_PREFIX}${nodeId}`
  const data = await getEncrypted(key)
  if (!data) return null
  
  return {
    config: data.config || {},
    credentials: data.credentials || {},
  }
}

/**
 * Lista todos los nodos con credenciales guardadas
 */
export async function listNodesWithCredentials(): Promise<string[]> {
  const allKeys = await listEncryptedKeys()
  return allKeys
    .filter(key => key.startsWith(CREDENTIAL_PREFIX) || key.startsWith(NODE_CONFIG_PREFIX))
    .map(key => {
      if (key.startsWith(CREDENTIAL_PREFIX)) {
        return key.replace(CREDENTIAL_PREFIX, '')
      }
      return key.replace(NODE_CONFIG_PREFIX, '')
    })
}

/**
 * Exporta todas las credenciales (para backup)
 * 
 * ⚠️ ADVERTENCIA: Esto exporta datos sensibles. Asegúrate de proteger el archivo.
 */
export async function exportCredentials(): Promise<{
  apiKeys: Record<string, string>
  nodeCredentials: Record<string, Record<string, string>>
  timestamp: number
}> {
  const apiKeys: Record<string, string> = {}
  const nodeCredentials: Record<string, Record<string, string>> = {}
  
  // Exportar API keys
  const services = await listApiKeyServices()
  for (const service of services) {
    const apiKey = await getApiKey(service)
    if (apiKey) {
      apiKeys[service] = apiKey
    }
  }
  
  // Exportar credenciales de nodos
  const nodeIds = await listNodesWithCredentials()
  for (const nodeId of nodeIds) {
    const creds = await getNodeCredentials(nodeId)
    if (creds) {
      nodeCredentials[nodeId] = creds
    }
  }
  
  return {
    apiKeys,
    nodeCredentials,
    timestamp: Date.now(),
  }
}

/**
 * Importa credenciales desde un backup
 * 
 * ⚠️ ADVERTENCIA: Esto sobrescribe credenciales existentes.
 */
export async function importCredentials(data: {
  apiKeys?: Record<string, string>
  nodeCredentials?: Record<string, Record<string, string>>
}): Promise<void> {
  // Importar API keys
  if (data.apiKeys) {
    for (const [service, apiKey] of Object.entries(data.apiKeys)) {
      await saveApiKey(service, apiKey)
    }
  }
  
  // Importar credenciales de nodos
  if (data.nodeCredentials) {
    for (const [nodeId, credentials] of Object.entries(data.nodeCredentials)) {
      await saveNodeCredentials(nodeId, credentials)
    }
  }
  
  console.log('✅ Credenciales importadas exitosamente')
}

