/**
 * Grid de puntos personalizado para el canvas
 * 
 * Crea un grid infinito de puntos usando CSS radial-gradient.
 * Se ajusta automáticamente al zoom y pan del canvas de ReactFlow.
 * Los colores se adaptan al tema (más oscuro en modo claro, más claro en modo oscuro).
 */

import { useTheme } from '@/context/ThemeContext'

export function DottedGridBackground() {
  const { isDarkMode } = useTheme()
  
  // Colores más llamativos según el tema
  // Modo oscuro: gris medio (#8b92a0) - un poco más oscuro
  // Modo claro: gris más oscuro (#6c757d)
  const dotColor = isDarkMode ? '#8b92a0' : '#6c757d'
  
  return (
    <div
      className="react-flow__background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0',
        opacity: 0.6,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

