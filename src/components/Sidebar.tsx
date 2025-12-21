/**
 * Sidebar colapsable
 * 
 * Sidebar lateral izquierdo que puede colapsarse para mostrar solo iconos
 * o expandirse para mostrar iconos con nombres.
 * Incluye una sección de configuración integrada.
 */

import React, { useState } from 'react'
import { Settings, ChevronRight, ChevronLeft, ArrowLeft, Moon, Sun, Plus, Upload, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useFlowManager } from '@/context/FlowManagerContext'
import { FlowList } from './FlowList'
import { DeleteFlowModal } from './DeleteFlowModal'
import { ImportFlowModal } from './ImportFlowModal'
import { exportFlow } from '@/api/client'
import type { NodeRedNode } from '@/api/types'

/**
 * Icono personalizado para "Mis flujos"
 * Representa: 1 nodo -> vector con 2 salidas -> 2 nodos
 * Visual: .-:
 */
function FlowsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Nodo izquierdo (origen) */}
      <circle cx="6" cy="12" r="3" />
      
      {/* Vector horizontal desde el nodo izquierdo */}
      <line x1="9" y1="12" x2="12" y2="12" />
      
      {/* Nodo central (divisor) */}
      <circle cx="12" cy="12" r="2" />
      
      {/* Vector diagonal superior hacia nodo derecho superior */}
      <line x1="14" y1="12" x2="18" y2="8" />
      
      {/* Vector diagonal inferior hacia nodo derecho inferior */}
      <line x1="14" y1="12" x2="18" y2="16" />
      
      {/* Nodo derecho superior */}
      <circle cx="18" cy="8" r="3" />
      
      {/* Nodo derecho inferior */}
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

interface SidebarItem {
  id: string
  icon: React.ComponentType<any>
  label: string
  onClick: () => void
}

