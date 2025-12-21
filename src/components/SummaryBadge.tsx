/**
 * SummaryBadge - Badge de severidad para resúmenes
 * 
 * Muestra un badge con color según la severidad del resumen (success/warn/error/info)
 */

import { CheckCircle, AlertCircle, AlertTriangle, Info, Loader2, Circle, ArrowRight, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SummarySeverity = 'success' | 'warn' | 'error' | 'info'

export interface SummaryBadgeProps {
  /** Severidad del resumen */
  severity: SummarySeverity
  /** Tamaño del badge */
  size?: 'sm' | 'md'
  /** Icono personalizado (opcional) */
  icon?: string
}

/**
 * Mapeo de severidad a colores del tema
 */
const severityColors: Record<SummarySeverity, { bg: string; text: string; border: string }> = {
  success: {
    bg: 'bg-status-success/10',
    text: 'text-status-success',
    border: 'border-status-success/30',
  },
  warn: {
    bg: 'bg-status-warning/10',
    text: 'text-status-warning',
    border: 'border-status-warning/30',
  },
  error: {
    bg: 'bg-status-error/10',
    text: 'text-status-error',
    border: 'border-status-error/30',
  },
  info: {
    bg: 'bg-status-info/10',
    text: 'text-status-info',
    border: 'border-status-info/30',
  },
}

/**
 * Mapeo de nombres de iconos a componentes Lucide
 */
const iconMap: Record<string, LucideIcon> = {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Circle,
  ArrowRight,
  FileText,
}

/**
 * Icono por defecto según severidad
 */
const defaultIcons: Record<SummarySeverity, LucideIcon> = {
  success: CheckCircle,
  warn: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

export function SummaryBadge({ severity, size = 'sm', icon }: SummaryBadgeProps) {
  const colors = severityColors[severity]
  const IconComponent = icon && iconMap[icon] ? iconMap[icon] : defaultIcons[severity]
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  }

  const severityTooltips: Record<SummarySeverity, string> = {
    success: 'Success: Node executed successfully',
    warn: 'Warning: Node completed with warnings',
    error: 'Error: Node execution failed',
    info: 'Info: Node is ready or running',
  }

  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full
        border
        ${colors.bg}
        ${colors.border}
        ${sizeClasses[size]}
        flex-shrink-0
      `}
      title={severityTooltips[severity]}
    >
      <IconComponent
        className={`
          ${colors.text}
          ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}
        `}
        strokeWidth={2.5}
      />
    </div>
  )
}

