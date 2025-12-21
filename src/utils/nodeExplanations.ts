/**
 * Node Explanations - Explicaciones simples para tipos de nodos
 * 
 * Proporciona explicaciones de una línea en lenguaje simple para cada tipo de nodo,
 * usado en Explain Mode para hacer los flows más comprensibles.
 */

/**
 * Mapeo de tipos de nodos a explicaciones simples
 */
const nodeExplanations: Record<string, string> = {
  // Trigger nodes
  'inject': 'Triggers flow',
  'http in': 'Receives HTTP request',
  'httpIn': 'Receives HTTP request',
  'mqtt in': 'Receives MQTT message',
  'mqttIn': 'Receives MQTT message',
  'websocket in': 'Receives WebSocket message',
  'websocketIn': 'Receives WebSocket message',
  'tcp in': 'Receives TCP data',
  'tcpIn': 'Receives TCP data',
  'udp in': 'Receives UDP data',
  'udpIn': 'Receives UDP data',
  'watch': 'Watches file changes',
  'tail': 'Reads file tail',
  
  // HTTP nodes
  'http request': 'Calls API',
  'httpRequest': 'Calls API',
  'http response': 'Sends HTTP response',
  'httpResponse': 'Sends HTTP response',
  
  // Function nodes
  'function': 'Filters data',
  'change': 'Transforms data',
  'switch': 'Routes data',
  'template': 'Formats data',
  
  // Output nodes
  'debug': 'Logs output',
  'complete': 'Completes flow',
  
  // Data nodes
  'json': 'Parses JSON',
  'csv': 'Parses CSV',
  'xml': 'Parses XML',
  'html': 'Parses HTML',
  
  // Storage nodes
  'file': 'Reads/writes file',
  'file in': 'Reads file',
  'file out': 'Writes file',
  
  // Network nodes
  'tcp out': 'Sends TCP data',
  'tcpOut': 'Sends TCP data',
  'udp out': 'Sends UDP data',
  'udpOut': 'Sends UDP data',
  
  // UI nodes
  'ui_base': 'UI component',
  'ui_button': 'Button',
  'ui_text': 'Text input',
  'ui_slider': 'Slider',
  
  // Groups
  'group': 'Groups nodes',
  
  // Subflows
  'subflow': 'Reusable flow',
}

/**
 * Obtiene una explicación simple para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo (ej: "inject", "http request")
 * @returns Explicación de una línea en lenguaje simple
 */
export function getNodeExplanation(nodeType: string): string {
  if (!nodeType) {
    return 'Processes data'
  }
  
  // Buscar coincidencia exacta (case-insensitive)
  const lowerType = nodeType.toLowerCase()
  if (nodeExplanations[lowerType]) {
    return nodeExplanations[lowerType]
  }
  
  // Buscar coincidencia parcial (para tipos como "http request")
  for (const [key, explanation] of Object.entries(nodeExplanations)) {
    if (lowerType.includes(key) || key.includes(lowerType)) {
      return explanation
    }
  }
  
  // Fallback: intentar detectar patrones comunes
  if (lowerType.includes('trigger') || lowerType.includes('inject')) {
    return 'Triggers flow'
  }
  
  if (lowerType.includes('http')) {
    return 'Calls API'
  }
  
  if (lowerType.includes('function') || lowerType.includes('change')) {
    return 'Transforms data'
  }
  
  if (lowerType.includes('debug') || lowerType.includes('log')) {
    return 'Logs output'
  }
  
  // Fallback genérico
  return 'Processes data'
}

/**
 * Obtiene una descripción más detallada para un tipo de nodo
 * (usado en el inspector en Explain Mode)
 */
export function getNodeDescription(nodeType: string): string {
  const explanation = getNodeExplanation(nodeType)
  
  // Descripciones más detalladas para algunos nodos comunes
  const descriptions: Record<string, string> = {
    'Triggers flow': 'This node starts the flow execution when activated.',
    'Calls API': 'This node makes an HTTP request to an external API.',
    'Filters data': 'This node processes and filters the incoming data.',
    'Transforms data': 'This node modifies the structure or content of the data.',
    'Logs output': 'This node displays the data in the debug panel.',
    'Receives HTTP request': 'This node listens for incoming HTTP requests.',
    'Routes data': 'This node sends data to different outputs based on conditions.',
    'Formats data': 'This node formats data into a specific template.',
  }
  
  return descriptions[explanation] || `This node ${explanation.toLowerCase()}.`
}

