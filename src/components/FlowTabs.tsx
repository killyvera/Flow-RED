/**
 * Componente de pestañas para flows
 * 
 * Muestra cada flow como una pestaña con:
 * - Nombre del flow
 * - Icono de "Dot" SVG si tiene cambios no guardados
 * - Scroll horizontal con botones de navegación
 */

import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface FlowTab {
  id: string
  label: string
  hasUnsavedChanges?: boolean
}

interface FlowTabsProps {
  flows: FlowTab[]
  activeFlowId: string | null
  onFlowSelect: (flowId: string) => void
  className?: string
}

export function FlowTabs({ flows, activeFlowId, onFlowSelect, className = '' }: FlowTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Verificar si se puede hacer scroll
  const checkScrollButtons = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  useEffect(() => {
    checkScrollButtons()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollButtons)
      window.addEventListener('resize', checkScrollButtons)
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons)
      }
      window.removeEventListener('resize', checkScrollButtons)
    }
  }, [flows])

  // Scroll a la pestaña activa cuando cambia
  useEffect(() => {
    if (!activeFlowId || !scrollContainerRef.current) return

    const activeTab = scrollContainerRef.current.querySelector(
      `[data-flow-id="${activeFlowId}"]`
    ) as HTMLElement

    if (activeTab) {
      const container = scrollContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()

      // Si la pestaña está fuera de la vista, hacer scroll
      if (tabRect.left < containerRect.left) {
        container.scrollTo({
          left: container.scrollLeft + (tabRect.left - containerRect.left) - 8,
          behavior: 'smooth',
        })
      } else if (tabRect.right > containerRect.right) {
        container.scrollTo({
          left: container.scrollLeft + (tabRect.right - containerRect.right) + 8,
          behavior: 'smooth',
        })
      }
    }
  }, [activeFlowId])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = 200
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (flows.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      {/* Botón de scroll izquierdo */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-bg-primary transition-colors text-text-secondary hover:text-text-primary"
          aria-label="Deslizar pestañas a la izquierda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Contenedor de pestañas con scroll */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {flows.map((flow) => {
          const isActive = flow.id === activeFlowId
          return (
            <button
              key={flow.id}
              data-flow-id={flow.id}
              onClick={() => onFlowSelect(flow.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                transition-all whitespace-nowrap flex-shrink-0
                ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-primary text-text-primary hover:bg-bg-secondary border border-canvas-grid'
                }
              `}
            >
              <span>{flow.label}</span>
              {flow.hasUnsavedChanges && (
                <svg
                  className="w-2 h-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 8 8"
                  aria-label="Cambios no guardados"
                >
                  <circle cx="4" cy="4" r="3" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Botón de scroll derecho */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-bg-primary transition-colors text-text-secondary hover:text-text-primary"
          aria-label="Deslizar pestañas a la derecha"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

