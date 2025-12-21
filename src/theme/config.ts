/**
 * Sistema de configuración de temas
 * 
 * Permite overrides de temas mediante archivo de configuración
 * y merge de configuraciones parciales.
 */

import type { Theme } from './themes'
import { getTheme, validateTheme } from './themes'

/**
 * Configuración de override de tema
 * Permite sobrescribir propiedades específicas de un tema base
 */
export interface ThemeOverride {
  colors?: {
    background?: Partial<Theme['colors']['background']>
    foreground?: Partial<Theme['colors']['foreground']>
    canvas?: {
      background?: string
      grid?: string
      node?: Partial<Theme['colors']['canvas']['node']>
      edge?: Partial<Theme['colors']['canvas']['edge']>
    }
    accent?: Partial<Theme['colors']['accent']>
    status?: Partial<Theme['colors']['status']>
    group?: Partial<Theme['colors']['group']>
    nodeCategories?: Partial<Theme['colors']['nodeCategories']>
  }
  shadows?: Partial<Theme['shadows']>
}

/**
 * Configuración completa del tema
 */
export interface ThemeConfig {
  baseTheme: string
  overrides?: ThemeOverride
}

/**
 * Merge profundo de objetos
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target }

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = (source as Record<string, any>)[key]
      const targetValue = (target as Record<string, any>)[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        (output as Record<string, any>)[key] = deepMerge(targetValue, sourceValue)
      } else if (sourceValue !== undefined) {
        (output as Record<string, any>)[key] = sourceValue
      }
    })
  }

  return output
}

/**
 * Verifica si un valor es un objeto (no array, no null)
 */
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Aplica overrides a un tema base
 */
export function applyThemeOverrides(baseTheme: Theme, overrides: ThemeOverride): Theme {
  const merged = deepMerge(baseTheme, overrides as any) as Theme

  // Validar que el tema resultante sea válido
  if (!validateTheme(merged)) {
    console.warn('Tema resultante después de aplicar overrides no es válido, usando tema base')
    return baseTheme
  }

  return merged as Theme
}

/**
 * Carga la configuración de tema desde un módulo
 * Intenta cargar desde theme.config.ts en la raíz del proyecto
 * 
 * Nota: El archivo theme.config.ts es opcional. Si no existe,
 * el sistema usará el tema por defecto sin errores.
 * 
 * IMPORTANTE: Para evitar errores en tiempo de build, este import
 * usa una ruta completamente dinámica que Vite no puede analizar.
 * Si el archivo no existe, simplemente retornará null sin errores.
 */
export async function loadThemeConfig(): Promise<ThemeConfig | null> {
  // Solo intentar cargar en runtime (navegador), no en build time
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // Usar ruta relativa desde src/theme/config.ts a editor-frontend/theme.config.ts
    // El comentario @vite-ignore le dice a Vite que ignore este import
    // y no intente resolverlo en tiempo de build si el archivo no existe
    // Desde src/theme/config.ts, la ruta relativa a la raíz es ../../theme.config
    const configModule = await import(/* @vite-ignore */ '../../theme.config')
    const config = configModule?.default || configModule
    
    if (config && typeof config === 'object' && 'baseTheme' in config) {
      return config as ThemeConfig
    }
    
    return null
  } catch (error: any) {
    // El archivo no existe o hay un error - esto es completamente normal
    // El sistema funcionará con el tema por defecto sin problemas
    // No loguear el error para evitar ruido en la consola
    if (error?.message?.includes('Failed to resolve') || 
        error?.message?.includes('Cannot find module')) {
      // Error esperado cuando el archivo no existe - ignorar silenciosamente
      return null
    }
    // Otros errores también se ignoran - el sistema funciona sin el archivo
    return null
  }
}

/**
 * Carga la configuración de tema de forma síncrona (para casos donde no se puede usar async)
 * Esto requiere que el archivo theme.config.ts exporte directamente
 */
export function loadThemeConfigSync(): ThemeConfig | null {
  try {
    // En un entorno de build, esto puede no funcionar
    // Por ahora, retornamos null y usamos configuración por defecto
    // La carga real se hará en ThemeContext usando loadThemeConfig
    return null
  } catch {
    return null
  }
}

/**
 * Obtiene el tema final aplicando configuración
 */
export async function getConfiguredTheme(themeName: string): Promise<Theme> {
  const baseTheme = getTheme(themeName)
  if (!baseTheme) {
    console.warn(`Tema "${themeName}" no encontrado, usando "light"`)
    return getTheme('light')!
  }

  const config = await loadThemeConfig()
  if (!config || config.baseTheme !== themeName) {
    return baseTheme
  }

  if (config.overrides) {
    return applyThemeOverrides(baseTheme, config.overrides)
  }

  return baseTheme
}

/**
 * Valida una configuración de override
 */
export function validateThemeOverride(override: ThemeOverride): boolean {
  // Validación básica: verificar que los colores sean strings válidos si están presentes
  if (override.colors) {
    const validateColor = (color: any): boolean => {
      if (typeof color === 'string') {
        // Validar formato de color (hex, rgb, rgba, o nombre de color)
        return /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|[a-zA-Z]+)$/.test(color)
      }
      return false
    }

    // Validar colores de background
    if (override.colors.background) {
      const bg = override.colors.background
      if (bg.primary && !validateColor(bg.primary)) return false
      if (bg.secondary && !validateColor(bg.secondary)) return false
      if (bg.tertiary && !validateColor(bg.tertiary)) return false
    }

    // Validar colores de foreground
    if (override.colors.foreground) {
      const fg = override.colors.foreground
      if (fg.primary && !validateColor(fg.primary)) return false
      if (fg.secondary && !validateColor(fg.secondary)) return false
      if (fg.tertiary && !validateColor(fg.tertiary)) return false
    }

    // Validar colores de accent
    if (override.colors.accent) {
      const accent = override.colors.accent
      if (accent.primary && !validateColor(accent.primary)) return false
      if (accent.secondary && !validateColor(accent.secondary)) return false
      if (accent.tertiary && !validateColor(accent.tertiary)) return false
    }
  }

  return true
}

