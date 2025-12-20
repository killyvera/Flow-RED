/**
 * Información sobre tipos de nodos de Node-RED
 * 
 * Documenta qué nodos tienen propiedades editables y cuáles no.
 * Esto ayuda a entender cuándo es normal que un nodo no tenga propiedades.
 */

/**
 * Nodos que NO tienen propiedades editables (solo propiedades internas)
 * 
 * Estos nodos son contenedores o estructuras especiales que se configuran
 * de manera diferente o no tienen propiedades configurables.
 */
export const NODES_WITHOUT_EDITABLE_PROPERTIES = [
  // Nodos de estructura/contenedor
  'tab',           // Flow/Tab - se configura en el editor de flows
  'group',         // Group - se configura en el editor de grupos
  'subflow',       // Subflow - se configura en el editor de subflows
  
  // Nodos especiales de conexión
  'junction',      // Junction - solo punto de conexión, no tiene propiedades
  
  // Nodos de configuración (config nodes)
  // Estos se configuran a través de diálogos especiales, no en el panel de propiedades
  // Nota: Algunos config nodes pueden tener 'name' como única propiedad editable
] as const

/**
 * Nodos que solo tienen 'name' como propiedad editable
 * 
 * Estos nodos normalmente solo permiten editar el nombre/etiqueta del nodo.
 */
export const NODES_WITH_ONLY_NAME = [
  // Nodos de configuración básicos
  'global-config',  // Contexto global - solo name
  'flow-config',    // Contexto de flow - solo name
  'subflow-config', // Contexto de subflow - solo name
  'group-config',   // Contexto de grupo - solo name
  
  // Nodos de configuración de red (pueden tener más propiedades, pero name es principal)
  'mqtt-broker',    // Broker MQTT - tiene más propiedades pero name es principal
  'tls-config',     // Configuración TLS - se configura en diálogo especial
  'http-proxy',     // Proxy HTTP - se configura en diálogo especial
  
  // Nodos simples
  'link in',        // Link in - puede tener 'links' pero es complejo
  'link out',       // Link out - puede tener 'links' y 'mode'
  'link call',      // Link call - puede tener 'links'
] as const

/**
 * Nodos que tienen propiedades editables pero pueden estar vacíos
 * 
 * Estos nodos pueden no tener propiedades si no están configurados aún.
 */
export const NODES_WITH_OPTIONAL_PROPERTIES = [
  'http request',   // Puede no tener url configurada inicialmente
  'http in',        // Puede no tener url configurada inicialmente
  'function',       // Puede no tener código inicialmente
  'template',       // Puede no tener template inicialmente
  'switch',         // Puede no tener rules inicialmente
  'change',         // Puede no tener rules inicialmente
] as const

/**
 * Verifica si un nodo debería tener propiedades editables
 * 
 * @param nodeType Tipo del nodo
 * @returns true si el nodo debería tener propiedades editables, false si es normal que no las tenga
 */
export function shouldNodeHaveEditableProperties(nodeType: string): boolean {
  const normalizedType = nodeType.toLowerCase().trim()
  
  // Nodos que definitivamente NO deberían tener propiedades editables
  if (NODES_WITHOUT_EDITABLE_PROPERTIES.includes(normalizedType as any)) {
    return false
  }
  
  // Nodos que solo tienen 'name' son aceptables
  if (NODES_WITH_ONLY_NAME.includes(normalizedType as any)) {
    return true // Tienen al menos 'name'
  }
  
  // Todos los demás nodos deberían tener propiedades editables
  return true
}

/**
 * Obtiene un mensaje descriptivo para cuando un nodo no tiene propiedades
 * 
 * @param nodeType Tipo del nodo
 * @returns Mensaje explicativo o null si no hay mensaje especial
 */
export function getNoPropertiesMessage(nodeType: string): string | null {
  const normalizedType = nodeType.toLowerCase().trim()
  
  if (NODES_WITHOUT_EDITABLE_PROPERTIES.includes(normalizedType as any)) {
    if (normalizedType === 'tab') {
      return 'Los flows (tabs) se configuran en el editor de flows, no en el panel de propiedades.'
    }
    if (normalizedType === 'group') {
      return 'Los grupos se configuran en el editor de grupos, no en el panel de propiedades.'
    }
    if (normalizedType === 'subflow') {
      return 'Los subflows se configuran en el editor de subflows, no en el panel de propiedades.'
    }
    if (normalizedType === 'junction') {
      return 'Los junctions son puntos de conexión y no tienen propiedades configurables.'
    }
    return 'Este tipo de nodo no tiene propiedades editables en el panel de propiedades.'
  }
  
  if (NODES_WITH_ONLY_NAME.includes(normalizedType as any)) {
    if (normalizedType.includes('config')) {
      return 'Este nodo de configuración se edita principalmente a través de su diálogo de configuración. Solo el nombre es editable aquí.'
    }
  }
  
  return null
}

