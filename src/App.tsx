/**
 * Componente raíz de la aplicación
 * 
 * Renderiza el layout básico y la página principal del canvas.
 * Por ahora es minimalista, en el futuro se puede añadir:
 * - Header/Navbar
 * - Sidebar con paleta de nodos
 * - Panel de propiedades
 * - Toolbar
 */

import { CanvasPage } from '@/pages/CanvasPage'

export function App() {
  return (
    <div className="w-full h-full overflow-hidden">
      <CanvasPage />
    </div>
  )
}

