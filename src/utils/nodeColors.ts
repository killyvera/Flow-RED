/**
 * Sistema de colores de header por categoría de nodo
 * 
 * Asigna colores de fondo al header del nodo según su categoría o tipo.
 * Soporta modo claro y oscuro.
 */

/**
 * Detecta si el tema actual es oscuro
 */
function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/**
 * Categorías de nodos y sus colores - Modo claro
 */
const nodeCategoryColorsLight: Record<string, string> = {
  // Input nodes (verde suave)
  input: '#e8f5e9',
  inject: '#e8f5e9',
  
  // Output nodes (azul suave)
  output: '#e3f2fd',
  debug: '#e3f2fd',
  'http out': '#e3f2fd',
  'mqtt out': '#e3f2fd',
  'file out': '#e3f2fd',
  
  // Function nodes (amarillo suave)
  function: '#fff9c4',
  template: '#fff9c4',
  switch: '#fff9c4',
  change: '#fff9c4',
  
  // Network nodes (naranja suave)
  network: '#ffe0b2',
  'http in': '#ffe0b2',
  'http request': '#ffe0b2',
  'mqtt in': '#ffe0b2',
  'mqtt-broker': '#ffe0b2',
  tcp: '#ffe0b2',
  udp: '#ffe0b2',
  websocket: '#ffe0b2',
  
  // Storage nodes (morado suave)
  storage: '#f3e5f5',
  'file in': '#f3e5f5',
  'file': '#f3e5f5',
  mongodb: '#f3e5f5',
  mysql: '#f3e5f5',
  postgresql: '#f3e5f5',
  
  // Time nodes (rosa suave)
  time: '#fce4ec',
  delay: '#fce4ec',
  trigger: '#fce4ec',
  
  // Default (gris suave)
  default: '#f8f9fa',
}

/**
 * Categorías de nodos y sus colores - Modo oscuro
 */
const nodeCategoryColorsDark: Record<string, string> = {
  // Input nodes (verde oscuro)
  input: '#1b5e20',
  inject: '#1b5e20',
  
  // Output nodes (azul oscuro)
  output: '#0d47a1',
  debug: '#0d47a1',
  'http out': '#0d47a1',
  'mqtt out': '#0d47a1',
  'file out': '#0d47a1',
  
  // Function nodes (amarillo oscuro)
  function: '#f57f17',
  template: '#f57f17',
  switch: '#f57f17',
  change: '#f57f17',
  
  // Network nodes (naranja oscuro)
  network: '#e65100',
  'http in': '#e65100',
  'http request': '#e65100',
  'mqtt in': '#e65100',
  'mqtt-broker': '#e65100',
  tcp: '#e65100',
  udp: '#e65100',
  websocket: '#e65100',
  
  // Storage nodes (morado oscuro)
  storage: '#4a148c',
  'file in': '#4a148c',
  'file': '#4a148c',
  mongodb: '#4a148c',
  mysql: '#4a148c',
  postgresql: '#4a148c',
  
  // Time nodes (rosa oscuro)
  time: '#880e4f',
  delay: '#880e4f',
  trigger: '#880e4f',
  
  // Default (gris oscuro)
  default: '#353535',
}

/**
 * Obtiene los colores de categoría según el tema actual
 */
function getNodeCategoryColors(): Record<string, string> {
  return isDarkMode() ? nodeCategoryColorsDark : nodeCategoryColorsLight
}

/**
 * Mapeo directo de tipos específicos a colores - Modo claro
 */
const nodeTypeColorsLight: Record<string, string> = {
  inject: '#e8f5e9',
  debug: '#e3f2fd',
  function: '#fff9c4',
  template: '#fff9c4',
  switch: '#fff9c4',
  change: '#fff9c4',
  'http in': '#ffe0b2',
  'http out': '#e3f2fd',
  'http request': '#ffe0b2',
  'mqtt in': '#ffe0b2',
  'mqtt out': '#e3f2fd',
  'mqtt-broker': '#ffe0b2',
  delay: '#fce4ec',
  trigger: '#fce4ec',
}

/**
 * Mapeo directo de tipos específicos a colores - Modo oscuro
 */
const nodeTypeColorsDark: Record<string, string> = {
  inject: '#1b5e20',
  debug: '#0d47a1',
  function: '#f57f17',
  template: '#f57f17',
  switch: '#f57f17',
  change: '#f57f17',
  'http in': '#e65100',
  'http out': '#0d47a1',
  'http request': '#e65100',
  'mqtt in': '#e65100',
  'mqtt out': '#0d47a1',
  'mqtt-broker': '#e65100',
  delay: '#880e4f',
  trigger: '#880e4f',
}

/**
 * Obtiene los colores de tipos según el tema actual
 */
function getNodeTypeColors(): Record<string, string> {
  return isDarkMode() ? nodeTypeColorsDark : nodeTypeColorsLight
}

/**
 * Obtiene el color de header para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo (ej: "inject", "debug", "http in")
 * @returns Color hexadecimal para el header (se adapta al tema actual)
 */
export function getNodeHeaderColor(nodeType: string | undefined): string {
  if (!nodeType) {
    const colors = getNodeCategoryColors()
    return colors.default
  }
  
  const nodeTypeColors = getNodeTypeColors()
  const nodeCategoryColors = getNodeCategoryColors()
  
  // Buscar coincidencia exacta en mapeo directo
  if (nodeTypeColors[nodeType]) {
    return nodeTypeColors[nodeType]
  }
  
  // Buscar por categoría
  const normalizedType = nodeType.toLowerCase().replace(/[_\s-]/g, ' ')
  
  // Detectar categoría por palabras clave
  if (normalizedType.includes('inject') || normalizedType.includes('input')) {
    return nodeCategoryColors.input
  }
  if (normalizedType.includes('debug') || normalizedType.includes('out') || normalizedType.includes('output')) {
    return nodeCategoryColors.output
  }
  if (normalizedType.includes('function') || normalizedType.includes('template') || normalizedType.includes('switch') || normalizedType.includes('change')) {
    return nodeCategoryColors.function
  }
  if (normalizedType.includes('http') || normalizedType.includes('mqtt') || normalizedType.includes('tcp') || normalizedType.includes('udp') || normalizedType.includes('websocket')) {
    return nodeCategoryColors.network
  }
  if (normalizedType.includes('file') || normalizedType.includes('mongodb') || normalizedType.includes('mysql') || normalizedType.includes('postgresql')) {
    return nodeCategoryColors.storage
  }
  if (normalizedType.includes('delay') || normalizedType.includes('trigger') || normalizedType.includes('time')) {
    return nodeCategoryColors.time
  }
  
  return nodeCategoryColors.default
}

/**
 * Registra un color personalizado para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo
 * @param colorLight Color hexadecimal para modo claro
 * @param colorDark Color hexadecimal para modo oscuro (opcional, usa colorLight si no se proporciona)
 */
export function registerNodeColor(
  nodeType: string, 
  colorLight: string, 
  colorDark?: string
): void {
  nodeTypeColorsLight[nodeType] = colorLight
  if (colorDark) {
    nodeTypeColorsDark[nodeType] = colorDark
  } else {
    // Si no se proporciona color oscuro, usar el claro (puede no verse bien, pero evita errores)
    nodeTypeColorsDark[nodeType] = colorLight
  }
}

