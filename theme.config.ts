/**
 * Configuración de tema personalizado
 * 
 * Este archivo permite personalizar el tema base con overrides.
 * Los overrides se aplican sobre el tema base especificado.
 * 
 * Ejemplo:
 * ```typescript
 * export default {
 *   baseTheme: 'light',
 *   overrides: {
 *     colors: {
 *       accent: {
 *         primary: '#0066cc', // Tu color de marca
 *       },
 *       nodeCategories: {
 *         input: '#e8f5e9', // Color personalizado para nodos de entrada
 *         output: '#e3f2fd', // Color personalizado para nodos de salida
 *       }
 *     }
 *   }
 * }
 * ```
 */

import type { ThemeConfig } from './src/theme/config'

const config: ThemeConfig = {
  baseTheme: 'light',
  // overrides: {
  //   colors: {
  //     accent: {
  //       primary: '#0066cc',
  //       secondary: '#0088ff',
  //       tertiary: '#33aaff',
  //     },
  //   },
  // },
}

export default config

