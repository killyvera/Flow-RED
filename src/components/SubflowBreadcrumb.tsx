/**
 * Breadcrumb para navegación de subflows
 * 
 * Muestra la ruta de navegación cuando se está dentro de un subflow
 * y permite volver al flow principal.
 */

import { ChevronRight, Home, ArrowLeft } from 'lucide-react'

export interface BreadcrumbItem {
  flowId: string
  flowName: string
  subflowId?: string
  subflowName?: string
}

export interface SubflowBreadcrumbProps {
  breadcrumb: BreadcrumbItem[]
  onNavigate: (index: number) => void
  onBack: () => void
}

export function SubflowBreadcrumb({
  breadcrumb,
  onNavigate,
  onBack,
}: SubflowBreadcrumbProps) {
  if (breadcrumb.length === 0) {
    return null
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-bg-secondary border-b border-node-border px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-node-hover transition-colors text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          title="Volver al flow anterior"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>
        
        <div className="w-px h-4 bg-node-border" />
        
        {breadcrumb.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
            )}
            <button
              onClick={() => onNavigate(index)}
              className={`px-2 py-1 rounded transition-colors ${
                index === breadcrumb.length - 1
                  ? 'text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-node-hover'
              } focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2`}
            >
              {index === 0 ? (
                <div className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>{item.flowName}</span>
                </div>
              ) : (
                <span>{item.subflowName || item.subflowId || 'Subflow'}</span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

