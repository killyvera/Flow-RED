/**
 * Tokens de diseño para el editor visual
 * 
 * Centraliza todas las variables de tema (colores, espaciado, tipografía)
 * para facilitar el mantenimiento y la consistencia visual.
 */

export const themeTokens = {
  colors: {
    // Colores base - Modo claro (estilo n8n)
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
    // Colores para el canvas - Modo claro
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
      },
    },
    // Colores de estado - estilo n8n
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    // Colores de acento - Rojo n8n
    accent: {
      primary: '#ff6d5a',
      secondary: '#ff8a7a',
      tertiary: '#ffa99b',
    },
    // Colores modo oscuro
    dark: {
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
        },
      },
    },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: '0.6875rem',   // 11px - más compacto estilo n8n
      sm: '0.8125rem',   // 13px
      base: '0.9375rem', // 15px
      lg: '1.0625rem',   // 17px
      xl: '1.1875rem',   // 19px
      '2xl': '1.375rem', // 22px
      '3xl': '1.625rem', // 26px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1rem',   // 16px (para nodos estilo Flowise/n8n)
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.08)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.1)',
    // Sombras suaves para nodos (estilo n8n - más sutiles)
    node: '0 1px 3px rgba(0, 0, 0, 0.1)',
    'node-hover': '0 2px 6px rgba(0, 0, 0, 0.12)',
    'node-selected': '0 0 0 2px rgba(255, 109, 90, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12)',
    // Sombras para modo oscuro
    'node-dark': '0 1px 3px rgba(0, 0, 0, 0.3)',
    'node-hover-dark': '0 2px 6px rgba(0, 0, 0, 0.4)',
    'node-selected-dark': '0 0 0 2px rgba(255, 109, 90, 0.3), 0 2px 6px rgba(0, 0, 0, 0.4)',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
} as const

// Tipo para TypeScript
export type ThemeTokens = typeof themeTokens

