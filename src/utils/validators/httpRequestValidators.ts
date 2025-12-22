/**
 * HTTP Request Validators
 * 
 * Funciones de validación específicas para el nodo HTTP Request.
 * Proveen validación de URL, headers, timeout, y otros campos.
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

/**
 * Validar URL
 */
export function validateUrl(url: string): ValidationResult {
  // URL vacía
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL is required' }
  }

  // Permitir mustache templates
  if (url.includes('{{') && url.includes('}}')) {
    // Validar que los templates estén bien formados
    const templateRegex = /\{\{[^}]+\}\}/g
    const matches = url.match(templateRegex)
    if (matches) {
      return { valid: true }
    }
  }

  // Validación de URL estándar
  try {
    const urlObj = new URL(url)
    
    // Verificar protocolo
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        valid: false, 
        error: 'URL must use http:// or https:// protocol' 
      }
    }

    // Verificar que tenga host
    if (!urlObj.hostname) {
      return { 
        valid: false, 
        error: 'URL must include a hostname' 
      }
    }

    return { valid: true }
  } catch (err) {
    // Si no es una URL válida pero contiene mustache, permitir
    if (url.includes('{{') || url.includes('}}')) {
      return { 
        valid: true, 
        warning: 'URL contains templates. Make sure they resolve to a valid URL at runtime.' 
      }
    }

    return { 
      valid: false, 
      error: 'Invalid URL format. Must be a valid HTTP/HTTPS URL or contain mustache templates.' 
    }
  }
}

/**
 * Validar headers
 */
export function validateHeaders(headers: any): ValidationResult {
  // Headers debe ser un objeto
  if (typeof headers !== 'object' || headers === null) {
    return { 
      valid: false, 
      error: 'Headers must be an object' 
    }
  }

  // No permitir arrays
  if (Array.isArray(headers)) {
    return { 
      valid: false, 
      error: 'Headers cannot be an array. Use an object with key-value pairs.' 
    }
  }

  // Validar cada header
  for (const [key, value] of Object.entries(headers)) {
    // Key no puede estar vacío
    if (!key || key.trim() === '') {
      return { 
        valid: false, 
        error: 'Header name cannot be empty' 
      }
    }

    // Value debe ser string
    if (typeof value !== 'string') {
      return { 
        valid: false, 
        error: `Header "${key}" value must be a string` 
      }
    }

    // Validar nombres de headers comunes
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'content-length') {
      return { 
        valid: true, 
        warning: 'Content-Length header is usually set automatically. Manual setting may cause issues.' 
      }
    }

    if (lowerKey === 'host') {
      return { 
        valid: true, 
        warning: 'Host header is usually set automatically from the URL.' 
      }
    }
  }

  return { valid: true }
}

/**
 * Validar timeout
 */
export function validateTimeout(timeout: number): ValidationResult {
  // Debe ser un número
  if (typeof timeout !== 'number' || isNaN(timeout)) {
    return { 
      valid: false, 
      error: 'Timeout must be a number' 
    }
  }

  // No puede ser negativo
  if (timeout < 0) {
    return { 
      valid: false, 
      error: 'Timeout cannot be negative' 
    }
  }

  // Warnings para valores extremos
  if (timeout > 0 && timeout < 1000) {
    return { 
      valid: true, 
      warning: 'Timeout is very low (< 1 second). Requests may fail frequently.' 
    }
  }

  if (timeout > 300000) {
    return { 
      valid: true, 
      warning: 'Timeout is very high (> 5 minutes). Consider if this is necessary.' 
    }
  }

  return { valid: true }
}

/**
 * Validar método HTTP
 */
export function validateMethod(method: string): ValidationResult {
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  
  if (!method || method.trim() === '') {
    return { 
      valid: false, 
      error: 'HTTP method is required' 
    }
  }

  if (!validMethods.includes(method.toUpperCase())) {
    return { 
      valid: false, 
      error: `Invalid HTTP method. Must be one of: ${validMethods.join(', ')}` 
    }
  }

  return { valid: true }
}

/**
 * Validar body para métodos que lo requieren
 */
export function validateBody(method: string, body: any): ValidationResult {
  const methodsWithBody = ['POST', 'PUT', 'PATCH']

  // Si el método no espera body, no validar
  if (!methodsWithBody.includes(method)) {
    return { valid: true }
  }

  // Warning si el body está vacío
  if (!body || 
      (typeof body === 'string' && body.trim() === '') ||
      (typeof body === 'object' && Object.keys(body).length === 0)) {
    return { 
      valid: true, 
      warning: `${method} requests usually include a body. The body is empty.` 
    }
  }

  // Validar JSON si es string
  if (typeof body === 'string') {
    try {
      JSON.parse(body)
    } catch (err) {
      // No es JSON, puede ser XML o texto plano
      return { valid: true }
    }
  }

  return { valid: true }
}

/**
 * Validar configuración completa del HTTP Request
 */
export function validateHttpRequestConfig(config: any): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validar URL
  const urlValidation = validateUrl(config.url)
  if (!urlValidation.valid && urlValidation.error) {
    errors.push(urlValidation.error)
  }
  if (urlValidation.warning) {
    warnings.push(urlValidation.warning)
  }

  // Validar método
  const methodValidation = validateMethod(config.method)
  if (!methodValidation.valid && methodValidation.error) {
    errors.push(methodValidation.error)
  }

  // Validar headers
  if (config.headers) {
    const headersValidation = validateHeaders(config.headers)
    if (!headersValidation.valid && headersValidation.error) {
      errors.push(headersValidation.error)
    }
    if (headersValidation.warning) {
      warnings.push(headersValidation.warning)
    }
  }

  // Validar timeout
  if (config.timeout !== undefined) {
    const timeoutValidation = validateTimeout(config.timeout)
    if (!timeoutValidation.valid && timeoutValidation.error) {
      errors.push(timeoutValidation.error)
    }
    if (timeoutValidation.warning) {
      warnings.push(timeoutValidation.warning)
    }
  }

  // Validar body
  if (config.body !== undefined) {
    const bodyValidation = validateBody(config.method, config.body)
    if (!bodyValidation.valid && bodyValidation.error) {
      errors.push(bodyValidation.error)
    }
    if (bodyValidation.warning) {
      warnings.push(bodyValidation.warning)
    }
  }

  // Validar Content-Type header para requests con body
  if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
    const headers = config.headers || {}
    const hasContentType = Object.keys(headers).some(
      key => key.toLowerCase() === 'content-type'
    )
    
    if (!hasContentType) {
      warnings.push('Content-Type header is not set. The API may reject the request.')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
