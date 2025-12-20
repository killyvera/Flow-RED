/**
 * Campo JSON editable para arrays y objetos complejos
 * 
 * Permite editar propiedades que son arrays u objetos complejos
 * como props (inject), rules (switch/change), libs (function), etc.
 */

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export interface JSONFieldProps {
  id: string
  label: string
  value: any
  onChange: (value: any) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  description?: string
  default?: any
}

export function JSONField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  description,
  default: defaultValue,
}: JSONFieldProps) {
  const [jsonString, setJsonString] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)

  // Inicializar el valor
  useEffect(() => {
    try {
      // Si el valor es un string, intentar parsearlo
      if (typeof value === 'string') {
        if (value.trim() === '') {
          setJsonString('')
          setError(null)
          setIsValid(true)
          return
        }
        // Intentar parsear el JSON
        JSON.parse(value)
        setJsonString(value)
        setError(null)
        setIsValid(true)
      } else if (value === null || value === undefined) {
        // Si no hay valor, usar el default o un array vacío
        const defaultVal = defaultValue || '[]'
        setJsonString(typeof defaultVal === 'string' ? defaultVal : JSON.stringify(defaultVal, null, 2))
        setError(null)
        setIsValid(true)
      } else {
        // Si es un objeto o array, convertirlo a JSON string
        setJsonString(JSON.stringify(value, null, 2))
        setError(null)
        setIsValid(true)
      }
    } catch (err) {
      // Si hay un error al parsear, mostrar el string tal cual
      setJsonString(String(value || ''))
      setError('JSON inválido')
      setIsValid(false)
    }
  }, [value, defaultValue])

  const handleChange = (newValue: string) => {
    setJsonString(newValue)
    
    if (newValue.trim() === '') {
      setError(null)
      setIsValid(true)
      // Si está vacío y no es requerido, pasar null
      if (!required) {
        onChange(null)
      } else {
        onChange('[]')
      }
      return
    }

    try {
      const parsed = JSON.parse(newValue)
      setError(null)
      setIsValid(true)
      // Pasar el valor parseado o el string según corresponda
      // Para arrays complejos, mantener como string JSON para preservar la estructura
      onChange(newValue)
    } catch (err) {
      setError('JSON inválido')
      setIsValid(false)
      // Aún así, pasar el valor para que el usuario pueda seguir editando
      onChange(newValue)
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonString)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonString(formatted)
      setError(null)
      setIsValid(true)
      onChange(formatted)
    } catch (err) {
      // No hacer nada si no es válido
    }
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <textarea
          id={id}
          value={jsonString}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder || '[]'}
          required={required}
          disabled={disabled}
          rows={6}
          className={`w-full px-2.5 py-1.5 text-xs border rounded-md bg-bg-primary text-text-primary font-mono resize-y
            ${isValid 
              ? 'border-node-border focus:border-accent-primary focus:ring-1 focus:ring-accent-primary' 
              : 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            focus:outline-none
          `}
        />
        
        {!isValid && (
          <div className="absolute top-1 right-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      {description && !error && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={handleFormat}
          className="text-[10px] text-accent-primary hover:text-accent-hover transition-colors"
          disabled={!isValid}
        >
          Formatear JSON
        </button>
      )}
    </div>
  )
}

