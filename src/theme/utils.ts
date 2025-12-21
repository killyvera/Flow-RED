/**
 * Utilidades para temas
 * 
 * Funciones para generar CSS variables desde temas y aplicarlas al DOM
 */

import type { Theme } from './themes'
import { baseTokens, accessibilityTokens } from './tokens'

/**
 * Genera variables CSS desde un tema
 */
export function generateCSSVariables(theme: Theme): string {
  const { colors, shadows } = theme

  const variables: string[] = []

  // Colores de fondo
  variables.push(`  --color-bg-primary: ${colors.background.primary};`)
  variables.push(`  --color-bg-secondary: ${colors.background.secondary};`)
  variables.push(`  --color-bg-tertiary: ${colors.background.tertiary};`)

  // Colores de texto
  variables.push(`  --color-text-primary: ${colors.foreground.primary};`)
  variables.push(`  --color-text-secondary: ${colors.foreground.secondary};`)
  variables.push(`  --color-text-tertiary: ${colors.foreground.tertiary};`)

  // Colores del canvas
  variables.push(`  --color-canvas-bg: ${colors.canvas.background};`)
  variables.push(`  --color-canvas-grid: ${colors.canvas.grid};`)

  // Colores de nodos
  variables.push(`  --color-node-default: ${colors.canvas.node.default};`)
  variables.push(`  --color-node-selected: ${colors.canvas.node.selected};`)
  variables.push(`  --color-node-hover: ${colors.canvas.node.hover};`)
  variables.push(`  --color-node-border: ${colors.canvas.node.border};`)
  variables.push(`  --color-node-border-hover: ${colors.canvas.node['border-hover']};`)
  variables.push(`  --color-node-border-selected: ${colors.canvas.node['border-selected']};`)
  variables.push(`  --color-node-header: ${colors.canvas.node.header};`)
  variables.push(`  --color-node-header-accent: ${colors.canvas.node['header-accent']};`)

  // Colores de edges
  variables.push(`  --color-edge-default: ${colors.canvas.edge.default};`)
  variables.push(`  --color-edge-selected: ${colors.canvas.edge.selected};`)
  variables.push(`  --color-edge-hover: ${colors.canvas.edge.hover};`)
  variables.push(`  --color-edge-active: ${colors.canvas.edge.active};`)
  variables.push(`  --color-edge-active-glow: ${colors.canvas.edge['active-glow']};`)

  // Colores de acento
  variables.push(`  --color-accent-primary: ${colors.accent.primary};`)
  variables.push(`  --color-accent-secondary: ${colors.accent.secondary};`)
  variables.push(`  --color-accent-tertiary: ${colors.accent.tertiary};`)

  // Colores de estado
  variables.push(`  --color-success: ${colors.status.success};`)
  variables.push(`  --color-warning: ${colors.status.warning};`)
  variables.push(`  --color-error: ${colors.status.error};`)
  variables.push(`  --color-info: ${colors.status.info};`)

  // Estados de nodos (usando colores de status)
  variables.push(`  --node-status-success: ${colors.status.success};`)
  variables.push(`  --node-status-warning: ${colors.status.warning};`)
  variables.push(`  --node-status-error: ${colors.status.error};`)
  variables.push(`  --node-status-info: ${colors.status.info};`)

  // Colores de grupos
  variables.push(`  --color-group-default: ${colors.group.default};`)
  variables.push(`  --color-group-border: ${colors.group.border};`)
  variables.push(`  --color-group-text: ${colors.group.text};`)

  // Sombras
  variables.push(`  --shadow-node: ${shadows.node};`)
  variables.push(`  --shadow-node-hover: ${shadows['node-hover']};`)
  variables.push(`  --shadow-node-selected: ${shadows['node-selected']};`)

  // Tokens de accesibilidad (focus ring)
  variables.push(`  --focus-ring-width: ${accessibilityTokens.focus.ringWidth};`)
  variables.push(`  --focus-ring-offset: ${accessibilityTokens.focus.ringOffset};`)
  variables.push(`  --focus-ring-offset-color: ${accessibilityTokens.focus.ringOffsetColor};`)
  // El color del focus ring se toma del accent primary
  variables.push(`  --focus-ring-color: ${colors.accent.primary};`)

  // Opacidad de estados
  variables.push(`  --node-disabled-opacity: ${accessibilityTokens.interaction.disabledOpacity};`)

  return variables.join('\n')
}

/**
 * Genera variables CSS para tokens base (que no cambian entre temas)
 */
export function generateBaseCSSVariables(): string {
  const variables: string[] = []

  // Espaciado
  Object.entries(baseTokens.spacing).forEach(([key, value]) => {
    variables.push(`  --spacing-${key}: ${value};`)
  })

  // Tipografía
  variables.push(`  --font-family-sans: ${baseTokens.typography.fontFamily.sans.join(', ')};`)
  variables.push(`  --font-family-mono: ${baseTokens.typography.fontFamily.mono.join(', ')};`)

  Object.entries(baseTokens.typography.fontSize).forEach(([key, value]) => {
    variables.push(`  --font-size-${key}: ${value};`)
  })

  // Border radius
  Object.entries(baseTokens.borderRadius).forEach(([key, value]) => {
    variables.push(`  --radius-${key}: ${value};`)
  })

  // Z-index
  Object.entries(baseTokens.zIndex).forEach(([key, value]) => {
    variables.push(`  --z-index-${key}: ${value};`)
  })

  return variables.join('\n')
}

/**
 * Aplica un tema al DOM inyectando CSS variables
 */
export function applyThemeToDOM(theme: Theme, selector: string = ':root'): void {
  const themeVars = generateCSSVariables(theme)
  const baseVars = generateBaseCSSVariables()

  // Buscar o crear el elemento style para el tema
  let styleElement = document.getElementById('theme-variables')
  
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'theme-variables'
    document.head.appendChild(styleElement)
  }

  // Generar CSS completo
  const css = `
${selector} {
${baseVars}
${themeVars}
}
`

  styleElement.textContent = css
}

/**
 * Aplica un tema usando una clase CSS personalizada
 * Útil para temas personalizados que no son light/dark
 */
export function applyThemeWithClass(theme: Theme, className: string): void {
  // Remover clases de tema anteriores
  const root = document.documentElement
  const themeClasses = Array.from(root.classList).filter(cls => cls.startsWith('theme-'))
  themeClasses.forEach(cls => root.classList.remove(cls))

  // Agregar nueva clase de tema
  root.classList.add(className)

  // Aplicar variables CSS
  applyThemeToDOM(theme, `.${className}`)
}

/**
 * Aplica tema light/dark usando la clase .dark estándar
 */
export function applyLightDarkTheme(theme: Theme, isDark: boolean): void {
  const root = document.documentElement

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Aplicar variables CSS a :root (light) o .dark (dark)
  const selector = isDark ? '.dark' : ':root'
  applyThemeToDOM(theme, selector)
}

/**
 * Limpia las variables CSS del tema
 */
export function clearThemeFromDOM(): void {
  const styleElement = document.getElementById('theme-variables')
  if (styleElement) {
    styleElement.remove()
  }
}

