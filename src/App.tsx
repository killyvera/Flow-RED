/**
 * Componente raíz de la aplicación
 * 
 * Renderiza el layout básico con Sidebar y CanvasPage usando Grid.
 */

import { ThemeProvider } from '@/context/ThemeContext'
import { Sidebar } from '@/components/Sidebar'
import { CanvasPage } from '@/pages/CanvasPage'

export function App() {
  return (
    <ThemeProvider>
      <div className="w-full h-full overflow-hidden grid grid-cols-[auto_1fr]">
        <Sidebar />
        <CanvasPage />
      </div>
    </ThemeProvider>
  )
}

