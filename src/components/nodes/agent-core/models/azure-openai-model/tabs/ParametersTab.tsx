import React from 'react'

export interface ParametersTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

/**
 * Tab de configuración de parámetros del modelo
 */
export function ParametersTab({ nodeData, onNodeDataChange }: ParametersTabProps) {
  const handleChange = (field: string, value: any) => {
    onNodeDataChange({
      ...nodeData,
      [field]: value
    })
  }

  const temperature = nodeData.temperature !== undefined ? nodeData.temperature : 0
  const maxTokens = nodeData.maxTokens || 800
  const timeoutMs = nodeData.timeoutMs || 15000

  return (
    <div className="space-y-6 p-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Temperature: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          <span>0 (Determinístico)</span>
          <span>1 (Creativo)</span>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Controla la aleatoriedad en las respuestas. Para agentes, se recomienda 0.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Max Tokens
        </label>
        <input
          type="number"
          min="1"
          max="4000"
          value={maxTokens}
          onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Número máximo de tokens a generar en la respuesta (1-4000)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Timeout (ms)
        </label>
        <input
          type="number"
          min="1000"
          max="60000"
          step="1000"
          value={timeoutMs}
          onChange={(e) => handleChange('timeoutMs', parseInt(e.target.value))}
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Tiempo máximo de espera para la respuesta del modelo (1000-60000 ms)
        </p>
      </div>

      <div 
        className="p-4 rounded-lg border-l-4"
        style={{
          backgroundColor: 'var(--info-bg, #eff6ff)',
          borderColor: 'var(--info-border, #3b82f6)',
          color: 'var(--info-text, #1e40af)'
        }}
      >
        <div className="flex items-start">
          <span className="text-xl mr-2">💡</span>
          <div>
            <p className="font-semibold mb-1">Recomendaciones</p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Temperature 0:</strong> Para respuestas determinísticas en agentes</li>
              <li>• <strong>Max Tokens 800:</strong> Suficiente para decisiones de agentes</li>
              <li>• <strong>Timeout 15000ms:</strong> Balance entre espera y error rápido</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

