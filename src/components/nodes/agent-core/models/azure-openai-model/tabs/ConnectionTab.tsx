import React from 'react'

export interface ConnectionTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

/**
 * Tab de configuración de conexión a Azure OpenAI
 */
export function ConnectionTab({ nodeData, onNodeDataChange }: ConnectionTabProps) {
  const handleChange = (field: string, value: any) => {
    onNodeDataChange({
      ...nodeData,
      [field]: value
    })
  }

  const endpoint = nodeData.endpoint || ''
  const deployment = nodeData.deployment || ''
  const apiVersion = nodeData.apiVersion || '2024-02-15-preview'
  const apiKey = nodeData.apiKey || ''

  // Validar formato de endpoint
  const isEndpointValid = !endpoint || /^https:\/\/.*\.openai\.azure\.com$/.test(endpoint)

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Endpoint
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => handleChange('endpoint', e.target.value)}
          placeholder="https://xxx.openai.azure.com"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: isEndpointValid ? 'var(--border-color)' : '#ef4444',
            color: 'var(--text-primary)'
          }}
        />
        {!isEndpointValid && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
            Formato inválido. Debe ser: https://[resource-name].openai.azure.com
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          URL del recurso Azure OpenAI
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Deployment
        </label>
        <input
          type="text"
          value={deployment}
          onChange={(e) => handleChange('deployment', e.target.value)}
          placeholder="gpt-4"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Nombre del deployment configurado en Azure OpenAI
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          API Version
        </label>
        <input
          type="text"
          value={apiVersion}
          onChange={(e) => handleChange('apiVersion', e.target.value)}
          placeholder="2024-02-15-preview"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Versión de la API de Azure OpenAI
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="Ingresa tu API key de Azure OpenAI"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          API key de Azure OpenAI. Si se deja vacío, se usará la variable de entorno AZURE_OPENAI_API_KEY
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
            <p className="font-semibold mb-1">API Key Configuration</p>
            <p className="text-sm">
              Puedes configurar el API key aquí o usar la variable de entorno:<br />
              <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--background-tertiary, #e5e7eb)' }}>
                AZURE_OPENAI_API_KEY
              </code>
            </p>
            <p className="text-xs mt-2" style={{ opacity: 0.8 }}>
              Si se configura aquí, tiene prioridad sobre la variable de entorno.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

