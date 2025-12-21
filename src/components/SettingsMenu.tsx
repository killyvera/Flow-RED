/**
 * Menú lateral de configuración
 * 
 * Menú desplegable lateral que contiene opciones de configuración,
 * incluyendo el toggle de tema.
 */

import React from 'react'
import { Settings, Moon, Sun, X } from 'lucide-react'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

export function SettingsMenu({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
}: SettingsMenuProps) {
  // Cerrar con Escape
  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevenir scroll del body cuando el menú está abierto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-bg-primary border-l border-canvas-grid shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del menú */}
        <div className="flex items-center justify-between p-4 border-b border-canvas-grid">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-text-primary" strokeWidth={2} />
            <h2 className="text-lg font-semibold text-text-primary">Configuración</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            aria-label="Cerrar menú de configuración"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Contenido del menú */}
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
                  onChange={onToggleDarkMode}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-node-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

