/**
 * Parser de Schema de Node-RED
 * 
 * Parsea la definición de schema de un nodo de Node-RED y genera
 * información útil para crear formularios dinámicos.
 */

import { getKnownNodeProperties } from './nodeDefaults'

/**
 * Tipo de propiedad según el schema de Node-RED
 */
export type PropertyType = 
  | 'str'      // String
  | 'num'      // Number
  | 'bool'     // Boolean
  | 'json'     // JSON object/array (para arrays complejos como props, rules, libs)
  | 'array'    // Array (alias para json)
  | 'msg'      // Message property
  | 'flow'     // Flow context
  | 'global'   // Global context
  | 'node'     // Node context
  | 'env'      // Environment variable
  | 're'       // Regular expression
  | 'date'     // Date
  | 'bin'      // Binary
  | 'select'   // Select/dropdown
  | 'typedInput' // Typed input (puede ser msg, flow, global, etc.)

/**
 * Definición de una propiedad en el schema
 */
export interface PropertyDefinition {
  /** ID de la propiedad */
  id: string
  /** Tipo de la propiedad */
  type: PropertyType
  /** Etiqueta/descripción */
  label?: string
  /** Valor por defecto */
  default?: any
  /** Valores permitidos (para select) */
  options?: Array<{ value: string; label: string }>
  /** Si es requerida */
  required?: boolean
  /** Validación adicional */
  validate?: string
  /** Placeholder */
  placeholder?: string
}

/**
 * Schema completo de un nodo
 */
export interface NodeSchema {
  /** ID del tipo de nodo */
  nodeType: string
  /** Propiedades del nodo */
  properties: PropertyDefinition[]
  /** Categoría del nodo */
  category?: string
  /** Descripción del nodo */
  description?: string
}

/**
 * Parsea el schema de un nodo desde la definición de Node-RED
 * 
 * Extrae propiedades editables desde la definición del nodo, incluyendo:
 * - defaults: valores por defecto y tipos
 * - inputs: configuración de inputs tipados
 * - properties: propiedades editables explícitas
 * 
 * @param nodeType Tipo del nodo
 * @param nodeDef Definición del nodo desde /nodes
 * @param nodeInstance Instancia del nodo (opcional, para obtener valores actuales)
 * @returns Schema parseado
 */
