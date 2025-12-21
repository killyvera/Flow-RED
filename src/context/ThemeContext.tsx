/**
 * Contexto de tema para la aplicación
 * 
 * Maneja el estado del tema (light/dark/custom) y lo persiste en localStorage.
 * Soporta múltiples temas y overrides via configuración.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTheme, getAvailableThemes, type Theme } from '@/theme/themes'
import { getConfiguredTheme } from '@/theme/config'
import { applyLightDarkTheme, applyThemeWithClass } from '@/theme/utils'

interface ThemeContextType {
  currentTheme: string
  availableThemes: string[]
  setTheme: (name: string) => void
  isDarkMode: boolean // Mantener para compatibilidad
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Estado para el tema actual
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved && getAvailableThemes().includes(saved)) {
        return saved
      }
    }
    return 'light'
  })

  // Estado para modo oscuro (compatibilidad)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      return saved === 'true'
    }
    return false
  })

  // Cargar y aplicar tema al montar
  useEffect(() => {
    const applyTheme = async () => {
      try {
        const theme = await getConfiguredTheme(currentTheme)
        
        // Si es light o dark, usar el método estándar
        if (currentTheme === 'light' || currentTheme === 'dark') {
          applyLightDarkTheme(theme, currentTheme === 'dark')
          setIsDarkMode(currentTheme === 'dark')
        } else {
          // Para temas personalizados, usar clase CSS
          applyThemeWithClass(theme, `theme-${currentTheme}`)
          setIsDarkMode(false) // Temas personalizados no son "dark mode"
        }
      } catch (error) {
        console.error('Error al cargar tema:', error)
        // Fallback a light
        const lightTheme = getTheme('light')
        if (lightTheme) {
          applyLightDarkTheme(lightTheme, false)
        }
      }
    }

    applyTheme()
  }, [currentTheme])

  // Sincronizar isDarkMode con currentTheme para compatibilidad
  useEffect(() => {
    if (currentTheme === 'dark') {
      setIsDarkMode(true)
    } else if (currentTheme === 'light') {
      setIsDarkMode(false)
    }
  }, [currentTheme])

  const setTheme = useCallback((name: string) => {
    if (!getAvailableThemes().includes(name)) {
      console.warn(`Tema "${name}" no está disponible`)
      return
    }

    setCurrentTheme(name)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', name)
      // Mantener compatibilidad con darkMode
      if (name === 'dark') {
        localStorage.setItem('darkMode', 'true')
      } else if (name === 'light') {
        localStorage.setItem('darkMode', 'false')
      }
    }
  }, [])

  const toggleDarkMode = useCallback(() => {
    // Toggle entre light y dark
    const newTheme = isDarkMode ? 'light' : 'dark'
    setTheme(newTheme)
  }, [isDarkMode, setTheme])

  const availableThemes = getAvailableThemes()

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        availableThemes,
        setTheme,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider')
  }
  return context
}
