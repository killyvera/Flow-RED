/**
 * Hook para manejar el estado de colapso/expansión de grupos
 * 
 * Persiste el estado en localStorage para mantener la preferencia del usuario
 * entre sesiones. El estado NO se guarda en Node-RED, es puramente UI.
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'node-red-editor:group-collapsed:'

/**
 * Hook para manejar el estado de colapso de un grupo
 * 
 * @param groupId ID del grupo
 * @returns Tuple [isCollapsed, setCollapsed]
 */
export function useGroupCollapse(groupId: string): [boolean, (collapsed: boolean) => void] {
  const storageKey = `${STORAGE_PREFIX}${groupId}`
  
  // Inicializar desde localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    
    try {
      const stored = localStorage.getItem(storageKey)
      return stored === 'true'
    } catch (error) {
      console.warn('Error al leer estado de colapso del grupo:', error)
      return false
    }
  })

  // Función para actualizar el estado y localStorage
  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setIsCollapsed(collapsed)
      
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
    [storageKey]
  )

  // Sincronizar con localStorage si cambia externamente (por ejemplo, en otra pestaña)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setIsCollapsed(e.newValue === 'true')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey])

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

