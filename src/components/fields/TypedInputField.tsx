/**
 * Campo TypedInput para Node-RED
 * 
 * Combina un select para el tipo (msg, flow, global, str, num, etc.)
 * con un input para el valor. Similar a los campos typedInput de Node-RED.
 */

import { useState, useEffect } from 'react'

export interface TypedInputFieldProps {
  id: string
  label: string
  value: any
  onChange: (value: any) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  description?: string
  default?: any
  // Opciones de tipo para el select
  typeOptions?: Array<{ value: string; label: string }>
  // Valor por defecto del tipo
  defaultType?: string
}

// Tipos comunes de Node-RED typedInput
const DEFAULT_TYPE_OPTIONS = [
  { value: 'str', label: 'String' },
  { value: 'num', label: 'Number' },
  { value: 'bool', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
  { value: 'bin', label: 'Binary' },
  { value: 'date', label: 'Date' },
  { value: 'msg', label: 'msg' },
  { value: 'flow', label: 'flow' },
  { value: 'global', label: 'global' },
  { value: 'env', label: 'env' },
  { value: 'jsonata', label: 'JSONata' },
]

export function TypedInputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  description,
  default: _defaultValue,
  typeOptions = DEFAULT_TYPE_OPTIONS,
  defaultType = 'str',
}: TypedInputFieldProps) {
  // El valor puede venir como string simple o como objeto {type, value}
  const [inputType, setInputType] = useState<string>(defaultType)
  const [inputValue, setInputValue] = useState<string>('')

  // Inicializar valores
  useEffect(() => {
    if (value === null || value === undefined) {
      setInputType(defaultType)
      setInputValue('')
      return
    }

    // Si el valor es un objeto con type y value
    if (typeof value === 'object' && 'type' in value && 'value' in value) {
      setInputType(value.type || defaultType)
      setInputValue(String(value.value || ''))
    } else if (typeof value === 'object' && 'vt' in value && 'v' in value) {
      // Formato Node-RED: {vt: 'str', v: 'value'}
      setInputType(value.vt || defaultType)
      setInputValue(String(value.v || ''))
    } else {
      // Si es un string simple, asumir que es el valor y el tipo es el default
      setInputType(defaultType)
      setInputValue(String(value || ''))
    }
  }, [value, defaultType])

  const handleTypeChange = (newType: string) => {
    setInputType(newType)
    // Cuando cambia el tipo, mantener el valor pero actualizar el formato
    const newValue = {
      type: newType,
      value: inputValue,
    }
    onChange(newValue)
  }

  const handleValueChange = (newValue: string) => {
    setInputValue(newValue)
    // Crear objeto con tipo y valor
    const typedValue = {
      type: inputType,
      value: newValue,
    }
    onChange(typedValue)
  }

  // Determinar el tipo de input según el tipo seleccionado
  const getInputType = () => {
    if (inputType === 'num') return 'number'
    if (inputType === 'bool') return 'checkbox'
    if (inputType === 'json') return 'textarea'
    return 'text'
  }

  const isBoolean = inputType === 'bool'

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        {/* Select para el tipo */}
        <select
          id={`${id}-type`}
          value={inputType}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={disabled}
          className="px-2 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary flex-shrink-0 w-24"
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Input para el valor */}
        {isBoolean ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="checkbox"
              id={id}
              checked={inputValue === 'true' || inputValue === '1'}
              onChange={(e) => handleValueChange(String(e.target.checked))}
              disabled={disabled}
              className="w-4 h-4 text-accent-primary border-node-border rounded focus:ring-accent-primary"
            />
            <span className="text-xs text-text-secondary">
              {(inputValue === 'true' || inputValue === '1') ? 'True' : 'False'}
            </span>
          </div>
        ) : getInputType() === 'textarea' ? (
          <textarea
            id={id}
            value={inputValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={3}
            className="flex-1 px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary font-mono resize-y focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        ) : (
          <input
            type={getInputType()}
            id={id}
            value={inputValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="flex-1 px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        )}
      </div>

      {description && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}
    </div>
  )
}

