import React, { useState, useEffect } from 'react'
import { getNodeRedBaseUrl, saveNodeCredentials, getNodeCredentials } from '@/api/client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export interface ConnectionTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
  nodeId?: string // ID del nodo para guardar credenciales
}

/**
 * Tab de configuración de conexión a Azure OpenAI
 */
export function ConnectionTab({ nodeData, onNodeDataChange, nodeId }: ConnectionTabProps) {
  // Estado local para los valores de los inputs
  const [name, setName] = useState(nodeData?.name || '')
  const [endpoint, setEndpoint] = useState(nodeData?.endpoint || '')
  const [deployment, setDeployment] = useState(nodeData?.deployment || '')
  const [apiVersion, setApiVersion] = useState(nodeData?.apiVersion || '2024-02-15-preview')
  const [apiKey, setApiKey] = useState(nodeData?.apiKey || '')
  
  // Cargar credenciales cuando se monta el componente o cambia el nodeId
  useEffect(() => {
    if (nodeId) {
      getNodeCredentials(nodeId).then(credentials => {
        if (credentials.apiKey) {
          setApiKey(credentials.apiKey)
          // NO actualizar nodeData con apiKey porque es una credencial
          // Solo actualizar el estado local para mostrar en el input
        }
      }).catch(err => {
        console.warn('No se pudieron cargar credenciales:', err)
      })
    }
  }, [nodeId])
  
  // Estado para el test de conexión
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    error?: string
    code?: string
    statusCode?: number
  } | null>(null)

  // Sincronizar con nodeData cuando cambie externamente
  useEffect(() => {
    if (nodeData?.name !== undefined) setName(nodeData.name || '')
    if (nodeData?.endpoint !== undefined) setEndpoint(nodeData.endpoint || '')
    if (nodeData?.deployment !== undefined) setDeployment(nodeData.deployment || '')
    if (nodeData?.apiVersion !== undefined) setApiVersion(nodeData.apiVersion || '2024-02-15-preview')
    if (nodeData?.apiKey !== undefined) setApiKey(nodeData.apiKey || '')
  }, [nodeData?.name, nodeData?.endpoint, nodeData?.deployment, nodeData?.apiVersion, nodeData?.apiKey])

  // Función para extraer el endpoint base de una URL completa
  const extractBaseEndpoint = (url: string): string => {
    try {
      const urlObj = new URL(url)
      // Si es un endpoint de Azure OpenAI, extraer solo el dominio base
      if (urlObj.hostname.includes('.openai.azure.com') || urlObj.hostname.includes('.cognitiveservices.azure.com')) {
        return `${urlObj.protocol}//${urlObj.hostname}`
      }
      return url
    } catch {
      return url
    }
  }

  const handleChange = (field: string, value: any) => {
    // Actualizar estado local inmediatamente
    let finalValue = value
    
    switch (field) {
      case 'name':
        setName(value)
        break
      case 'endpoint':
        // Si el usuario ingresa una URL completa, extraer solo el endpoint base
        const baseEndpoint = extractBaseEndpoint(value)
        setEndpoint(baseEndpoint)
        finalValue = baseEndpoint
        break
      case 'deployment':
        setDeployment(value)
        break
      case 'apiVersion':
        setApiVersion(value)
        break
      case 'apiKey':
        setApiKey(value)
        // Guardar apiKey como credencial en Node-RED (no en el flow JSON)
        if (nodeId && value) {
          saveNodeCredentials(nodeId, { apiKey: value }).catch(err => {
            console.error('Error al guardar credenciales:', err)
          })
        }
        // NO incluir apiKey en nodeData porque es una credencial
        // Solo notificar otros campos
        onNodeDataChange({
          ...nodeData,
          // No incluir apiKey aquí - se guarda como credencial por separado
        })
        return // Salir temprano para apiKey
      default:
        break
    }
    
    // Notificar cambio al padre - preservar TODAS las propiedades existentes
    // NOTA: apiKey se maneja por separado arriba
    onNodeDataChange({
      ...nodeData,
      [field]: finalValue
    })
  }

  // Validar formato de endpoint
  // Acepta tanto .openai.azure.com como .cognitiveservices.azure.com
  const isEndpointValid = !endpoint || 
    /^https:\/\/.*\.openai\.azure\.com(\/.*)?$/.test(endpoint) ||
    /^https:\/\/.*\.cognitiveservices\.azure\.com(\/.*)?$/.test(endpoint)

  // Función para probar la conexión
  const handleTestConnection = async () => {
    if (!endpoint || !deployment || !apiVersion) {
      setTestResult({
        success: false,
        message: 'Por favor completa todos los campos requeridos',
        error: 'Faltan campos requeridos: endpoint, deployment y apiVersion'
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const baseUrl = getNodeRedBaseUrl()
      const url = `${baseUrl}/azure-openai/test-connection`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          deployment,
          apiVersion,
          apiKey: apiKey || undefined, // Solo enviar si está configurado
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Si la respuesta no es OK, usar los datos del error
        setTestResult({
          success: false,
          message: data.error || 'Error al probar la conexión',
          error: data.error || `HTTP ${response.status}`,
          code: data.code || 'HTTP_ERROR',
          statusCode: response.status,
        })
        return
      }

      setTestResult({
        success: data.success,
        message: data.message || 'Conexión exitosa',
      })
    } catch (error: any) {
      // Intentar parsear el error de la respuesta
      let errorMessage = 'Error desconocido'
      let errorCode = 'UNKNOWN_ERROR'
      let statusCode: number | undefined

      // Si el error viene de nodeRedRequest, puede tener información estructurada
      if (error.message && error.message.includes('HTTP error')) {
        // Extraer información del mensaje de error
        const match = error.message.match(/status: (\d+)/)
        if (match) {
          statusCode = parseInt(match[1], 10)
        }
        
        // Intentar extraer el cuerpo del error si está disponible
        const errorBodyMatch = error.message.match(/- (.+)$/)
        if (errorBodyMatch) {
          try {
            const errorData = JSON.parse(errorBodyMatch[1])
            errorMessage = errorData.error || errorData.message || errorMessage
            errorCode = errorData.code || errorCode
            statusCode = errorData.statusCode || statusCode
          } catch {
            // Si no es JSON, usar el texto directamente
            errorMessage = errorBodyMatch[1].substring(0, 200)
          }
        }
      } else {
        // Usar el mensaje de error directamente
        errorMessage = error.message || errorMessage
      }

      setTestResult({
        success: false,
        message: 'Error al probar la conexión',
        error: errorMessage,
        code: errorCode,
        statusCode,
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Azure OpenAI"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Nombre descriptivo para el nodo (se mostrará en el canvas)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Endpoint
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => handleChange('endpoint', e.target.value)}
          placeholder="https://xxx.openai.azure.com o https://xxx.cognitiveservices.azure.com"
          className="w-full px-3 py-2 rounded border"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: isEndpointValid ? 'var(--border-color)' : '#ef4444',
            color: 'var(--text-primary)'
          }}
        />
        {!isEndpointValid && (
          <p className="text-sm mt-1" style={{ color: '#ef4444' }}>
            Formato inválido. Debe ser: https://[resource-name].openai.azure.com o https://[resource-name].cognitiveservices.azure.com
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

      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="Ingresa tu API key de Azure OpenAI"
            autoComplete="new-password"
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
      </form>

      {/* Botón de Test Connection */}
      <div>
        <button
          onClick={handleTestConnection}
          disabled={isTesting || !endpoint || !deployment || !apiVersion || !isEndpointValid}
          className="w-full px-4 py-2 rounded border flex items-center justify-center gap-2 transition-all duration-200"
          style={{
            backgroundColor: isTesting || !endpoint || !deployment || !apiVersion || !isEndpointValid
              ? 'var(--background-tertiary, #e5e7eb)'
              : 'var(--accent-primary, #3b82f6)',
            borderColor: 'var(--border-color)',
            color: isTesting || !endpoint || !deployment || !apiVersion || !isEndpointValid
              ? 'var(--text-tertiary, #9ca3af)'
              : '#ffffff',
            cursor: isTesting || !endpoint || !deployment || !apiVersion || !isEndpointValid
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Probando conexión...</span>
            </>
          ) : (
            <span>Probar Conexión</span>
          )}
        </button>

        {/* Mostrar resultado del test */}
        {testResult && (
          <div
            className={`mt-3 p-3 rounded-lg border-l-4 flex items-start gap-2 ${
              testResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}
            style={{
              borderColor: testResult.success ? '#22c55e' : '#ef4444',
            }}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  testResult.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {testResult.message}
              </p>
              {testResult.error && (
                <p
                  className={`text-xs mt-1 ${
                    testResult.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {testResult.error}
                </p>
              )}
              {testResult.code && (
                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                  Código: {testResult.code}
                  {testResult.statusCode && ` (HTTP ${testResult.statusCode})`}
                </p>
              )}
            </div>
          </div>
        )}
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

