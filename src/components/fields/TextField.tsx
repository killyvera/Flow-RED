/**
 * Campo de texto editable (soporta modo multilínea para código)
 */

export interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  description?: string
  multiline?: boolean
  rows?: number
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  description,
  multiline = false,
  rows = 6,
}: TextFieldProps) {
  const baseClasses = "w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:border-accent-primary disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
  
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-status-error ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`${baseClasses} font-mono resize-y min-h-[80px]`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={baseClasses}
        />
      )}
      {description && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}
    </div>
  )
}

