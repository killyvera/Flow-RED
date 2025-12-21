/**
 * Definiciones de temas para el editor visual
 * 
 * Cada tema define todos los colores y sombras que cambian entre modos.
 * Los tokens base (spacing, typography, etc.) están en tokens.ts
 */

import { colorTokens } from './tokens'

/**
 * Interface para un tema completo
 */
export interface Theme {
  name: string
  colors: {
    background: {
      primary: string
      secondary: string
      tertiary: string
    }
    foreground: {
      primary: string
      secondary: string
      tertiary: string
    }
    canvas: {
      background: string
      grid: string
      node: {
        default: string
        selected: string
        hover: string
        border: string
        'border-hover': string
        'border-selected': string
        header: string
        'header-accent': string
      }
      edge: {
        default: string
        selected: string
        hover: string
        active: string
      }
    }
    accent: {
      primary: string
      secondary: string
      tertiary: string
    }
    status: {
      success: string
      warning: string
      error: string
      info: string
    }
    group: {
      default: string
      border: string
      text: string
    }
  }
  shadows: {
    node: string
    'node-hover': string
    'node-selected': string
  }
}

/**
 * Tema claro (light) - estilo n8n
 */
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef',
    },
    foreground: {
      primary: '#1a1a1a',
      secondary: '#6c757d',
      tertiary: '#adb5bd',
    },
    canvas: {
      background: '#f8f9fa',
      grid: '#dee2e6',
      node: {
        default: '#ffffff',
        selected: '#fff4f2',
        hover: '#f8f9fa',
        border: '#dee2e6',
        'border-hover': '#ff6d5a',
        'border-selected': '#ff6d5a',
        header: '#f8f9fa',
        'header-accent': '#ff6d5a',
      },
      edge: {
        default: '#adb5bd',
        selected: '#ff6d5a',
        hover: '#ff8a7a',
        active: '#10b981',
      },
    },
    accent: {
      primary: '#ff6d5a',
      secondary: '#ff8a7a',
      tertiary: '#ffa99b',
    },
    status: {
      success: colorTokens.semantic.success,
      warning: colorTokens.semantic.warning,
      error: colorTokens.semantic.error,
      info: colorTokens.semantic.info,
    },
    group: {
      default: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#3b82f6',
    },
  },
  shadows: {
    node: '0 1px 3px rgba(0, 0, 0, 0.1)',
    'node-hover': '0 2px 6px rgba(0, 0, 0, 0.12)',
    'node-selected': '0 0 0 2px rgba(255, 109, 90, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12)',
  },
}

/**
 * Tema oscuro (dark) - estilo n8n
 */
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: {
      primary: '#1a1a1a',
      secondary: '#2d2d2d',
      tertiary: '#3d3d3d',
    },
    foreground: {
      primary: '#ffffff',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
    },
    canvas: {
      background: '#1a1a1a',
      grid: '#2d2d2d',
      node: {
        default: '#2d2d2d',
        selected: '#3d2a26',
        hover: '#353535',
        border: '#404040',
        'border-hover': '#ff6d5a',
        'border-selected': '#ff6d5a',
        header: '#353535',
        'header-accent': '#ff6d5a',
      },
      edge: {
        default: '#6b7280',
        selected: '#ff6d5a',
        hover: '#ff8a7a',
        active: '#10b981',
      },
    },
    accent: {
      primary: '#ff6d5a',
      secondary: '#ff8a7a',
      tertiary: '#ffa99b',
    },
    status: {
      success: colorTokens.semantic.success,
      warning: colorTokens.semantic.warning,
      error: colorTokens.semantic.error,
      info: colorTokens.semantic.info,
    },
    group: {
      default: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.4)',
      text: '#60a5fa',
    },
  },
  shadows: {
    node: '0 1px 3px rgba(0, 0, 0, 0.3)',
    'node-hover': '0 2px 6px rgba(0, 0, 0, 0.4)',
    'node-selected': '0 0 0 2px rgba(255, 109, 90, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4)',
  },
}

/**
 * Tema de alto contraste (high contrast)
 * Diseñado para mejorar la accesibilidad y visibilidad
 */
