import React from 'react'

export interface RuntimeTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

/**
 * Tab de Runtime / Debug
 * Muestra metadata de la última ejecución del modelo
 */
export function RuntimeTab({ nodeData }: RuntimeTabProps) {
  const metadata = nodeData.metadata || null
  const lastError = nodeData.lastError || null

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
          <span className="text-xl mr-2">🔍</span>
          <div>
            <p className="font-semibold mb-1">Observabilidad</p>
            <p className="text-sm">
              Esta tab muestra información de la última ejecución del nodo.
              Los prompts NO se guardan por seguridad, solo metadata de rendimiento.
            </p>
          </div>
        </div>
      </div>

      {/* Última ejecución exitosa */}
      {metadata ? (
        <div 
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: 'var(--text-primary)' }}>
            <span className="mr-2">✅</span>
            Última ejecución exitosa
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Deployment:</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {metadata.deployment || 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Prompt Tokens:</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {metadata.promptTokens || 0}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Completion Tokens:</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {metadata.completionTokens || 0}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Total Tokens:</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {metadata.totalTokens || 0}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Duración:</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                {metadata.durationMs || 0} ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Trace ID:</span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                {metadata.traceId || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="p-8 rounded-lg text-center"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)'
          }}
        >
          <span className="text-4xl mb-2 block">📊</span>
          <p className="font-medium">No hay datos de ejecución</p>
          <p className="text-sm mt-2">
            Los datos aparecerán aquí después de la primera ejecución del nodo.
          </p>
        </div>
      )}

      {/* Último error */}
      {lastError && (
        <div 
          className="p-4 rounded-lg border-l-4"
          style={{
            backgroundColor: 'var(--error-bg, #fef2f2)',
            borderColor: 'var(--error-border, #ef4444)',
            color: 'var(--error-text, #991b1b)'
          }}
        >
          <h3 className="font-semibold mb-3 flex items-center">
            <span className="mr-2">❌</span>
            Último error
          </h3>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Código:</span>{' '}
              <span className="font-mono">{lastError.code || 'UNKNOWN'}</span>
            </div>
            
            <div>
              <span className="font-semibold">Mensaje:</span>{' '}
              <span>{lastError.message || 'No message'}</span>
            </div>
            
            {lastError.statusCode && (
              <div>
                <span className="font-semibold">HTTP Status:</span>{' '}
                <span className="font-mono">{lastError.statusCode}</span>
              </div>
            )}
            
            {lastError.traceId && (
              <div>
                <span className="font-semibold">Trace ID:</span>{' '}
                <span className="font-mono text-xs">{lastError.traceId}</span>
              </div>
            )}
            
            {lastError.durationMs !== undefined && (
              <div>
                <span className="font-semibold">Duración:</span>{' '}
                <span className="font-mono">{lastError.durationMs} ms</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

