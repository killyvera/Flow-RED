/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores de fondo
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        // Colores de texto
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        // Colores del canvas
        'canvas-bg': 'var(--color-canvas-bg)',
        'canvas-grid': 'var(--color-canvas-grid)',
        'node-default': 'var(--color-node-default)',
        'node-selected': 'var(--color-node-selected)',
        'node-hover': 'var(--color-node-hover)',
        'node-border': 'var(--color-node-border)',
        'node-border-hover': 'var(--color-node-border-hover)',
        'node-border-selected': 'var(--color-node-border-selected)',
        'node-header': 'var(--color-node-header)',
        'node-header-accent': 'var(--color-node-header-accent)',
        'edge-default': 'var(--color-edge-default)',
        'edge-selected': 'var(--color-edge-selected)',
        'edge-hover': 'var(--color-edge-hover)',
        'edge-active': 'var(--color-edge-active)',
        // Colores de estado
        'status-success': 'var(--color-success)',
        'status-warning': 'var(--color-warning)',
        'status-error': 'var(--color-error)',
        'status-info': 'var(--color-info)',
        // Colores de acento
        'accent-primary': 'var(--color-accent-primary)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-tertiary': 'var(--color-accent-tertiary)',
        // Colores de grupos
        'group-default': 'var(--color-group-default)',
        'group-border': 'var(--color-group-border)',
        'group-text': 'var(--color-group-text)',
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
        mono: 'var(--font-family-mono)',
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '1.2' }],   // 11px
        sm: ['0.8125rem', { lineHeight: '1.4' }],   // 13px
        base: ['0.9375rem', { lineHeight: '1.5' }], // 15px
        lg: ['1.0625rem', { lineHeight: '1.5' }],   // 17px
        xl: ['1.1875rem', { lineHeight: '1.5' }],   // 19px
        '2xl': ['1.375rem', { lineHeight: '1.5' }], // 22px
        '3xl': ['1.625rem', { lineHeight: '1.5' }], // 26px
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        'node': 'var(--shadow-node)',
        'node-hover': 'var(--shadow-node-hover)',
        'node-selected': 'var(--shadow-node-selected)',
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      zIndex: {
        'base': 'var(--z-index-base)',
        'dropdown': 'var(--z-index-dropdown)',
        'sticky': 'var(--z-index-sticky)',
        'fixed': 'var(--z-index-fixed)',
        'modal': 'var(--z-index-modal)',
        'popover': 'var(--z-index-popover)',
        'tooltip': 'var(--z-index-tooltip)',
      },
      // Tokens de accesibilidad - focus rings
      ringWidth: {
        'focus': 'var(--focus-ring-width)',
      },
      ringOffsetWidth: {
        'focus': 'var(--focus-ring-offset)',
      },
      ringColor: {
        'focus': 'var(--focus-ring-color)',
      },
      ringOffsetColor: {
        'focus': 'var(--focus-ring-offset-color)',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Soporte para dark mode mediante clase
}
