/**
 * Componente raíz de la aplicación
 * 
 * Renderiza el layout básico con Sidebar y CanvasPage usando Grid.
 */

import { useState } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { Sidebar, SidebarToggleButton } from '@/components/Sidebar'
import { CanvasPage } from '@/pages/CanvasPage'

export function App() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved !== null ? saved === 'true' : true // Por defecto colapsado
    }
    return true
  })

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newState = !prev
      localStorage.setItem('sidebarCollapsed', String(newState))
      return newState
    })
  }

  // Callback para resetear la vista cuando se colapsa
  const handleCollapse = () => {
    // Esta función se llama desde el Sidebar cuando se detecta que se colapsó
    // El Sidebar ya maneja el reset interno, pero podemos agregar lógica adicional si es necesario
  }

  return (
    <ThemeProvider>
      <div className="w-full h-full overflow-hidden grid grid-cols-[auto_1fr] relative">
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleCollapse}
          onCollapse={handleCollapse}
        />
        <CanvasPage />
        <SidebarToggleButton isCollapsed={isCollapsed} onToggle={toggleCollapse} />
      </div>
    </ThemeProvider>
  )
}

