/**
 * TabbedNodeEditor Component
 * 
 * Sistema genérico de tabs para configuración de nodos con:
 * - Navegación entre tabs
 * - Renderizado condicional de tabs
 * - Badge de error por tab
 * - Soporte para iconos
 */

import React, { useState, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  component: React.ComponentType<any>
  visible?: (nodeData: any) => boolean
  hasError?: boolean
  props?: Record<string, any>
}

export interface TabbedNodeEditorProps {
  tabs: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  nodeData: any
  onNodeDataChange: (data: any) => void
  className?: string
}

export function TabbedNodeEditor({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  nodeData,
  onNodeDataChange,
  className = '',
}: TabbedNodeEditorProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '')

  // Usar controlled o uncontrolled active tab
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab
  const setActiveTab = useCallback((tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId)
    }
    onTabChange?.(tabId)
  }, [controlledActiveTab, onTabChange])

  // Filtrar tabs visibles
  const visibleTabs = tabs.filter(tab => {
    if (!tab.visible) return true
    return tab.visible(nodeData)
  })

  // Encontrar el tab activo
  const currentTab = visibleTabs.find(tab => tab.id === activeTab) || visibleTabs[0]

  // Si el tab activo no es visible, cambiar al primero visible
  React.useEffect(() => {
    if (!currentTab || currentTab.id !== activeTab) {
      if (visibleTabs.length > 0) {
        setActiveTab(visibleTabs[0].id)
      }
    }
  }, [currentTab, activeTab, visibleTabs, setActiveTab])

  if (visibleTabs.length === 0) {
    return (
      <div 
        className="p-8 text-center"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        No tabs available
      </div>
    )
  }

  const CurrentComponent = currentTab?.component

  return (
    <div className={`tabbed-node-editor ${className}`}>
      {/* Tab navigation */}
      <div 
        className="tabs-navigation border-b"
        style={{
          borderColor: 'var(--color-node-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div className="flex items-center overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
                style={{
                  borderBottomColor: isActive ? 'var(--color-accent-primary)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-node-hover)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                    e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {tab.hasError && (
                  <AlertCircle 
                    className="w-4 h-4" 
                    style={{ color: 'var(--color-status-error)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div 
        className="tab-content p-6"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {CurrentComponent && (
          <CurrentComponent
            nodeData={nodeData}
            onNodeDataChange={onNodeDataChange}
            {...(currentTab.props || {})}
          />
        )}
      </div>
    </div>
  )
}
