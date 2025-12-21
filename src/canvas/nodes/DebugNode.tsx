/**
 * Componente DebugNode - Nodo específico para nodos "debug" de Node-RED
 * 
 * Extiende BaseNode con funcionalidades específicas:
 * - Indicador de estado activo/inactivo
 * - Configuración de output (complete, payload, etc.)
 */

import { memo } from 'react'
import type { BaseNodeProps } from './types'
import { BaseNode } from './BaseNode'

/**
 * Componente DebugNode
 * 
 * Renderiza un nodo debug con indicador de estado.
 */
export const DebugNode = memo((props: BaseNodeProps) => {
  const { data, selected } = props
  const nodeData = data.data || data as any
  const nodeRedNode = nodeData.nodeRedNode
  
  // Extraer configuración del nodo debug
  const active = nodeRedNode?.active !== false // Por defecto activo
  const complete = nodeRedNode?.complete || 'payload'
  const toSidebar = nodeRedNode?.tosidebar !== false
  const toConsole = nodeRedNode?.console || false

  const baseNodeData = data.data || data as any
  return (
    <BaseNode
      {...props}
      data={{
        ...baseNodeData,
        bodyContent: (
          <div className="space-y-1.5">
            {/* Indicador de estado - más compacto */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  active ? 'bg-status-success' : 'bg-status-error'
                }`}
                title={active ? 'Activo' : 'Inactivo'}
              />
              <span className="text-[11px] font-medium text-text-secondary">
                {active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            
            {/* Configuración de output */}
            <div className="text-[11px] text-text-secondary">
              <span className="font-medium">Output:</span> {complete}
            </div>
            
            {/* Destinos */}
            <div className="flex gap-1.5 text-[10px] text-text-tertiary">
              {toSidebar && (
                <span className="px-1 py-0.5 bg-bg-secondary rounded">
                  Sidebar
                </span>
              )}
              {toConsole && (
                <span className="px-1 py-0.5 bg-bg-secondary rounded">
                  Console
                </span>
              )}
            </div>
          </div>
        ),
      } as any}
      selected={selected}
    />
  )
})

DebugNode.displayName = 'DebugNode'

