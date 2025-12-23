import React from 'react'

export interface ToolsPreviewTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

/**
 * Tab de vista previa de herramientas
 * Muestra las herramientas que el Agent Core proporciona al modelo
 * (Read-only, solo para información)
 */
export function ToolsPreviewTab({ nodeData }: ToolsPreviewTabProps) {
  const tools = nodeData.tools || []

  return (
    <div className="space-y-4 p-4">
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{
          backgroundColor: 'var(--info-bg, #eff6ff)',
          borderColor: 'var(--info-border, #3b82f6)',
          color: 'var(--info-text, #1e40af)'
        }}
      >
        <div className="flex items-start">
          <span className="text-xl mr-2">ℹ️</span>
          <div>
            <p className="font-semibold mb-1">Acerca de las herramientas</p>
            <p className="text-sm">
              Las herramientas son proporcionadas por el <strong>Agent Core</strong> en runtime.
              El modelo NO ejecuta las herramientas, solo decide cuál usar y con qué parámetros.
            </p>
          </div>
        </div>
      </div>

      {tools.length === 0 ? (
        <div 
          className="p-8 rounded-lg text-center"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)'
          }}
        >
          <span className="text-4xl mb-2 block">🔧</span>
          <p className="font-medium">No hay herramientas disponibles</p>
          <p className="text-sm mt-2">
            Las herramientas se mostrarán aquí cuando el Agent Core las proporcione en runtime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Herramientas disponibles ({tools.length})
          </h3>
          
          {tools.map((tool: any, index: number) => (
            <div 
              key={index}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--background-secondary)',
                borderColor: 'var(--border-color)'
              }}
            >
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">🔧</span>
                <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {tool.name}
                </h4>
              </div>
              
              {tool.description && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {tool.description}
                </p>
              )}
              
              {tool.inputSchema && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Input Schema:
                  </p>
                  <pre 
                    className="text-xs p-3 rounded overflow-auto max-h-48"
                    style={{
                      backgroundColor: 'var(--background-tertiary, #1e293b)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

