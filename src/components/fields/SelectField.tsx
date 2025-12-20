/**
 * Campo de selección (dropdown)
 */

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  required?: boolean
  disabled?: boolean
  description?: string
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  description,
}: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-text-secondary"
      >
        {label}
        {required && <span className="text-status-error ml-1">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p className="text-[10px] text-text-tertiary">{description}</p>
      )}
    </div>
  )
}

