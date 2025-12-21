/**
 * Summary Engine - Motor de Resúmenes Semánticos
 * 
 * Genera resúmenes legibles de la ejecución de nodos basándose en heurísticas,
 * mostrando resultados antes que JSON crudo (similar a n8n).
 */

import type { NodeRuntimeState } from '@/state/canvasStore'

/**
 * Input para generar un resumen de nodo
 */
export interface SummaryInput {
  /** Tipo del nodo (ej: "inject", "http request", "function") */
  nodeType: string
  /** Nombre del nodo (opcional) */
  nodeName?: string
  /** Estado de runtime del nodo */
  runtimeState?: NodeRuntimeState
  /** Preview del payload (truncado) */
  payloadPreview?: string
  /** Payload completo (opcional, para análisis más detallado) */
  payload?: any
  /** Código de estado HTTP (para nodos HTTP) */
  statusCode?: number
  /** Mensaje de error (si existe) */
  errorMessage?: string
}

/**
 * Resumen generado para un nodo
 */
export interface NodeSummary {
  /** Título principal del resumen */
  title: string
  /** Subtítulo opcional con detalles adicionales */
  subtitle?: string
  /** Severidad del resumen (determina color del badge) */
  severity: 'success' | 'warn' | 'error' | 'info'
  /** Icono opcional (nombre de icono de Lucide) */
  icon?: string
}

/**
 * Determina la severidad del resumen basándose en el estado y payload
 */
export function getSummarySeverity(
  status?: NodeRuntimeState,
  payload?: any,
  statusCode?: number
): 'success' | 'warn' | 'error' | 'info' {
  // Si hay error, siempre es error
  if (status === 'error') {
    return 'error'
  }

  // Si hay warning, es warn
  if (status === 'warning') {
    return 'warn'
  }

  // Si hay statusCode HTTP, determinar según el código
  if (statusCode !== undefined) {
    if (statusCode >= 400) {
      return 'error'
    }
    if (statusCode >= 300) {
      return 'warn'
    }
    return 'success'
  }

  // Si está running, es info
  if (status === 'running') {
    return 'info'
  }

  // Si hay payload, es success
  if (payload !== undefined && payload !== null) {
    return 'success'
  }

  // Por defecto, info
  return 'info'
}

/**
 * Obtiene el texto de estado HTTP basándose en el código
 */
function getHttpStatusText(statusCode: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }
  return statusTexts[statusCode] || 'Unknown'
}

/**
 * Analiza un payload y genera un resumen descriptivo
 */
function analyzePayload(payload: any): { title: string; subtitle?: string } {
  if (payload === null || payload === undefined) {
    return { title: 'No output' }
  }

  // Si es un string
  if (typeof payload === 'string') {
    const truncated = payload.length > 50 ? payload.substring(0, 50) + '...' : payload
    return { title: `Output: "${truncated}"` }
  }

  // Si es un número
  if (typeof payload === 'number') {
    return { title: `Output: ${payload}` }
  }

  // Si es un booleano
  if (typeof payload === 'boolean') {
    return { title: `Output: ${payload ? 'true' : 'false'}` }
  }

  // Si es un array
  if (Array.isArray(payload)) {
    const itemCount = payload.length
    const itemText = itemCount === 1 ? 'item' : 'items'
    
    // Si el array tiene objetos, mostrar claves del primer objeto
    if (itemCount > 0 && typeof payload[0] === 'object' && payload[0] !== null) {
      const keys = Object.keys(payload[0])
      const keysText = keys.length > 0 ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}` : '{}'
      return {
        title: `Output: ${itemCount} ${itemText}`,
        subtitle: `Structure: ${keysText}`,
      }
    }
    
    return { title: `Output: ${itemCount} ${itemText}` }
  }

  // Si es un objeto
  if (typeof payload === 'object') {
    const keys = Object.keys(payload)
    const keyCount = keys.length
    
    if (keyCount === 0) {
      return { title: 'Output: {}' }
    }

    // Mostrar las primeras 3 claves
    const keysPreview = keys.slice(0, 3).join(', ')
    const moreKeys = keyCount > 3 ? ` +${keyCount - 3} more` : ''
    
    return {
      title: `Output: {${keysPreview}${moreKeys}}`,
      subtitle: `${keyCount} ${keyCount === 1 ? 'property' : 'properties'}`,
    }
  }

  // Por defecto, convertir a string
  return { title: `Output: ${String(payload)}` }
}

/**
 * Genera un resumen semántico para un nodo basándose en su estado y datos
 */
export function generateNodeSummary(input: SummaryInput): NodeSummary {
  const {
    nodeType,
    nodeName,
    runtimeState,
    payloadPreview,
    payload,
    statusCode,
    errorMessage,
  } = input

  // 1. Heurística: Error state
  if (runtimeState === 'error') {
    return {
      title: 'Error',
      subtitle: errorMessage || 'Execution failed',
      severity: 'error',
      icon: 'AlertCircle',
    }
  }

  // 2. Heurística: HTTP nodes con statusCode
  if (statusCode !== undefined && (nodeType.toLowerCase().includes('http') || nodeType.toLowerCase().includes('request'))) {
    const statusText = getHttpStatusText(statusCode)
    const severity = getSummarySeverity(runtimeState, payload, statusCode)
    
    return {
      title: `HTTP ${statusCode} ${statusText}`,
      subtitle: payload ? analyzePayload(payload).title : undefined,
      severity,
      icon: severity === 'error' ? 'AlertCircle' : 'CheckCircle',
    }
  }

  // 3. Heurística: Function/Change nodes (transformación)
  if (nodeType.toLowerCase() === 'function' || nodeType.toLowerCase() === 'change') {
    if (payload !== undefined && payload !== null) {
      const payloadAnalysis = analyzePayload(payload)
      return {
        title: payloadAnalysis.title,
        subtitle: payloadAnalysis.subtitle || 'Transformed message',
        severity: 'success',
        icon: 'ArrowRight',
      }
    }
    return {
      title: 'Transformed message',
      severity: 'success',
      icon: 'ArrowRight',
    }
  }

  // 4. Heurística: Object/Array payload
  if (payload !== undefined && payload !== null) {
    const payloadAnalysis = analyzePayload(payload)
    const severity = getSummarySeverity(runtimeState, payload)
    
    return {
      title: payloadAnalysis.title,
      subtitle: payloadAnalysis.subtitle,
      severity,
      icon: severity === 'error' ? 'AlertCircle' : 'CheckCircle',
    }
  }

  // 5. Heurística: Payload preview (si no hay payload completo)
  if (payloadPreview) {
    const truncated = payloadPreview.length > 50 ? payloadPreview.substring(0, 50) + '...' : payloadPreview
    const severity = getSummarySeverity(runtimeState)
    
    return {
      title: `Output: ${truncated}`,
      severity,
      icon: 'FileText',
    }
  }

  // 6. Heurística: Running state
  if (runtimeState === 'running') {
    return {
      title: 'Running...',
      severity: 'info',
      icon: 'Loader2',
    }
  }

  // 7. Heurística: Warning state
  if (runtimeState === 'warning') {
    return {
      title: 'Warning',
      subtitle: errorMessage || 'Execution completed with warnings',
      severity: 'warn',
      icon: 'AlertTriangle',
    }
  }

  // 8. Default: Ready/Idle
  return {
    title: 'Ready',
    severity: 'info',
    icon: 'Circle',
  }
}

