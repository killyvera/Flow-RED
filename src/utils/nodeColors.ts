/**
 * Sistema de colores de header por categoría de nodo
 * 
 * Asigna colores de fondo al header del nodo según su categoría o tipo.
 * Usa el sistema de temas centralizado.
 */

import { getTheme } from '@/theme/themes'

/**
 * Mapeo de tipos de nodos a categorías
 * Permite mapear tipos específicos directamente a categorías
 */
const nodeTypeToCategoryMap: Record<string, keyof ReturnType<typeof getNodeCategoryColors>> = {
  inject: 'input',
  debug: 'output',
  function: 'function',
  template: 'function',
  switch: 'function',
  change: 'function',
  'http in': 'network',
  'http out': 'output',
  'http request': 'network',
  'mqtt in': 'network',
  'mqtt out': 'output',
  'mqtt-broker': 'network',
  delay: 'time',
  trigger: 'time',
}

/**
 * Obtiene los colores de categoría desde el tema actual
 * 
 * @param themeName Nombre del tema actual (opcional, se detecta automáticamente si no se proporciona)
 * @returns Record con los colores de categorías de nodos
 */
function getNodeCategoryColors(themeName?: string): Record<string, string> {
  // Si estamos en el navegador, intentar obtener el tema desde el contexto o localStorage
  if (typeof window !== 'undefined') {
    const currentThemeName = themeName || localStorage.getItem('theme') || 'light'
    const theme = getTheme(currentThemeName)
    
    if (theme && theme.colors.nodeCategories) {
      return {
        input: theme.colors.nodeCategories.input,
        inject: theme.colors.nodeCategories.input,
        output: theme.colors.nodeCategories.output,
        debug: theme.colors.nodeCategories.output,
        'http out': theme.colors.nodeCategories.output,
        'mqtt out': theme.colors.nodeCategories.output,
        'file out': theme.colors.nodeCategories.output,
        function: theme.colors.nodeCategories.function,
        template: theme.colors.nodeCategories.function,
        switch: theme.colors.nodeCategories.function,
        change: theme.colors.nodeCategories.function,
        network: theme.colors.nodeCategories.network,
        'http in': theme.colors.nodeCategories.network,
        'http request': theme.colors.nodeCategories.network,
        'mqtt in': theme.colors.nodeCategories.network,
        'mqtt-broker': theme.colors.nodeCategories.network,
        tcp: theme.colors.nodeCategories.network,
        udp: theme.colors.nodeCategories.network,
        websocket: theme.colors.nodeCategories.network,
        storage: theme.colors.nodeCategories.storage,
        'file in': theme.colors.nodeCategories.storage,
        'file': theme.colors.nodeCategories.storage,
        mongodb: theme.colors.nodeCategories.storage,
        mysql: theme.colors.nodeCategories.storage,
        postgresql: theme.colors.nodeCategories.storage,
        time: theme.colors.nodeCategories.time,
        delay: theme.colors.nodeCategories.time,
        trigger: theme.colors.nodeCategories.time,
        default: theme.colors.nodeCategories.default,
      }
    }
  }
  
  // Fallback a tema light si no se puede obtener el tema
  const lightTheme = getTheme('light')
  if (lightTheme && lightTheme.colors.nodeCategories) {
    return {
      input: lightTheme.colors.nodeCategories.input,
      inject: lightTheme.colors.nodeCategories.input,
      output: lightTheme.colors.nodeCategories.output,
      debug: lightTheme.colors.nodeCategories.output,
      'http out': lightTheme.colors.nodeCategories.output,
      'mqtt out': lightTheme.colors.nodeCategories.output,
      'file out': lightTheme.colors.nodeCategories.output,
      function: lightTheme.colors.nodeCategories.function,
      template: lightTheme.colors.nodeCategories.function,
      switch: lightTheme.colors.nodeCategories.function,
      change: lightTheme.colors.nodeCategories.function,
      network: lightTheme.colors.nodeCategories.network,
      'http in': lightTheme.colors.nodeCategories.network,
      'http request': lightTheme.colors.nodeCategories.network,
      'mqtt in': lightTheme.colors.nodeCategories.network,
      'mqtt-broker': lightTheme.colors.nodeCategories.network,
      tcp: lightTheme.colors.nodeCategories.network,
      udp: lightTheme.colors.nodeCategories.network,
      websocket: lightTheme.colors.nodeCategories.network,
      storage: lightTheme.colors.nodeCategories.storage,
      'file in': lightTheme.colors.nodeCategories.storage,
      'file': lightTheme.colors.nodeCategories.storage,
      mongodb: lightTheme.colors.nodeCategories.storage,
      mysql: lightTheme.colors.nodeCategories.storage,
      postgresql: lightTheme.colors.nodeCategories.storage,
      time: lightTheme.colors.nodeCategories.time,
      delay: lightTheme.colors.nodeCategories.time,
      trigger: lightTheme.colors.nodeCategories.time,
      default: lightTheme.colors.nodeCategories.default,
    }
  }
  
  // Último fallback - valores por defecto
  return {
    input: '#e8f5e9',
    inject: '#e8f5e9',
    output: '#e3f2fd',
    debug: '#e3f2fd',
    'http out': '#e3f2fd',
    'mqtt out': '#e3f2fd',
    'file out': '#e3f2fd',
    function: '#fff9c4',
    template: '#fff9c4',
    switch: '#fff9c4',
    change: '#fff9c4',
    network: '#ffe0b2',
    'http in': '#ffe0b2',
    'http request': '#ffe0b2',
    'mqtt in': '#ffe0b2',
    'mqtt-broker': '#ffe0b2',
    tcp: '#ffe0b2',
    udp: '#ffe0b2',
    websocket: '#ffe0b2',
    storage: '#f3e5f5',
    'file in': '#f3e5f5',
    'file': '#f3e5f5',
    mongodb: '#f3e5f5',
    mysql: '#f3e5f5',
    postgresql: '#f3e5f5',
    time: '#fce4ec',
    delay: '#fce4ec',
    trigger: '#fce4ec',
    default: '#f8f9fa',
  }
}

/**
 * Obtiene los colores de tipos desde el tema actual
 * Usa el mapeo de tipos a categorías
 */
function getNodeTypeColors(themeName?: string): Record<string, string> {
  const categoryColors = getNodeCategoryColors(themeName)
  const typeColors: Record<string, string> = {}
  
  // Mapear tipos específicos a sus categorías
  Object.entries(nodeTypeToCategoryMap).forEach(([nodeType, category]) => {
    typeColors[nodeType] = categoryColors[category] || categoryColors.default
  })
  
  return typeColors
}

/**
 * Obtiene el color de header para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo (ej: "inject", "debug", "http in")
 * @param themeName Nombre del tema (opcional, se detecta automáticamente)
 * @returns Color hexadecimal para el header (se adapta al tema actual)
 */
export function getNodeHeaderColor(nodeType: string | undefined, themeName?: string): string {
  if (!nodeType) {
    const colors = getNodeCategoryColors(themeName)
    return colors.default
  }
  
  const nodeTypeColors = getNodeTypeColors(themeName)
  const nodeCategoryColors = getNodeCategoryColors(themeName)
  
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

