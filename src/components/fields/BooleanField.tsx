/**
 * Campo booleano (checkbox/switch)
 */

export interface BooleanFieldProps {
  id: string
  label: string
  value: boolean
  onChange: (value: boolean) => void
  required?: boolean
  disabled?: boolean
  description?: string
}

export function BooleanField({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  description,
}: BooleanFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="flex items-center gap-2 cursor-pointer"
      >
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-accent-primary border-node-border rounded focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <span className="text-xs font-medium text-text-secondary">
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </span>
      </label>
      {description && (
        <p className="text-[10px] text-text-tertiary ml-6">{description}</p>
      )}
    </div>
  )
}

