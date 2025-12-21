/**
 * Tokens de diseño para el editor visual
 * 
 * Centraliza todas las variables de tema (colores, espaciado, tipografía)
 * para facilitar el mantenimiento y la consistencia visual.
 * 
 * Estructura:
 * - baseTokens: Tokens que no cambian entre temas (spacing, typography, etc.)
 * - colorTokens: Colores semánticos que no cambian entre temas
 * - Los colores específicos de tema están en themes.ts
 */

/**
 * Tokens base que no cambian entre temas
 */
export const baseTokens = {
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

/**
 * Colores semánticos que no cambian entre temas
 * Estos colores representan estados y significados específicos
 */
export const colorTokens = {
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const

/**
 * Tokens de accesibilidad
 * Define estándares y utilidades para cumplir con WCAG
 */
export const accessibilityTokens = {
  // Contrast ratios mínimos según WCAG
  contrast: {
    aa: {
      normal: 4.5,      // Texto normal (WCAG AA)
      large: 3.0,        // Texto grande (18pt+ o 14pt+ bold) (WCAG AA)
    },
    aaa: {
      normal: 7.0,       // Texto normal (WCAG AAA)
      large: 4.5,        // Texto grande (WCAG AAA)
    },
  },
  // Focus states
  focus: {
    ringWidth: '2px',
    ringOffset: '2px',
    ringOffsetColor: 'transparent',
    // El color del focus ring se toma del accent color del tema
  },
  // Estados de interacción
  interaction: {
    disabledOpacity: 0.5,
    hoverOpacity: 0.8,
    activeOpacity: 0.9,
  },
} as const

/**
 * Tipo para tokens base
 */
export type BaseTokens = typeof baseTokens

/**
 * Tipo para tokens de color semánticos
 */
export type ColorTokens = typeof colorTokens

/**
 * Tipo para tokens de accesibilidad
 */
export type AccessibilityTokens = typeof accessibilityTokens

/**
 * Todos los tokens combinados (para compatibilidad con código existente)
 */
export const themeTokens = {
  ...baseTokens,
  colors: colorTokens,
  accessibility: accessibilityTokens,
} as const

/**
 * Tipo para todos los tokens
 */
export type ThemeTokens = typeof themeTokens
