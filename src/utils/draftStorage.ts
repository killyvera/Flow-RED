/**
 * Sistema de almacenamiento de drafts (autosave)
 * 
 * Usa IndexedDB como almacenamiento principal, con fallback a localStorage.
 * Almacena drafts por flowId para permitir recuperación después de recargas.
 */

const DB_NAME = 'flow-red-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'

interface DraftData {
  flowId: string
  nodes: any[]
  edges: any[]
  nodeRedNodes: any[]
  timestamp: number
}

/**
 * Verifica si IndexedDB está disponible
 */
function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

/**
 * Abre la base de datos IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB no está disponible'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Error al abrir IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'flowId' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Guarda un draft en IndexedDB
 */
export async function saveDraft(
  flowId: string,
  nodes: any[],
  edges: any[],
  nodeRedNodes: any[]
): Promise<void> {
  if (!flowId) {
    return
  }

  const draftData: DraftData = {
    flowId,
    nodes: JSON.parse(JSON.stringify(nodes)), // Deep copy
    edges: JSON.parse(JSON.stringify(edges)), // Deep copy
    nodeRedNodes: JSON.parse(JSON.stringify(nodeRedNodes)), // Deep copy
    timestamp: Date.now(),
  }

  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.put(draftData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Error al guardar draft en IndexedDB'))
    })
    db.close()
  } catch (error) {
    // Fallback a localStorage
    console.warn('IndexedDB no disponible, usando localStorage como fallback:', error)
    try {
      const key = `flow-red-draft-${flowId}`
      localStorage.setItem(key, JSON.stringify(draftData))
    } catch (localError) {
      console.error('Error al guardar draft en localStorage:', localError)
    }
  }
}

/**
 * Carga un draft desde IndexedDB o localStorage
 */
export async function loadDraft(flowId: string): Promise<DraftData | null> {
  if (!flowId) {
    return null
  }

  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const draft = await new Promise<DraftData | null>((resolve, reject) => {
      const request = store.get(flowId)
      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => {
        reject(new Error('Error al cargar draft desde IndexedDB'))
      }
    })
    db.close()
    return draft
  } catch (error) {
    // Fallback a localStorage
    try {
      const key = `flow-red-draft-${flowId}`
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored) as DraftData
      }
    } catch (localError) {
      console.error('Error al cargar draft desde localStorage:', localError)
    }
    return null
  }
}

/**
 * Elimina un draft
 */
export async function deleteDraft(flowId: string): Promise<void> {
  if (!flowId) {
    return
  }

  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(flowId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Error al eliminar draft de IndexedDB'))
    })
    db.close()
  } catch (error) {
    // Fallback a localStorage
    try {
      const key = `flow-red-draft-${flowId}`
      localStorage.removeItem(key)
    } catch (localError) {
      console.error('Error al eliminar draft de localStorage:', localError)
    }
  }
}

/**
 * Lista todos los drafts disponibles
 */
export async function listDrafts(): Promise<DraftData[]> {
  try {
    // Intentar IndexedDB primero
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const drafts = await new Promise<DraftData[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        resolve(request.result || [])
      }
      request.onerror = () => {
        reject(new Error('Error al listar drafts desde IndexedDB'))
      }
    })
    db.close()
    return drafts
  } catch (error) {
    // Fallback a localStorage
    const drafts: DraftData[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('flow-red-draft-')) {
          const stored = localStorage.getItem(key)
          if (stored) {
            drafts.push(JSON.parse(stored) as DraftData)
          }
        }
      }
    } catch (localError) {
      console.error('Error al listar drafts desde localStorage:', localError)
    }
    return drafts
  }
}