export const highContrastTheme: Theme = {
  name: 'highContrast',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f0f0f0',
      tertiary: '#e0e0e0',
    },
    foreground: {
      primary: '#000000',
      secondary: '#333333',
      tertiary: '#666666',
    },
    canvas: {
      background: '#ffffff',
      grid: '#cccccc',
      node: {
        default: '#ffffff',
        selected: '#ffffcc',
        hover: '#f5f5f5',
        border: '#000000',
        'border-hover': '#0066cc',
        'border-selected': '#0066cc',
        header: '#f0f0f0',
        'header-accent': '#0066cc',
      },
      edge: {
        default: '#000000',
        selected: '#0066cc',
        hover: '#0088ff',
        active: '#00aa00',
      },
    },
    accent: {
      primary: '#0066cc',
      secondary: '#0088ff',
      tertiary: '#33aaff',
    },
    status: {
      success: '#00aa00',
      warning: '#ff8800',
      error: '#cc0000',
      info: '#0066cc',
    },
    group: {
      default: 'rgba(0, 102, 204, 0.15)',
      border: 'rgba(0, 102, 204, 0.5)',
      text: '#0066cc',
    },
  },
  shadows: {
    node: '0 2px 4px rgba(0, 0, 0, 0.2)',
    'node-hover': '0 4px 8px rgba(0, 0, 0, 0.3)',
    'node-selected': '0 0 0 3px rgba(0, 102, 204, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)',
  },
}

/**
 * Tema corporativo (corporate)
 * Ejemplo de tema personalizado con colores de marca
 */
export const corporateTheme: Theme = {
  name: 'corporate',
  colors: {
    background: {
      primary: '#f5f5f5',
      secondary: '#ffffff',
      tertiary: '#e8e8e8',
    },
    foreground: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      tertiary: '#7a7a7a',
    },
    canvas: {
      background: '#f5f5f5',
      grid: '#d0d0d0',
      node: {
        default: '#ffffff',
        selected: '#e8f4f8',
        hover: '#f0f0f0',
        border: '#d0d0d0',
        'border-hover': '#0066cc',
        'border-selected': '#0066cc',
        header: '#f0f0f0',
        'header-accent': '#0066cc',
      },
      edge: {
        default: '#999999',
        selected: '#0066cc',
        hover: '#0088ff',
        active: '#00aa00',
      },
    },
    accent: {
      primary: '#0066cc',
      secondary: '#0088ff',
      tertiary: '#33aaff',
    },
    status: {
      success: colorTokens.semantic.success,
      warning: colorTokens.semantic.warning,
      error: colorTokens.semantic.error,
      info: colorTokens.semantic.info,
    },
    group: {
      default: 'rgba(0, 102, 204, 0.1)',
      border: 'rgba(0, 102, 204, 0.3)',
      text: '#0066cc',
    },
  },
  shadows: {
    node: '0 1px 3px rgba(0, 0, 0, 0.1)',
    'node-hover': '0 2px 6px rgba(0, 0, 0, 0.12)',
    'node-selected': '0 0 0 2px rgba(0, 102, 204, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12)',
  },
}

/**
 * Registro de todos los temas disponibles
 */
export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  corporate: corporateTheme,
}

/**
 * Obtiene un tema por nombre
 */
export function getTheme(name: string): Theme | undefined {
  return themes[name]
}

/**
 * Obtiene la lista de nombres de temas disponibles
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes)
}

/**
 * Valida que un tema tenga todas las propiedades requeridas
 */
export function validateTheme(theme: Partial<Theme>): theme is Theme {
  if (!theme.name || !theme.colors || !theme.shadows) {
    return false
  }

  const requiredColorPaths = [
    'background.primary',
    'foreground.primary',
    'canvas.background',
    'canvas.node.default',
    'canvas.edge.default',
    'accent.primary',
    'status.success',
  ]

  // Validación básica - verificar que existan las propiedades principales
  try {
    const colors = theme.colors
    if (
      !colors.background?.primary ||
      !colors.foreground?.primary ||
      !colors.canvas?.background ||
      !colors.accent?.primary
    ) {
      return false
    }
  } catch {
    return false
  }

  return true
}

