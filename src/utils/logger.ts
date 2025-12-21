/**
 * Sistema de logging usando la librería 'debug'
 * 
 * Para activar logs en desarrollo, añade a .env.local:
 * VITE_DEBUG=editor-frontend:*
 * 
 * Para activar logs específicos:
 * VITE_DEBUG=editor-frontend:api,editor-frontend:flow
 * 
 * Para desactivar todos los logs, no definas VITE_DEBUG o déjalo vacío
 */

import debug from 'debug'

// Namespace base para todos los logs
const namespace = 'editor-frontend'

/**
 * Logger para el cliente API
 */
export const apiLogger = debug(`${namespace}:api`)

/**
 * Logger para operaciones de flows
 */
export const flowLogger = debug(`${namespace}:flow`)

/**
 * Logger para transformaciones y mapeo
 */
export const mapperLogger = debug(`${namespace}:mapper`)

/**
 * Logger para el store de Zustand
 */
export const storeLogger = debug(`${namespace}:store`)

/**
 * Logger general
 */
export const appLogger = debug(`${namespace}:app`)

/**
 * Configurar el sistema de logging
 * Se ejecuta automáticamente al importar este módulo
 */
function setupLogging() {
  if (typeof window === 'undefined') {
    // No estamos en el navegador, salir
    return
  }

  // Prioridad: localStorage > VITE_DEBUG env var
  // Esto permite cambiar logs sin reiniciar el servidor
  const localStorageDebug = localStorage.getItem('debug')
  const envDebug = import.meta.env.VITE_DEBUG
  const debugEnv = localStorageDebug || envDebug
  
  if (debugEnv) {
    try {
      // Habilitar logs
      debug.enable(debugEnv)
      // Solo loggear si el logger app está habilitado para evitar loop
      if (debugEnv.includes('app') || debugEnv.includes('*')) {
        // Usar console directamente para el mensaje inicial
        console.log('%c🔍 Sistema de logging activado:', 'color: #0f0', debugEnv)
      }
    } catch (error) {
      console.error('Error al configurar logging:', error)
    }
  } else {
    try {
      // Deshabilitar todos los logs si no hay configuración
      debug.disable()
    } catch (error) {
      console.error('Error al deshabilitar logging:', error)
    }
  }
}

// Configurar al cargar el módulo
setupLogging()

/**
 * Helper para loggear requests HTTP
 */
export function logRequest(method: string, url: string, options?: RequestInit) {
  apiLogger(`→ ${method} ${url}`, {
    headers: options?.headers,
    body: options?.body,
  })
}

/**
 * Helper para loggear responses HTTP
 */
export function logResponse(url: string, status: number, data?: any) {
  apiLogger(`← ${url} [${status}]`, data ? { dataLength: JSON.stringify(data).length } : {})
}

/**
 * Helper para loggear errores HTTP
 */
export function logError(url: string, error: Error) {
  apiLogger(`✗ ${url} ERROR:`, error.message, error)
}

