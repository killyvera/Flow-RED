/**
 * Cargador de definiciones de nodos desde Node-RED
 * 
 * Obtiene la definición completa de un nodo desde el endpoint /nodes
 * para poder generar formularios dinámicos.
 */

import { getNodes } from './client'
import { apiLogger } from '@/utils/logger'

export interface NodeDefinition {
  /** Tipo del nodo */
  type: string
  /** Categoría del nodo */
  category?: string
  /** Nombre del nodo */
  name?: string
  /** Descripción/help del nodo */
  info?: string
  help?: string
  description?: string
  /** Valores por defecto */
  defaults?: Record<string, any>
  /** Configuración de inputs tipados */
  typedInput?: Record<string, any>
  /** Propiedades editables explícitas */
  properties?: Array<{
    id?: string
    name?: string
    type?: string
    label?: string
    required?: boolean
    validate?: string
    options?: any[]
  }>
  /** Otras propiedades de la definición */
  [key: string]: any
}

/**
 * Cache para definiciones de nodos
 */
const nodeDefinitionCache = new Map<string, { promise: Promise<NodeDefinition | null> | null; data: NodeDefinition | null }>()

/**
 * Obtiene la definición de un nodo desde Node-RED
 * 
 * @param nodeType Tipo del nodo (ej: "inject", "debug", "function")
 * @returns Promise con la definición del nodo o null si no se encuentra
 */
export async function getNodeDefinition(nodeType: string): Promise<NodeDefinition | null> {
  // Verificar cache
  const cached = nodeDefinitionCache.get(nodeType)
  if (cached?.data) {
    apiLogger('📋 Definición de nodo desde cache:', nodeType)
    return cached.data
  }

  // Si hay una promesa en curso, esperarla
  if (cached?.promise) {
    apiLogger('⏳ Esperando carga de definición de nodo:', nodeType)
    return cached.promise
  }

  // Crear nueva promesa para cargar
  const loadPromise = (async () => {
    try {
      apiLogger('📥 Cargando definición de nodo:', nodeType)
      
      const nodesResponse = await getNodes()
      
      // Buscar el módulo que contiene este tipo de nodo
      // La respuesta puede tener diferentes estructuras según Node-RED
      for (const [moduleId, moduleInfo] of Object.entries(nodesResponse)) {
        if (moduleInfo && typeof moduleInfo === 'object') {
          // Verificar si este módulo tiene el tipo de nodo
          // Puede estar en moduleInfo.types (array) o moduleInfo puede ser un objeto con tipos
          const types = moduleInfo.types || (Array.isArray(moduleInfo) ? moduleInfo : null)
          
          if (types && Array.isArray(types)) {
            if (types.includes(nodeType)) {
              apiLogger('📋 Encontrado nodo en módulo:', { moduleId, nodeType, hasDefaults: !!moduleInfo.defaults })
              
              // Construir definición del nodo
              const definition: NodeDefinition = {
                type: nodeType,
                category: moduleInfo.category,
                info: moduleInfo.info,
                help: moduleInfo.help,
                description: moduleInfo.description,
                defaults: moduleInfo.defaults,
                typedInput: moduleInfo.typedInput,
                properties: moduleInfo.properties,
                ...moduleInfo, // Incluir todas las demás propiedades (incluyendo name si existe)
              }
              
              // Log de defaults para debug
              if (definition.defaults) {
                apiLogger('📋 Defaults encontrados:', {
                  nodeType,
                  keys: Object.keys(definition.defaults),
                  sample: Object.entries(definition.defaults).slice(0, 3).map(([k, v]) => ({
                    key: k,
                    value: typeof v === 'object' && v !== null && 'value' in v ? v.value : v,
                  })),
                })
              }
              
              // Guardar en cache
              nodeDefinitionCache.set(nodeType, { promise: null, data: definition })
              apiLogger('✅ Definición de nodo cargada:', nodeType)
              return definition
            }
          }
          
          // También buscar directamente en el objeto si tiene el tipo como clave
          if (moduleInfo[nodeType]) {
            apiLogger('📋 Encontrado nodo como propiedad directa:', { moduleId, nodeType })
            const nodeDef = moduleInfo[nodeType]
            const definition: NodeDefinition = {
              type: nodeType,
              category: nodeDef.category || moduleInfo.category,
              info: nodeDef.info,
              help: nodeDef.help,
              description: nodeDef.description,
              defaults: nodeDef.defaults,
              typedInput: nodeDef.typedInput,
              properties: nodeDef.properties,
              ...nodeDef,
            }
            
            nodeDefinitionCache.set(nodeType, { promise: null, data: definition })
            apiLogger('✅ Definición de nodo cargada (propiedad directa):', nodeType)
            return definition
          }
        }
      }
      
      apiLogger('⚠️ Nodo no encontrado en respuesta /nodes:', {
        nodeType,
        availableModules: Object.keys(nodesResponse).slice(0, 5),
        totalModules: Object.keys(nodesResponse).length,
      })
      
      apiLogger('⚠️ Definición de nodo no encontrada:', nodeType)
      return null
    } catch (err) {
      apiLogger('❌ Error al cargar definición de nodo:', nodeType, err)
      // Guardar null en cache para evitar reintentos infinitos
      nodeDefinitionCache.set(nodeType, { promise: null, data: null })
      return null
    }
  })()

  // Guardar promesa en cache
  nodeDefinitionCache.set(nodeType, { promise: loadPromise, data: null })

  return loadPromise
}

/**
 * Limpia el cache de definiciones de nodos
 */
export function clearNodeDefinitionCache(): void {
  nodeDefinitionCache.clear()
}

/**
 * Limpia la definición de un nodo específico del cache
 */
export function clearNodeDefinitionCacheFor(nodeType: string): void {
  nodeDefinitionCache.delete(nodeType)
}

