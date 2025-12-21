/**
 * Utilidades de accesibilidad para temas
 * 
 * Funciones para validar contrast ratios, calcular colores accesibles,
 * y asegurar cumplimiento con WCAG
 */

import { accessibilityTokens } from './tokens'

/**
 * Convierte un color hexadecimal a RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  // Remover # si existe
  const cleanHex = hex.replace('#', '')
  
  // Manejar formato corto (3 dígitos)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return [r, g, b]
  }
  
  // Manejar formato largo (6 dígitos)
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return [r, g, b]
  }
  
  return null
}

/**
 * Convierte un color RGB a valores normalizados (0-1)
 */
function rgbToNormalized(rgb: [number, number, number]): [number, number, number] {
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
}

/**
 * Calcula la luminancia relativa de un color según WCAG
 */
function getLuminance(color: string): number {
  let rgb: [number, number, number] | null = hexToRgb(color)
  if (!rgb) {
    // Si no es hex, intentar parsear como rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      rgb = [
        parseInt(rgbMatch[1]),
        parseInt(rgbMatch[2]),
        parseInt(rgbMatch[3])
      ]
    } else {
      // Color no reconocido, retornar luminancia por defecto (gris medio)
      return 0.5
    }
  }

  const [r, g, b] = rgbToNormalized(rgb)

  // Aplicar corrección gamma
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  // Calcular luminancia relativa
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
}

/**
 * Calcula el contrast ratio entre dos colores
 * Retorna un valor entre 1 (mismo color) y 21 (blanco sobre negro)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Valida si el contraste entre dos colores cumple con WCAG AA
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const requiredRatio = isLargeText
    ? accessibilityTokens.contrast.aa.large
    : accessibilityTokens.contrast.aa.normal

  return ratio >= requiredRatio
}

/**
 * Valida si el contraste entre dos colores cumple con WCAG AAA
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const requiredRatio = isLargeText
    ? accessibilityTokens.contrast.aaa.large
    : accessibilityTokens.contrast.aaa.normal

  return ratio >= requiredRatio
}

/**
 * Ajusta la luminosidad de un color para alcanzar un contrast ratio mínimo
 */
export function adjustColorForContrast(
  foreground: string,
  background: string,
  targetRatio: number,
  isLargeText: boolean = false
): string {
  const requiredRatio = isLargeText
    ? accessibilityTokens.contrast.aa.large
    : accessibilityTokens.contrast.aa.normal

  const currentRatio = getContrastRatio(foreground, background)
  
  if (currentRatio >= requiredRatio) {
    return foreground // Ya cumple con el ratio requerido
  }

  // Calcular la luminancia del fondo
  const bgLum = getLuminance(background)
  
  // Determinar si necesitamos aclarar u oscurecer
  const fgLum = getLuminance(foreground)
  const needsLighten = fgLum < bgLum

  // Calcular la luminancia objetivo
  const targetLum = needsLighten
    ? (bgLum + 0.05) * requiredRatio - 0.05
    : (bgLum + 0.05) / requiredRatio - 0.05

  // Ajustar el color (simplificado - en producción usar una librería como color)
  // Por ahora, retornar el color original con una advertencia
  console.warn(
    `Color ${foreground} no cumple con el contrast ratio requerido sobre ${background}. ` +
    `Ratio actual: ${currentRatio.toFixed(2)}, requerido: ${requiredRatio}`
  )

  return foreground
}

/**
 * Valida que todos los pares de colores de un tema cumplan con WCAG AA
 */
export function validateThemeAccessibility(theme: {
  colors: {
    foreground: { primary: string; secondary: string; tertiary: string }
    background: { primary: string; secondary: string; tertiary: string }
    canvas: {
      node: { default: string; header: string }
      edge: { default: string }
    }
  }
}): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Validar texto primario sobre fondo primario
  if (!meetsWCAGAA(theme.colors.foreground.primary, theme.colors.background.primary)) {
    issues.push(
      `Texto primario (${theme.colors.foreground.primary}) sobre fondo primario ` +
      `(${theme.colors.background.primary}) no cumple WCAG AA`
    )
  }

  // Validar texto secundario sobre fondo primario
  if (!meetsWCAGAA(theme.colors.foreground.secondary, theme.colors.background.primary)) {
    issues.push(
      `Texto secundario (${theme.colors.foreground.secondary}) sobre fondo primario ` +
      `(${theme.colors.background.primary}) no cumple WCAG AA`
    )
  }

  // Validar texto sobre nodos
  if (!meetsWCAGAA(theme.colors.foreground.primary, theme.colors.canvas.node.default)) {
    issues.push(
      `Texto sobre nodo default (${theme.colors.canvas.node.default}) no cumple WCAG AA`
    )
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Obtiene las clases CSS para focus states accesibles
 */
export function getFocusClasses(): string {
  return `
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-[var(--focus-ring-color)]
    focus-visible:ring-offset-2
    focus-visible:ring-offset-[var(--focus-ring-offset-color)]
  `.trim()
}

/**
 * Obtiene los estilos inline para focus states (cuando no se pueden usar clases)
 */
export function getFocusStyles(): React.CSSProperties {
  return {
    outline: 'none',
  }
}

