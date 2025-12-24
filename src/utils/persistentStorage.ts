/**
 * Sistema de almacenamiento persistente híbrido
 * 
 * Estrategia:
 * 1. IndexedDB (cliente) - Para acceso rápido y offline
 * 2. Archivo JSON en .node-red (servidor) - Para sincronización y acceso desde Node-RED
 * 
 * Usa IndexedDB como caché local y sincroniza con el servidor cuando está disponible.
 */

const DB_NAME = 'flow-red-persistent'
const DB_VERSION = 1
const STORE_NAME = 'data'

interface PersistentData {
  key: string
  value: any
  timestamp: number
  synced: boolean // Si está sincronizado con el servidor
}

/**
 * Abre la base de datos IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
      }
    }
  })
}

/**
 * Guarda un valor en IndexedDB (local)
 */
export async function setLocal(key: string, value: any): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    const data: PersistentData = {
      key,
      value,
      timestamp: Date.now(),
      synced: false, // Marcar como no sincronizado
    }
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
  } catch (error) {
    console.error('Error al guardar en IndexedDB:', error)
    // Fallback a localStorage
    try {
      localStorage.setItem(`flow-red-persistent-${key}`, JSON.stringify({ value, timestamp: Date.now() }))
    } catch (localError) {
      console.error('Error al guardar en localStorage:', localError)
    }
  }
}

/**
 * Obtiene un valor de IndexedDB (local)
 */
export async function getLocal(key: string): Promise<any | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const data = await new Promise<PersistentData | null>((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
    
    db.close()
    return data?.value || null
  } catch (error) {
    console.error('Error al leer de IndexedDB:', error)
    // Fallback a localStorage
    try {
      const stored = localStorage.getItem(`flow-red-persistent-${key}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.value || null
      }
    } catch (localError) {
      console.error('Error al leer de localStorage:', localError)
    }
    return null
  }
}

/**
 * Elimina un valor de IndexedDB (local)
 */
export async function removeLocal(key: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
  } catch (error) {
    console.error('Error al eliminar de IndexedDB:', error)
    // Fallback a localStorage
    try {
      localStorage.removeItem(`flow-red-persistent-${key}`)
    } catch (localError) {
      console.error('Error al eliminar de localStorage:', localError)
    }
  }
}

/**
 * Lista todas las claves almacenadas localmente
 */
export async function listLocalKeys(): Promise<string[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const keys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys()
      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })
    
    db.close()
    return keys
  } catch (error) {
    console.error('Error al listar claves de IndexedDB:', error)
    // Fallback a localStorage
    const keys: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('flow-red-persistent-')) {
          keys.push(key.replace('flow-red-persistent-', ''))
        }
      }
    } catch (localError) {
      console.error('Error al listar claves de localStorage:', localError)
    }
    return keys
  }
}

/**
 * Sincroniza datos locales con el servidor (archivo JSON en .node-red)
 * 
 * Requiere un endpoint en Node-RED para leer/escribir el archivo
 */
export async function syncToServer(): Promise<void> {
  try {
    const keys = await listLocalKeys()
    const dataToSync: Record<string, any> = {}
    
    // Recopilar todos los datos no sincronizados
    for (const key of keys) {
      const value = await getLocal(key)
      if (value !== null) {
        dataToSync[key] = value
      }
    }
    
    // Enviar al servidor
    // httpAdminRoot está configurado como '/' en settings.redflow.cjs
    const baseUrl = window.location.origin.includes(':5173') 
      ? 'http://localhost:1880' 
      : window.location.origin
    const response = await fetch(`${baseUrl}/redflow/persistent-storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSync),
    })
    
    if (!response.ok) {
      throw new Error(`Error al sincronizar: ${response.status}`)
    }
    
    // Marcar como sincronizado (requiere actualizar el índice)
    // Por ahora, simplemente logueamos el éxito
    console.log('✅ Datos sincronizados con el servidor')
  } catch (error) {
    console.warn('⚠️ Error al sincronizar con el servidor:', error)
    // No lanzar error - la sincronización es opcional
  }
}

/**
 * Carga datos del servidor y los guarda localmente
 */
export async function syncFromServer(): Promise<void> {
  try {
    // httpAdminRoot está configurado como '/' en settings.redflow.cjs
    const baseUrl = window.location.origin.includes(':5173') 
      ? 'http://localhost:1880' 
      : window.location.origin
    const response = await fetch(`${baseUrl}/redflow/persistent-storage`)
    
    if (!response.ok) {
      if (response.status === 404) {
        // El archivo no existe aún, está bien
        return
      }
      throw new Error(`Error al cargar: ${response.status}`)
    }
    
    const serverData: Record<string, any> = await response.json()
    
    // Guardar cada valor localmente
    for (const [key, value] of Object.entries(serverData)) {
      await setLocal(key, value)
    }
    
    console.log('✅ Datos cargados desde el servidor')
  } catch (error) {
    console.warn('⚠️ Error al cargar desde el servidor:', error)
    // No lanzar error - la sincronización es opcional
  }
}

/**
 * Guarda un valor (local + servidor si está disponible)
 */
export async function set(key: string, value: any, sync: boolean = true): Promise<void> {
  // Guardar localmente primero
  await setLocal(key, value)
  
  // Intentar sincronizar con el servidor si está disponible
  if (sync) {
    try {
      // httpAdminRoot está configurado como '/' en settings.redflow.cjs
      const baseUrl = window.location.origin.includes(':5173') 
        ? 'http://localhost:1880' 
        : window.location.origin
      const response = await fetch(`${baseUrl}/redflow/persistent-storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      
      if (!response.ok) {
        console.warn(`⚠️ No se pudo sincronizar "${key}" con el servidor: ${response.status} ${response.statusText}`)
      } else {
        console.debug(`✅ Sincronizado "${key}" con el servidor`)
      }
    } catch (error) {
      // El valor ya está guardado localmente, pero la sincronización falló
      console.warn(`⚠️ Error al sincronizar "${key}" con el servidor:`, error)
    }
  }
}

/**
 * Obtiene un valor (intenta servidor primero, luego local)
 */
export async function get(key: string): Promise<any | null> {
  // Intentar cargar del servidor primero
  try {
    // httpAdminRoot está configurado como '/' en settings.redflow.cjs
    const baseUrl = window.location.origin.includes(':5173') 
      ? 'http://localhost:1880' 
      : window.location.origin
    const response = await fetch(`${baseUrl}/redflow/persistent-storage/${encodeURIComponent(key)}`)
    if (response.ok) {
      const data = await response.json()
      // Guardar localmente como caché
      await setLocal(key, data.value)
      return data.value
    } else if (response.status === 404) {
      // 404 es esperado si la clave no existe en el servidor, usar datos locales
      // No loguear como error, es un caso normal
    }
  } catch (error) {
    // Si falla la conexión, usar datos locales (no es un error crítico)
    // Solo loguear en modo debug
    console.debug('No se pudo cargar del servidor, usando caché local:', error)
  }
  
  // Fallback a datos locales
  return await getLocal(key)
}

