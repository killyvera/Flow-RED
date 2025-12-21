/**
 * Sidebar colapsable
 * 
 * Sidebar lateral izquierdo que puede colapsarse para mostrar solo iconos
 * o expandirse para mostrar iconos con nombres.
 * Incluye una sección de configuración integrada.
 */

import React, { useState } from 'react'
import { Settings, ChevronRight, ChevronLeft, ArrowLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface SidebarItem {
  id: string
  icon: React.ComponentType<any>
  label: string
  onClick: () => void
}

type SidebarView = 'menu' | 'settings'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onCollapse?: () => void // Callback cuando se colapsa para resetear la vista
}

export function Sidebar({ isCollapsed, onToggleCollapse, onCollapse }: SidebarProps) {
  const [currentView, setCurrentView] = useState<SidebarView>('menu')
  const { isDarkMode, toggleDarkMode } = useTheme()

  // Resetear al menú principal cuando se colapsa
  React.useEffect(() => {
    if (isCollapsed && currentView !== 'menu') {
      setCurrentView('menu')
      if (onCollapse) {
        onCollapse()
      }
    }
  }, [isCollapsed, currentView, onCollapse])

  const sidebarItems: SidebarItem[] = [
    {
      id: 'settings',
      icon: Settings,
      label: 'Configuración',
      onClick: () => {
        setCurrentView('settings')
        // Si está colapsado, expandir al abrir configuración
        if (isCollapsed) {
          onToggleCollapse()
        }
      },
    },
  ]

  const handleBackToMenu = () => {
    setCurrentView('menu')
  }

  return (
    <div
      className={`h-full bg-bg-secondary border-r border-canvas-grid flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Contenido del sidebar */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'menu' ? (
          /* Vista del menú principal */
          <div className="flex flex-col h-full">
            <div className="flex-1 py-4">
              <div className="flex flex-col gap-2 px-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`flex items-center gap-3 p-3 rounded-md text-text-secondary hover:text-text-primary hover:bg-node-hover transition-colors ${
                        isCollapsed ? 'justify-center' : 'justify-start'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={item.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Sección de versión al final */}
            {!isCollapsed && (
              <div className="border-t border-canvas-grid p-4">
                <div className="text-xs text-text-tertiary text-center">
                  Versión 0.0.1
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Vista de configuración */
          <div className="flex flex-col h-full">
            {/* Header de configuración */}
            <div className="flex items-center gap-2 p-4 border-b border-canvas-grid">
              <button
                onClick={handleBackToMenu}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors flex-shrink-0"
                aria-label="Volver al menú principal"
                title="Volver al menú principal"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2} />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <Settings className="w-5 h-5 text-text-primary" strokeWidth={2} />
                  <h2 className="text-lg font-semibold text-text-primary">Configuración</h2>
                </div>
              )}
            </div>

            {/* Contenido de configuración */}
            {!isCollapsed && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Sección de Tema */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Apariencia</h3>
                  
                  {/* Toggle de tema */}
                  <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-md border border-canvas-grid hover:bg-node-hover transition-colors">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? (
                        <Moon className="w-5 h-5 text-text-primary" strokeWidth={2} />
                      ) : (
                        <Sun className="w-5 h-5 text-text-primary" strokeWidth={2} />
                      )}
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {isDarkMode ? 'Tema oscuro activado' : 'Tema claro activado'}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={toggleDarkMode}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-node-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Si está colapsado, solo mostrar el botón de regresar */}
            {isCollapsed && (
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={handleBackToMenu}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors"
                  aria-label="Volver al menú principal"
                  title="Volver al menú principal"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

/**
 * Botón flotante circular para expandir/colapsar el sidebar
 * Se posiciona en el borde entre el sidebar y el canvas, centrado verticalmente
 */
export function SidebarToggleButton({ 
  isCollapsed, 
  onToggle 
}: { 
  isCollapsed: boolean
  onToggle: () => void 
}) {
  // Calcular la posición: mitad del ancho del sidebar (64px cuando colapsado, 256px cuando expandido)
  const sidebarWidth = isCollapsed ? 64 : 256
  const buttonPosition = sidebarWidth // El borde derecho del sidebar
  
  return (
    <button
      onClick={onToggle}
      className="fixed top-1/2 z-50 w-10 h-10 rounded-full bg-bg-primary border-2 border-canvas-grid shadow-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-node-hover transition-all duration-300"
      aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      title={isCollapsed ? 'Expandir' : 'Colapsar'}
      style={{
        transform: 'translate(-50%, -50%)',
        left: `${buttonPosition}px`,
      }}
    >
      {isCollapsed ? (
        <ChevronRight className="w-5 h-5" strokeWidth={2} />
      ) : (
        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
      )}
    </button>
  )
}