type SidebarView = 'menu' | 'settings' | 'flows'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onCollapse?: () => void // Callback cuando se colapsa para resetear la vista
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onCollapse,
}: SidebarProps) {
  const [currentView, setCurrentView] = useState<SidebarView>('menu')
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { 
    isFlowManagerOpen,
    openFlowManager, 
    closeFlowManager,
    flows = [],
    activeFlowId = null,
    allNodes = [],
    isLoading = false,
    onSelectFlow,
    onCreateFlow,
    onEditFlow,
    onDuplicateFlow,
    onDeleteFlow,
    onImportFlow,
    onConvertToSubflow,
  } = useFlowManager()

  // Estado para FlowManager
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; flowId: string | null; flowName: string }>({
    isOpen: false,
    flowId: null,
    flowName: '',
  })
  const [importModal, setImportModal] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Sincronizar vista con el contexto FlowManager
  React.useEffect(() => {
    if (isFlowManagerOpen) {
      // Cuando se abre desde el contexto, cambiar a vista flows
      setCurrentView('flows')
      if (isCollapsed) {
        onToggleCollapse()
      }
    }
  }, [isFlowManagerOpen, isCollapsed, onToggleCollapse])

  // Resetear al menú principal cuando se colapsa (pero no si estamos expandiendo para mostrar flows)
  const isExpandingForFlowsRef = React.useRef(false)
  React.useEffect(() => {
    if (isCollapsed && currentView !== 'menu' && !isExpandingForFlowsRef.current) {
      setCurrentView('menu')
      if (onCollapse) {
        onCollapse()
      }
      // Cerrar FlowManager cuando se colapsa
      if (closeFlowManager) {
        closeFlowManager()
      }
    }
    // Resetear el flag después de un breve delay
    if (isExpandingForFlowsRef.current) {
      setTimeout(() => {
        isExpandingForFlowsRef.current = false
      }, 100)
    }
  }, [isCollapsed, currentView, onCollapse, closeFlowManager])

  const sidebarItems: SidebarItem[] = [
    {
      id: 'create-flow',
      icon: FlowsIcon,
      label: 'Mis flujos',
      onClick: () => {
        // Si está colapsado, expandir primero y luego cambiar la vista
        if (isCollapsed) {
          isExpandingForFlowsRef.current = true
          onToggleCollapse()
          // Cambiar la vista después de un breve delay para asegurar que el sidebar se expanda
          setTimeout(() => {
            setCurrentView('flows')
          }, 50)
        } else {
          setCurrentView('flows')
        }
      },
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Configuración',
      onClick: () => {
        setCurrentView('settings')
        // Si está colapsado, expandir al abrir configuración
        if (isCollapsed) {
          onToggleCollapse()
        }
      },
    },
  ]

  const handleBackToMenu = () => {
    setCurrentView('menu')
    if (closeFlowManager) {
      closeFlowManager()
    }
  }

  // Handlers para FlowManager
  const handleExport = async (flowId: string) => {
    try {
      const json = await exportFlow(flowId)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flow-${flowId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al exportar flow:', err)
      alert('Error al exportar flow')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.flowId || !onDeleteFlow) return
    try {
      await onDeleteFlow(deleteModal.flowId)
      setDeleteModal({ isOpen: false, flowId: null, flowName: '' })
    } catch (err) {
      console.error('Error al eliminar flow:', err)
    }
  }

  const handleCreate = async () => {
    if (!newFlowName.trim() || !onCreateFlow) {
      alert('Por favor, ingresa un nombre para el flow')
      return
    }
    setIsCreating(true)
    try {
      await onCreateFlow(newFlowName.trim())
      setNewFlowName('')
    } catch (err) {
      console.error('Error al crear flow:', err)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      className={`h-full bg-bg-secondary border-r border-canvas-grid flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Contenido del sidebar */}
      <div className="flex-1 overflow-y-auto relative">
        {currentView === 'menu' ? (
          /* Vista del menú principal */
          <div className="flex flex-col h-full absolute inset-0">
            <div className="flex-1 py-4">
              <div className="flex flex-col gap-2 px-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`flex items-center gap-3 p-3 rounded-md text-text-secondary hover:text-text-primary hover:bg-node-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 ${
                        isCollapsed ? 'justify-center' : 'justify-start'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={item.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                      {!isCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Sección de versión al final */}
            {!isCollapsed && (
              <div className="border-t border-canvas-grid p-4">
                <div className="text-xs text-text-tertiary text-center">
                  Versión 0.0.1
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'settings' ? (
          /* Vista de configuración */
          <div className="flex flex-col h-full absolute inset-0">
            {/* Header de configuración */}
            <div className="flex items-center gap-2 p-4 border-b border-canvas-grid flex-shrink-0">
              <button
                onClick={handleBackToMenu}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                aria-label="Volver al menú principal"
                title="Volver al menú principal"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2} />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <Settings className="w-5 h-5 text-text-primary" strokeWidth={2} />
                  <h2 className="text-lg font-semibold text-text-primary">Configuración</h2>
                </div>
              )}
            </div>

            {/* Contenido de configuración */}
            {!isCollapsed && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Sección de Tema */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-text-secondary mb-3">Apariencia</h3>
                  
                  {/* Toggle de tema */}
                  <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-md border border-canvas-grid hover:bg-node-hover transition-colors">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? (
                        <Moon className="w-5 h-5 text-text-primary" strokeWidth={2} />
                      ) : (
                        <Sun className="w-5 h-5 text-text-primary" strokeWidth={2} />
                      )}
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {isDarkMode ? 'Tema oscuro activado' : 'Tema claro activado'}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDarkMode}
                        onChange={toggleDarkMode}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-node-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Si está colapsado, solo mostrar el botón de regresar */}
            {isCollapsed && (
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={handleBackToMenu}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  aria-label="Volver al menú principal"
                  title="Volver al menú principal"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Vista de flows */
          <div className="flex flex-col h-full absolute inset-0">
            {/* Header de flows */}
            <div className="flex items-center gap-2 p-4 border-b border-canvas-grid flex-shrink-0">
              <button
                onClick={handleBackToMenu}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                aria-label="Volver al menú principal"
                title="Volver al menú principal"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2} />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <FlowsIcon className="w-5 h-5 text-text-primary" />
                  <h2 className="text-lg font-semibold text-text-primary">Mis flujos</h2>
                </div>
              )}
            </div>

            {/* Contenido de flows */}
            {!isCollapsed && (
              <>
                {/* Actions */}
                <div className="p-3 border-b border-canvas-grid space-y-2 flex-shrink-0">
                  {/* Create flow */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFlowName}
                      onChange={(e) => setNewFlowName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreate()
                        }
                      }}
                      placeholder="Nombre del flow..."
                      disabled={isCreating || isLoading}
                      className="flex-1 px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
                    />
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || isLoading || !newFlowName.trim()}
                      className="px-3 py-2 bg-accent-primary text-white rounded hover:bg-accent-secondary transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Crear flow"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Import flow */}
                  <button
                    onClick={() => setImportModal(true)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary hover:bg-node-hover transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Importar flow
                  </button>
                </div>

                {/* Flow list */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <FlowList
                    flows={flows}
                    activeFlowId={activeFlowId}
                    allNodes={allNodes}
                    onSelectFlow={onSelectFlow || (() => {})}
                    onEditFlow={onEditFlow || (() => {})}
                    onDuplicateFlow={onDuplicateFlow || (() => {})}
                    onExportFlow={handleExport}
                    onDeleteFlow={(flowId) => {
                      const flow = flows.find((f) => f.id === flowId)
                      setDeleteModal({
                        isOpen: true,
                        flowId,
                        flowName: flow?.label || flow?.name || `Flow ${flowId.slice(0, 8)}`,
                      })
                    }}
                    onConvertToSubflow={onConvertToSubflow}
                  />
                </div>
              </>
            )}

            {/* Si está colapsado, solo mostrar el botón de regresar */}
            {isCollapsed && (
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={handleBackToMenu}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-node-hover rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  aria-label="Volver al menú principal"
                  title="Volver al menú principal"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals de FlowManager */}
      {currentView === 'flows' && (
        <>
          <DeleteFlowModal
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal({ isOpen: false, flowId: null, flowName: '' })}
            onConfirm={handleDelete}
            flowName={deleteModal.flowName}
            isLoading={isLoading}
          />

          <ImportFlowModal
            isOpen={importModal}
            onClose={() => setImportModal(false)}
            onImport={onImportFlow || (async () => {})}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  )
}

/**
 * Botón flotante circular para expandir/colapsar el sidebar
 * Se posiciona en el borde entre el sidebar y el canvas, centrado verticalmente
 */
export function SidebarToggleButton({ 
  isCollapsed, 
  onToggle 
}: { 
  isCollapsed: boolean
  onToggle: () => void 
}) {
  // Calcular la posición: mitad del ancho del sidebar (64px cuando colapsado, 256px cuando expandido)
  const sidebarWidth = isCollapsed ? 64 : 256
  const buttonPosition = sidebarWidth // El borde derecho del sidebar
  
  return (
    <button
      onClick={onToggle}
      className="fixed top-1/2 z-50 w-10 h-10 rounded-full bg-bg-primary border-2 border-canvas-grid shadow-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-node-hover transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
      aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      title={isCollapsed ? 'Expandir' : 'Colapsar'}
      style={{
        transform: 'translate(-50%, -50%)',
        left: `${buttonPosition}px`,
      }}
    >
      {isCollapsed ? (
        <ChevronRight className="w-5 h-5" strokeWidth={2} />
      ) : (
        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
      )}
    </button>
  )
}