export function parseNodeSchema(
  nodeType: string,
  nodeDef: any,
  nodeInstance?: any
): NodeSchema {
  const properties: PropertyDefinition[] = []
  const seenProps = new Set<string>()

  // Parsear defaults del nodo (valores por defecto)
  // En Node-RED, defaults puede tener estructura: { key: { value: ..., type: ..., required: ..., label: ... } }
  // o estructura simple: { key: value }
  if (nodeDef.defaults) {
    Object.entries(nodeDef.defaults).forEach(([key, value]: [string, any]) => {
      // Omitir propiedades internas de Node-RED
      if (key === 'id' || key === 'type' || key === 'x' || key === 'y' || key === 'z' || key === 'wires') {
        return
      }

      seenProps.add(key)
      
      // Manejar estructura compleja de defaults (objeto con value, type, etc.)
      let actualValue: any
      let propType: PropertyType = 'str'
      let isRequired = false
      let label: string | undefined
      let validate: string | undefined
      let options: Array<{ value: string; label: string }> | undefined
      
      if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
        // Estructura compleja: { value: ..., type: ..., required: ..., label: ... }
        actualValue = value.value
        isRequired = value.required === true
        label = value.label
        validate = value.validate ? String(value.validate) : undefined
        
        // Si tiene type específico, usarlo
        if (value.type) {
          const typeStr = String(value.type).toLowerCase()
          if (typeStr.includes('select') || typeStr.includes('dropdown')) {
            propType = 'select'
          } else if (typeStr.includes('bool') || typeStr === 'checkbox') {
            propType = 'bool'
          } else if (typeStr.includes('num') || typeStr === 'number') {
            propType = 'num'
          } else if (typeStr.includes('tls') || typeStr.includes('proxy') || typeStr.includes('config')) {
            // Config nodes especiales - tratarlos como select o text
            propType = 'str'
          } else {
            propType = 'str'
          }
        } else {
          // Determinar tipo basado en el valor
          if (typeof actualValue === 'number') {
            propType = 'num'
          } else if (typeof actualValue === 'boolean') {
            propType = 'bool'
          } else if (Array.isArray(actualValue)) {
            propType = 'select'
            // Si es un array, crear opciones desde el array
            options = actualValue.map((opt: any) => ({
              value: String(opt),
              label: String(opt),
            }))
          }
        }
      } else {
        // Estructura simple: valor directo
        actualValue = value
        
        // Determinar tipo basado en el valor
        if (typeof actualValue === 'number') {
          propType = 'num'
        } else if (typeof actualValue === 'boolean') {
          propType = 'bool'
        } else if (Array.isArray(actualValue)) {
          propType = 'select'
          // Si es un array, crear opciones desde el array
          options = actualValue.map((opt: any) => ({
            value: String(opt),
            label: String(opt),
          }))
        }
      }
      
      // Verificar si hay typedInput para este campo
      if (nodeDef.typedInput && nodeDef.typedInput[key]) {
        propType = 'typedInput'
      }

      properties.push({
        id: key,
        type: propType,
        label: label || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        default: actualValue,
        required: isRequired,
        validate: validate,
        options: options,
        placeholder: actualValue !== undefined && actualValue !== null && actualValue !== '' 
          ? `Valor por defecto: ${String(actualValue)}` 
          : undefined,
      })
    })
  }

  // Parsear configuración de inputs tipados
  if (nodeDef.typedInput) {
    Object.entries(nodeDef.typedInput).forEach(([key, config]: [string, any]) => {
      if (seenProps.has(key)) {
        const existingProp = properties.find(p => p.id === key)
        if (existingProp) {
          existingProp.type = 'typedInput'
          if (config.types && Array.isArray(config.types)) {
            existingProp.options = config.types.map((t: string) => ({
              value: t,
              label: t,
            }))
          }
        }
      } else {
        seenProps.add(key)
        properties.push({
          id: key,
          type: 'typedInput',
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          options: config.types?.map((t: string) => ({
            value: t,
            label: t,
          })),
        })
      }
    })
  }

  // Parsear propiedades explícitas si están definidas
  if (nodeDef.properties && Array.isArray(nodeDef.properties)) {
    nodeDef.properties.forEach((prop: any) => {
      if (seenProps.has(prop.id || prop.name)) {
        // Actualizar propiedad existente
        const existingProp = properties.find(p => p.id === (prop.id || prop.name))
        if (existingProp) {
          if (prop.label) existingProp.label = prop.label
          if (prop.type) existingProp.type = prop.type as PropertyType
          if (prop.required !== undefined) existingProp.required = prop.required
          if (prop.validate) existingProp.validate = prop.validate
          if (prop.options) {
            existingProp.options = Array.isArray(prop.options)
              ? prop.options.map((opt: any) => ({
                  value: typeof opt === 'string' ? opt : opt.value,
                  label: typeof opt === 'string' ? opt : opt.label || opt.value,
                }))
              : undefined
          }
        }
      } else {
        seenProps.add(prop.id || prop.name)
        properties.push({
          id: prop.id || prop.name,
          type: (prop.type || 'str') as PropertyType,
          label: prop.label || prop.name,
          required: prop.required,
          validate: prop.validate,
          options: prop.options
            ? (Array.isArray(prop.options)
                ? prop.options.map((opt: any) => ({
                    value: typeof opt === 'string' ? opt : opt.value,
                    label: typeof opt === 'string' ? opt : opt.label || opt.value,
                  }))
                : undefined)
            : undefined,
        })
      }
    })
  }

  // Si no hay propiedades definidas, intentar usar propiedades conocidas
  if (properties.length === 0) {
    const knownProps = getKnownNodeProperties(nodeType)
    if (knownProps) {
      // Usar propiedades conocidas, pero actualizar con valores de la instancia si existen
      knownProps.forEach((knownProp) => {
        const instanceValue = nodeInstance?.[knownProp.id]
        properties.push({
          ...knownProp,
          default: instanceValue !== undefined ? instanceValue : knownProp.default,
        })
      })
    }
  }

  // Si aún no hay propiedades y hay una instancia del nodo,
  // extraer propiedades editables desde la instancia (excluyendo internas)
  if (properties.length === 0 && nodeInstance) {
    // Lista completa de propiedades internas de Node-RED que NO deben ser editables
    const internalProps = [
      'id', 'type', 'x', 'y', 'z', 'wires', 
      '_', 'dirty', 'changed', 'valid', 'users',
      'inputLabels', 'outputLabels', 'selected', 'moved',
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
      '_config', '_def', '_orig'
    ]
    
    Object.entries(nodeInstance).forEach(([key, value]: [string, any]) => {
      // Omitir propiedades internas (NOTA: 'name' SÍ es editable en Node-RED)
      if (internalProps.includes(key)) {
        return
      }

      // Solo agregar si no está ya en la lista
      if (!seenProps.has(key)) {
        seenProps.add(key)
        
        let propType: PropertyType = 'str'
        if (typeof value === 'number') {
          propType = 'num'
        } else if (typeof value === 'boolean') {
          propType = 'bool'
        } else if (Array.isArray(value)) {
          propType = 'select'
        }

        properties.push({
          id: key,
          type: propType,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          default: value,
        })
      }
    })
  }

  return {
    nodeType,
    properties: properties.sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id)),
    category: nodeDef.category,
    description: nodeDef.info || nodeDef.help || nodeDef.description,
  }
}

/**
 * Obtiene el schema de un tipo de nodo desde la respuesta de /nodes
 * 
 * @param nodeType Tipo del nodo
 * @param nodesResponse Respuesta completa de /nodes
 * @returns Schema del nodo o null si no se encuentra
 */
export function getNodeSchema(
  nodeType: string,
  nodesResponse: Record<string, any>
): NodeSchema | null {
  // Buscar el módulo que contiene este tipo de nodo
  for (const [, moduleInfo] of Object.entries(nodesResponse)) {
    if (moduleInfo.types && Array.isArray(moduleInfo.types)) {
      if (moduleInfo.types.includes(nodeType)) {
        // Obtener la definición del nodo
        // Nota: La estructura exacta puede variar según Node-RED
        // Por ahora retornamos un schema básico
        return parseNodeSchema(nodeType, moduleInfo)
      }
    }
  }

  return null
}

