/**
 * Sistema de Almacenamiento de Configuraciones de Nodos
 * 
 * Permite guardar configuraciones de nodos (como deployment, apiVersion, etc.)
 * en el almacenamiento encriptado centralizado.
 * 
 * Las configuraciones se almacenan por nodeId y tipo de nodo.
 */

import { setEncrypted, getEncrypted, removeEncrypted } from './encryptedStorage'

// Prefijo para configuraciones de nodos
const NODE_CONFIG_PREFIX = 'node-config:'

/**
 * Estructura de una configuración de nodo
 */
export interface NodeConfig {
  nodeId: string
  nodeType: string
  config: Record<string, any> // Configuración del nodo (encriptada)
  updatedAt: number
}

/**
 * Guarda la configuración de un nodo
 * 
 * @param nodeId ID del nodo
 * @param nodeType Tipo del nodo (ej: 'model.azure.openai')
 * @param config Configuración a guardar
 */
export async function saveNodeConfig(
  nodeId: string,
  nodeType: string,
  config: Record<string, any>
): Promise<void> {
  if (!nodeId || !nodeType) {
    throw new Error('nodeId y nodeType son requeridos')
  }

  const nodeConfig: NodeConfig = {
    nodeId,
    nodeType,
    config,
    updatedAt: Date.now(),
  }

  const key = `${NODE_CONFIG_PREFIX}${nodeId}`
  await setEncrypted(key, nodeConfig, false) // No sincronizar con servidor por ahora

  console.log(`✅ Configuración guardada para nodo: ${nodeId} (${nodeType})`)
}

/**
 * Obtiene la configuración de un nodo
 * 
 * @param nodeId ID del nodo
 * @returns Configuración del nodo o null si no existe
 */
export async function getNodeConfig(nodeId: string): Promise<NodeConfig | null> {
  if (!nodeId) {
    return null
  }

  try {
    const key = `${NODE_CONFIG_PREFIX}${nodeId}`
    const config = await getEncrypted(key)
    return config as NodeConfig | null
  } catch (error) {
    console.warn('Error al obtener configuración del nodo:', error)
    return null
  }
}

/**
 * Obtiene solo los datos de configuración de un nodo (sin metadata)
 * 
 * @param nodeId ID del nodo
 * @returns Datos de configuración o null si no existe
 */
export async function getNodeConfigData(nodeId: string): Promise<Record<string, any> | null> {
  const nodeConfig = await getNodeConfig(nodeId)
  return nodeConfig?.config || null
}

/**
 * Elimina la configuración de un nodo
 * 
 * @param nodeId ID del nodo
 */
export async function removeNodeConfig(nodeId: string): Promise<void> {
  if (!nodeId) {
    return
  }

  const key = `${NODE_CONFIG_PREFIX}${nodeId}`
  await removeEncrypted(key)

  console.log(`✅ Configuración eliminada para nodo: ${nodeId}`)
}

/**
 * Actualiza parcialmente la configuración de un nodo
 * 
 * @param nodeId ID del nodo
 * @param nodeType Tipo del nodo
 * @param updates Configuración parcial a actualizar
 */
export async function updateNodeConfig(
  nodeId: string,
  nodeType: string,
  updates: Partial<Record<string, any>>
): Promise<void> {
  const existing = await getNodeConfig(nodeId)
  
  const config = existing?.config || {}
  const mergedConfig = { ...config, ...updates }

  await saveNodeConfig(nodeId, nodeType, mergedConfig)
}

