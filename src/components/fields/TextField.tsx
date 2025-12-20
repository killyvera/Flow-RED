/**
 * Campo de texto editable
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
}: TextFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-status-error ml-1">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
      />
      {description && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}
    </div>
  )
}

