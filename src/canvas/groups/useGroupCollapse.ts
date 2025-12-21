/**
 * Hook para manejar el estado de colapso/expansión de grupos
 * 
 * Persiste el estado en localStorage para mantener la preferencia del usuario
 * entre sesiones. El estado NO se guarda en Node-RED, es puramente UI.
 * 
 * Sincroniza con el store de Zustand para que los nodos se oculten/muestren correctamente.
 */

import { useEffect, useCallback } from 'react'
import { useCanvasStore } from '@/state/canvasStore'

const STORAGE_PREFIX = 'node-red-editor:group-collapsed:'

/**
 * Hook para manejar el estado de colapso de un grupo
 * 
 * @param groupId ID del grupo
 * @returns Tuple [isCollapsed, setCollapsed]
 */
export function useGroupCollapse(groupId: string): [boolean, (collapsed: boolean) => void] {
  const storageKey = `${STORAGE_PREFIX}${groupId}`
  const toggleGroupCollapsed = useCanvasStore((state) => state.toggleGroupCollapsed)
  const collapsedGroupIds = useCanvasStore((state) => state.collapsedGroupIds)
  
  // Usar el store como fuente de verdad principal
  const isCollapsed = collapsedGroupIds.has(groupId)

  // Función para actualizar el estado, localStorage y el store
  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      // Actualizar el store de Zustand primero (esto actualizará isCollapsed automáticamente)
      const storeCollapsed = collapsedGroupIds.has(groupId)
      if (storeCollapsed !== collapsed) {
        toggleGroupCollapsed(groupId)
      }
      
      // Actualizar localStorage para persistencia
      try {
        if (collapsed) {
          localStorage.setItem(storageKey, 'true')
        } else {
          localStorage.removeItem(storageKey)
        }
      } catch (error) {
        console.warn('Error al guardar estado de colapso del grupo:', error)
      }
    },
    [storageKey, groupId, toggleGroupCollapsed, collapsedGroupIds]
  )

  // Sincronizar localStorage cuando cambia el store (para persistencia)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      const stored = localStorage.getItem(storageKey)
      const storedCollapsed = stored === 'true'
      
      // Si el store y localStorage están desincronizados, actualizar localStorage
      if (storedCollapsed !== isCollapsed) {
        if (isCollapsed) {
          localStorage.setItem(storageKey, 'true')
        } else {
          localStorage.removeItem(storageKey)
        }
      }
    } catch (error) {
      console.warn('Error al sincronizar localStorage:', error)
    }
  }, [isCollapsed, storageKey])

  // Sincronizar con localStorage si cambia externamente (por ejemplo, en otra pestaña)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const newValue = e.newValue === 'true'
        // Sincronizar con el store
        const storeCollapsed = collapsedGroupIds.has(groupId)
        if (storeCollapsed !== newValue) {
          toggleGroupCollapsed(groupId)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey, groupId, toggleGroupCollapsed, collapsedGroupIds])

  return [isCollapsed, setCollapsed]
}

/**
 * Limpia el estado de colapso de un grupo específico
 * 
 * @param groupId ID del grupo
 */
export function clearGroupCollapseState(groupId: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${groupId}`)
  } catch (error) {
    console.warn('Error al limpiar estado de colapso del grupo:', error)
  }
}

/**
 * Limpia el estado de colapso de todos los grupos
 */
export function clearAllGroupCollapseStates(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Error al limpiar todos los estados de colapso:', error)
  }
}

