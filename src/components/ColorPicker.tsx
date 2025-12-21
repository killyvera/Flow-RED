/**
 * Componente ColorPicker - Selector de color para grupos
 * 
 * Permite seleccionar un color de una paleta predefinida o ingresar
 * un color hexadecimal personalizado.
 */

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

export interface ColorPickerProps {
  /** Valor actual del color (hexadecimal) */
  value?: string
  /** Callback cuando cambia el color */
  onChange: (color: string) => void
  /** Si el picker está deshabilitado */
  disabled?: boolean
  /** ID del campo */
  id?: string
  /** Label del campo */
  label?: string
  /** Descripción del campo */
  description?: string
}

/**
 * Paleta de colores recomendada de Node-RED para grupos
 */
const COLOR_PALETTE = [
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f59e0b', // Amarillo/Naranja
  '#ef4444', // Rojo
  '#8b5cf6', // Púrpura
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#84cc16', // Lima
  '#f97316', // Naranja
  '#6366f1', // Índigo
  '#14b8a6', // Teal
  '#a855f7', // Violeta
  '#f43f5e', // Rose
  '#64748b', // Gris
  '#000000', // Negro
  '#ffffff', // Blanco
]

/**
 * Valida si un string es un color hexadecimal válido
 */
function isValidHexColor(color: string): boolean {
  if (!color) return false
  const hex = color.replace('#', '')
  return /^[0-9A-Fa-f]{6}$/.test(hex)
}

/**
 * Normaliza un color hexadecimal (agrega # si falta)
 */
function normalizeHexColor(color: string): string {
  if (!color) return ''
  return color.startsWith('#') ? color : `#${color}`
}

export function ColorPicker({
  value = '',
  onChange,
  disabled = false,
  id,
  label,
  description,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentColor = value || '#3b82f6'
  const normalizedColor = normalizeHexColor(currentColor)

  // Cerrar el picker al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCustomInput(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Enfocar el input cuando se muestra
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustomInput])

  const handleColorSelect = (color: string) => {
    onChange(color)
    setIsOpen(false)
    setShowCustomInput(false)
  }

  const handleCustomColorSubmit = () => {
    const normalized = normalizeHexColor(customColor)
    if (isValidHexColor(normalized)) {
      onChange(normalized)
      setIsOpen(false)
      setShowCustomInput(false)
      setCustomColor('')
    }
  }

  const handleCustomColorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomColorSubmit()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setShowCustomInput(false)
      setCustomColor('')
    }
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-text-secondary mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative" ref={pickerRef}>
        {/* Botón que muestra el color actual */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full px-2.5 py-1.5 text-xs border rounded-md
            flex items-center gap-2
            transition-colors duration-150
            ${disabled
              ? 'bg-bg-secondary border-node-border text-text-tertiary cursor-not-allowed opacity-50'
              : 'bg-bg-primary border-node-border text-text-primary hover:border-node-border-hover focus:outline-none focus:ring-1 focus:ring-accent-primary'
            }
          `}
        >
          {/* Muestra del color */}
          <div
            className="w-4 h-4 rounded border border-node-border flex-shrink-0"
            style={{
              backgroundColor: normalizedColor,
            }}
          />
          <span className="flex-1 text-left font-mono text-[10px]">
            {normalizedColor || 'Sin color'}
          </span>
          <span className="text-text-tertiary">▼</span>
        </button>

        {/* Dropdown con paleta de colores */}
        {isOpen && !disabled && (
          <div
            className="absolute z-50 mt-1 bg-bg-primary border border-node-border rounded-md shadow-lg p-3 min-w-[200px]"
            style={{ top: '100%' }}
          >
            {/* Paleta de colores */}
            <div className="grid grid-cols-8 gap-2 mb-3">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-6 h-6 rounded border-2 transition-all
                    hover:scale-110 hover:shadow-md
                    ${normalizedColor.toLowerCase() === color.toLowerCase()
                      ? 'border-accent-primary ring-2 ring-accent-primary ring-offset-1'
                      : 'border-node-border'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Separador */}
            <div className="border-t border-node-border my-2" />

            {/* Input para color personalizado */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-node-hover rounded transition-colors"
              >
                Color personalizado...
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyDown={handleCustomColorKeyDown}
                    placeholder="#000000"
                    className="flex-1 px-2 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary font-mono"
                  />
                  {customColor && (
                    <div
                      className="w-6 h-6 rounded border border-node-border flex-shrink-0"
                      style={{
                        backgroundColor: isValidHexColor(normalizeHexColor(customColor))
                          ? normalizeHexColor(customColor)
                          : 'transparent',
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCustomColorSubmit}
                  disabled={!isValidHexColor(normalizeHexColor(customColor))}
                  className="px-2 py-1 text-xs bg-accent-primary text-white rounded hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomColor('')
                  }}
                  className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {description && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}
    </div>
  )
}

