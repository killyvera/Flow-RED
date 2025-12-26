/**
 * Componente de Gestión de Credenciales (similar a n8n)
 * 
 * Permite crear, editar, eliminar y buscar credenciales encriptadas.
 */

import React, { useState, useEffect } from 'react'
import {
  CredentialType,
  Credential,
  CredentialSchemas,
  createCredential,
  listCredentials,
  updateCredential,
  deleteCredential,
  getCredential,
  validateCredential,
} from '@/utils/credentialManager'
import { setMasterKey, getMasterKey } from '@/utils/encryptedStorage'
import { getNodeRedBaseUrl } from '@/api/client'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface CredentialManagerProps {
  isOpen: boolean
  onClose: () => void
  inline?: boolean // Si true, se renderiza inline en lugar de como modal
}

export function CredentialManager({ isOpen, onClose, inline = false }: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<CredentialType | undefined>()
  const [masterKey, setMasterKeyState] = useState<string | null>(null)
  const [showMasterKeyDialog, setShowMasterKeyDialog] = useState(false)
  const [newMasterKey, setNewMasterKey] = useState('')
  const [loading, setLoading] = useState(false)

  // Formulario de credencial
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<CredentialType>(CredentialType.AZURE_OPENAI)
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Estado para test de conexión
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    error?: string
    code?: string
    statusCode?: number
  } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Cargar credenciales y verificar clave maestra
  useEffect(() => {
    if (isOpen) {
      const key = getMasterKey()
      if (!key) {
        setShowMasterKeyDialog(true)
      } else {
        setMasterKeyState(key)
        loadCredentials()
      }
    }
  }, [isOpen])

  const loadCredentials = async () => {
    setLoading(true)
    try {
      // Sincronizar credenciales existentes con el servidor antes de cargar
      // Esto asegura que las credenciales guardadas localmente se envíen al servidor
      try {
        const { syncToServer } = await import('@/utils/persistentStorage')
        await syncToServer()
      } catch (syncError) {
        console.warn('No se pudieron sincronizar credenciales con el servidor:', syncError)
        // Continuar de todas formas, las credenciales están en local
      }
      
      const all = await listCredentials(filterType)
      setCredentials(all)
    } catch (error) {
      console.error('Error al cargar credenciales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetMasterKey = () => {
    if (newMasterKey.length < 8) {
      alert('La clave debe tener al menos 8 caracteres')
      return
    }
    setMasterKey(newMasterKey)
    setMasterKeyState(newMasterKey)
    setShowMasterKeyDialog(false)
    setNewMasterKey('')
    loadCredentials()
  }

  const handleCreateNew = () => {
    if (inline) {
      // En modo inline, abrir modal
      setShowCreateModal(true)
      setSelectedCredential(null)
      setIsEditing(true)
      setFormName('')
      setFormType(CredentialType.AZURE_OPENAI)
      setFormData({})
    } else {
      // En modo modal, mostrar inline
      setSelectedCredential(null)
      setIsEditing(true)
      setFormName('')
      setFormType(CredentialType.AZURE_OPENAI)
      setFormData({})
    }
  }

  const handleEdit = async (credential: Credential) => {
    setSelectedCredential(credential)
    setIsEditing(true)
    setFormName(credential.name)
    setFormType(credential.type)
    
    // Cargar datos existentes (incluyendo datos sensibles para edición)
    // El usuario puede ver y modificar todos los campos
    if (credential.data) {
      setFormData(credential.data)
    } else {
      setFormData({})
    }
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('El nombre es requerido')
      return
    }

    setLoading(true)
    try {
      if (selectedCredential) {
        // Actualizar: preservar datos existentes si formData está vacío o incompleto
        let dataToSave = formData
        
        // Si formData está vacío o solo tiene algunos campos, combinar con datos existentes
        if (Object.keys(formData).length === 0 || 
            (selectedCredential.data && Object.keys(selectedCredential.data).length > Object.keys(formData).length)) {
          dataToSave = {
            ...selectedCredential.data,
            ...formData, // Los nuevos valores sobrescriben los existentes
          }
        }
        
        // Validar solo si hay datos nuevos
        if (Object.keys(formData).length > 0) {
          const validation = validateCredential(formType, dataToSave)
          if (!validation.valid) {
            alert(`Errores de validación:\n${validation.errors.join('\n')}`)
            return
          }
        }
        
        await updateCredential(selectedCredential.id, {
          name: formName,
          data: dataToSave,
        })
      } else {
        // Crear: validar todos los campos requeridos
        const validation = validateCredential(formType, formData)
        if (!validation.valid) {
          alert(`Errores de validación:\n${validation.errors.join('\n')}`)
          return
        }
        await createCredential(formName, formType, formData)
      }
      await loadCredentials()
      setIsEditing(false)
      setSelectedCredential(null)
      setFormName('')
      setFormData({})
      if (showCreateModal) {
        setShowCreateModal(false)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (credential: Credential) => {
    if (!confirm(`¿Eliminar credencial "${credential.name}"?`)) {
      return
    }

    setLoading(true)
    try {
      await deleteCredential(credential.id)
      await loadCredentials()
      if (selectedCredential?.id === credential.id) {
        setSelectedCredential(null)
        setIsEditing(false)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSelectedCredential(null)
    setFormName('')
    setFormData({})
    if (showCreateModal) {
      setShowCreateModal(false)
    }
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
    // Limpiar resultado del test cuando se cambia un campo
    if (testResult) {
      setTestResult(null)
    }
  }

  // Función para normalizar el endpoint base de una URL completa
  const extractBaseEndpoint = (url: string): string => {
    if (!url) return url
    try {
      // Limpiar espacios y barras finales
      let cleanUrl = url.trim().replace(/\/+$/, '')
      
      // Si no tiene protocolo, agregar https://
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`
      }
      
      const urlObj = new URL(cleanUrl)
      
      // Para Azure OpenAI, extraer solo el dominio base (sin path)
      if (urlObj.hostname.includes('.openai.azure.com') || urlObj.hostname.includes('.cognitiveservices.azure.com')) {
        return `${urlObj.protocol}//${urlObj.hostname}`
      }
      
      return `${urlObj.protocol}//${urlObj.hostname}`
    } catch {
      return url.trim()
    }
  }

  // Función para probar la conexión de Azure OpenAI
  const handleTestConnection = async () => {
    if (formType !== CredentialType.AZURE_OPENAI) {
      return
    }

    const endpoint = formData.endpoint
    const deployment = formData.deployment
    const apiVersion = formData.apiVersion
    const apiKey = formData.apiKey

    if (!endpoint || !deployment || !apiVersion || !apiKey) {
      setTestResult({
        success: false,
        message: 'Por favor completa todos los campos requeridos',
        error: 'Faltan campos requeridos: endpoint, deployment, API version y API key'
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const baseUrl = getNodeRedBaseUrl()
      const url = `${baseUrl}/azure-openai/test-connection`
      
      // Normalizar endpoint antes de enviar
      const normalizedEndpoint = extractBaseEndpoint(endpoint)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: normalizedEndpoint,
          deployment: deployment.trim(),
          apiVersion: apiVersion.trim(),
          apiKey: apiKey.trim(),
        }),
      })

      let data: any
      try {
        data = await response.json()
      } catch (parseError) {
        const text = await response.text()
        setTestResult({
          success: false,
          message: `Error al probar la conexión: ${text || 'Respuesta inválida'}`,
          error: text || `HTTP ${response.status}`,
          code: 'PARSE_ERROR',
          statusCode: response.status,
        })
        return
      }

      if (!response.ok) {
        let errorMessage = data.error || data.message || 'Error al probar la conexión'
        let errorDetails = ''
        
        if (response.status === 404) {
          errorDetails = 'Verifica que:\n- El endpoint sea correcto (ej: https://tu-recurso.openai.azure.com)\n- El deployment exista y esté activo\n- La API version sea válida'
        } else if (response.status === 401) {
          errorDetails = 'Verifica que la API key sea correcta y tenga permisos'
        } else if (response.status === 403) {
          errorDetails = 'Verifica que la API key tenga permisos para acceder al deployment'
        }
        
        setTestResult({
          success: false,
          message: errorMessage,
          error: errorDetails || data.error || `HTTP ${response.status}`,
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
      let errorMessage = 'Error desconocido'
      let errorCode = 'UNKNOWN_ERROR'
      let statusCode: number | undefined

      if (error.message && error.message.includes('HTTP error')) {
        const match = error.message.match(/status: (\d+)/)
        if (match) {
          statusCode = parseInt(match[1], 10)
        }
        
        const errorBodyMatch = error.message.match(/- (.+)$/)
        if (errorBodyMatch) {
          try {
            const errorData = JSON.parse(errorBodyMatch[1])
            errorMessage = errorData.error || errorData.message || errorMessage
            errorCode = errorData.code || errorCode
            statusCode = errorData.statusCode || statusCode
          } catch {
            errorMessage = errorBodyMatch[1].substring(0, 200)
          }
        }
      } else {
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

  // Filtrar credenciales
  const filteredCredentials = credentials.filter(cred => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!cred.name.toLowerCase().includes(query) &&
          !cred.type.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  if (!isOpen) return null

  const schema = CredentialSchemas[formType]

  // Si es inline, renderizar sin el overlay de modal
  if (inline) {
    return (
      <div className="h-full flex flex-col">
        {/* Dialog de clave maestra */}
        {showMasterKeyDialog && (
          <div className="p-4 border-b border-node-border">
            <h3 className="text-sm font-semibold mb-2 text-text-primary">Establecer Clave Maestra</h3>
            <p className="text-xs text-text-secondary mb-3">
              Necesitas establecer una clave maestra para encriptar tus credenciales.
              Esta clave se guardará localmente y no se compartirá.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={newMasterKey}
                onChange={(e) => setNewMasterKey(e.target.value)}
                placeholder="Ingresa tu clave maestra (mínimo 8 caracteres)"
                className="flex-1 px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              />
              <button
                onClick={handleSetMasterKey}
                className="px-3 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              >
                Establecer
              </button>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Búsqueda y filtros */}
          <div className="p-3 border-b border-node-border flex-shrink-0 space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar credenciales..."
              className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            />
            <select
              value={filterType || ''}
              onChange={(e) => setFilterType(e.target.value ? e.target.value as CredentialType : undefined)}
              className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              <option value="">Todos los tipos</option>
              {Object.values(CredentialType).map(type => (
                <option key={type} value={type}>
                  {CredentialSchemas[type].name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Lista de credenciales */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-text-tertiary text-sm">Cargando...</div>
            ) : filteredCredentials.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary text-sm">
                {searchQuery ? 'No se encontraron credenciales' : 'No hay credenciales'}
              </div>
            ) : (
              <div className="divide-y divide-node-border">
                {filteredCredentials.map(cred => (
                  <div
                    key={cred.id}
                    onClick={() => !isEditing && setSelectedCredential(cred)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedCredential?.id === cred.id 
                        ? 'bg-node-selected' 
                        : 'hover:bg-node-hover'
                    }`}
                  >
                    <div className="font-medium text-sm text-text-primary">
                      {cred.name}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {CredentialSchemas[cred.type].name}
                    </div>
                    {cred.usedBy && cred.usedBy.length > 0 && (
                      <div className="text-xs text-accent-primary mt-1">
                        Usado por {cred.usedBy.length} nodo(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón crear */}
          <div className="p-3 border-t border-node-border flex-shrink-0">
            <button
              onClick={handleCreateNew}
              disabled={isEditing && !showCreateModal}
              className="w-full px-3 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            >
              + Nueva Credencial
            </button>
          </div>
        </div>

        {/* Panel de edición/detalles (solo para editar credencial existente, no para crear nueva) */}
        {(selectedCredential || (isEditing && !showCreateModal)) && (
          <div className="flex-1 overflow-y-auto p-4 border-t border-node-border">
            {isEditing ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {selectedCredential ? 'Editar Credencial' : 'Nueva Credencial'}
                </h3>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-primary">Nombre</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Mi credencial de Azure OpenAI"
                    className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-primary">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value as CredentialType)
                      setFormData({}) // Limpiar datos al cambiar tipo
                    }}
                    className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  >
                    {Object.values(CredentialType).map(type => (
                      <option key={type} value={type}>
                        {CredentialSchemas[type].name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    {schema.description}
                  </p>
                </div>

                {/* Campos del esquema */}
                <div className="space-y-3">
                  {schema.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-xs font-medium mb-1.5 text-text-primary">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      />
                      {field.helpText && (
                        <p className="text-xs text-text-secondary mt-1">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botón de Test de Conexión (solo para Azure OpenAI) */}
                {formType === CredentialType.AZURE_OPENAI && (
                  <div className="pt-4 border-t border-node-border">
                    <button
                      onClick={handleTestConnection}
                      disabled={
                        isTesting ||
                        !formData.endpoint ||
                        !formData.deployment ||
                        !formData.apiVersion ||
                        !formData.apiKey
                      }
                      className="w-full px-4 py-2 text-sm rounded-md border flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      style={{
                        backgroundColor:
                          isTesting ||
                          !formData.endpoint ||
                          !formData.deployment ||
                          !formData.apiVersion ||
                          !formData.apiKey
                            ? 'var(--background-tertiary, #e5e7eb)'
                            : 'var(--accent-primary, #3b82f6)',
                        borderColor: 'var(--border-color)',
                        color:
                          isTesting ||
                          !formData.endpoint ||
                          !formData.deployment ||
                          !formData.apiVersion ||
                          !formData.apiKey
                            ? 'var(--text-tertiary, #9ca3af)'
                            : '#ffffff',
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
                          testResult.success
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
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
                              className={`text-xs mt-1 whitespace-pre-line ${
                                testResult.success
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {testResult.error}
                            </p>
                          )}
                          {testResult.code && (
                            <p className="text-xs mt-1 text-text-secondary">
                              Código: {testResult.code}
                              {testResult.statusCode && ` (HTTP ${testResult.statusCode})`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-2 text-sm bg-bg-secondary text-text-primary border border-node-border rounded-md hover:bg-node-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : selectedCredential ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{selectedCredential.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(selectedCredential)}
                      className="px-2.5 py-1 text-xs bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCredential)}
                      className="px-2.5 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-secondary mb-1">Tipo</div>
                  <div className="text-sm font-medium text-text-primary">{CredentialSchemas[selectedCredential.type].name}</div>
                </div>

                {selectedCredential.usedBy && selectedCredential.usedBy.length > 0 && (
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Usado por</div>
                    <div className="text-sm text-text-primary">{selectedCredential.usedBy.length} nodo(s)</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-text-secondary mb-1">Creada</div>
                  <div className="text-sm text-text-primary">
                    {new Date(selectedCredential.createdAt).toLocaleString()}
                  </div>
                </div>

                {selectedCredential.lastUsedAt && (
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Último uso</div>
                    <div className="text-sm text-text-primary">
                      {new Date(selectedCredential.lastUsedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Mostrar información parcial de la credencial (sin datos sensibles) */}
                {selectedCredential.data && (
                  <div className="pt-4 border-t border-node-border space-y-2">
                    <div className="text-xs font-medium text-text-secondary mb-2">Información de la credencial</div>
                    {Object.entries(selectedCredential.data).map(([key, value]) => {
                      const schema = CredentialSchemas[selectedCredential.type]
                      const field = schema.fields.find(f => f.name === key)
                      const isSensitive = field?.type === 'password' || key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
                      
                      if (isSensitive) {
                        // Ocultar valores sensibles
                        return (
                          <div key={key}>
                            <div className="text-xs text-text-secondary mb-0.5">{field?.label || key}</div>
                            <div className="text-sm text-text-primary font-mono">
                              {'•'.repeat(20)} (oculto)
                            </div>
                          </div>
                        )
                      } else if (value) {
                        // Mostrar valores no sensibles
                        return (
                          <div key={key}>
                            <div className="text-xs text-text-secondary mb-0.5">{field?.label || key}</div>
                            <div className="text-sm text-text-primary break-all">
                              {String(value)}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-node-border">
                  <p className="text-xs text-text-secondary">
                    Los datos sensibles (API keys, contraseñas) están ocultos por seguridad.
                    Usa "Editar" para ver o modificar todos los valores.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Modal para crear nueva credencial (solo en modo inline) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-bg-primary rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ border: '1px solid var(--color-node-border)' }}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-node-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                  Nueva Credencial
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Contenido del formulario */}
              <div className="flex-1 overflow-y-auto p-6">
                {isEditing && (
                  <div className="space-y-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-text-primary">Nombre</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Mi credencial de Azure OpenAI"
                        className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      />
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-text-primary">Tipo</label>
                      <select
                        value={formType}
                        onChange={(e) => {
                          setFormType(e.target.value as CredentialType)
                          setFormData({}) // Limpiar datos al cambiar tipo
                        }}
                        className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      >
                        {Object.values(CredentialType).map(type => (
                          <option key={type} value={type}>
                            {CredentialSchemas[type].name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-text-secondary mt-1">
                        {schema.description}
                      </p>
                    </div>

                    {/* Campos del esquema */}
                    <div className="space-y-3">
                      {schema.fields.map(field => (
                        <div key={field.name}>
                          <label className="block text-xs font-medium mb-1.5 text-text-primary">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                          />
                          {field.helpText && (
                            <p className="text-xs text-text-secondary mt-1">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Botón de Test de Conexión (solo para Azure OpenAI) */}
                    {formType === CredentialType.AZURE_OPENAI && (
                      <div className="pt-4 border-t border-node-border">
                        <button
                          onClick={handleTestConnection}
                          disabled={
                            isTesting ||
                            !formData.endpoint ||
                            !formData.deployment ||
                            !formData.apiVersion ||
                            !formData.apiKey
                          }
                          className="w-full px-4 py-2 text-sm rounded-md border flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                          style={{
                            backgroundColor:
                              isTesting ||
                              !formData.endpoint ||
                              !formData.deployment ||
                              !formData.apiVersion ||
                              !formData.apiKey
                                ? 'var(--background-tertiary, #e5e7eb)'
                                : 'var(--accent-primary, #3b82f6)',
                            borderColor: 'var(--border-color)',
                            color:
                              isTesting ||
                              !formData.endpoint ||
                              !formData.deployment ||
                              !formData.apiVersion ||
                              !formData.apiKey
                                ? 'var(--text-tertiary, #9ca3af)'
                                : '#ffffff',
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
                              testResult.success
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-red-50 dark:bg-red-900/20'
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
                                  className={`text-xs mt-1 whitespace-pre-line ${
                                    testResult.success
                                      ? 'text-green-700 dark:text-green-300'
                                      : 'text-red-700 dark:text-red-300'
                                  }`}
                                >
                                  {testResult.error}
                                </p>
                              )}
                              {testResult.code && (
                                <p className="text-xs mt-1 text-text-secondary">
                                  Código: {testResult.code}
                                  {testResult.statusCode && ` (HTTP ${testResult.statusCode})`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-3 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      >
                        {loading ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-2 text-sm bg-bg-secondary text-text-primary border border-node-border rounded-md hover:bg-node-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Renderizado como modal (comportamiento por defecto)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gestión de Credenciales
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Dialog de clave maestra */}
        {showMasterKeyDialog && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2">Establecer Clave Maestra</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Necesitas establecer una clave maestra para encriptar tus credenciales.
              Esta clave se guardará localmente y no se compartirá.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={newMasterKey}
                onChange={(e) => setNewMasterKey(e.target.value)}
                placeholder="Ingresa tu clave maestra (mínimo 8 caracteres)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSetMasterKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Establecer
              </button>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex-1 overflow-hidden flex">
          {/* Lista de credenciales */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Búsqueda y filtros */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar credenciales..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-2"
              />
              <select
                value={filterType || ''}
                onChange={(e) => setFilterType(e.target.value ? e.target.value as CredentialType : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos los tipos</option>
                {Object.values(CredentialType).map(type => (
                  <option key={type} value={type}>
                    {CredentialSchemas[type].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Cargando...</div>
              ) : filteredCredentials.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery ? 'No se encontraron credenciales' : 'No hay credenciales'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCredentials.map(cred => (
                    <div
                      key={cred.id}
                      onClick={() => !isEditing && setSelectedCredential(cred)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedCredential?.id === cred.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {cred.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {CredentialSchemas[cred.type].name}
                      </div>
                      {cred.usedBy && cred.usedBy.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Usado por {cred.usedBy.length} nodo(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón crear */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCreateNew}
                disabled={isEditing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                + Nueva Credencial
              </button>
            </div>
          </div>

          {/* Panel de edición/detalles */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {selectedCredential ? 'Editar Credencial' : 'Nueva Credencial'}
                </h3>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Mi credencial de Azure OpenAI"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value as CredentialType)
                      setFormData({}) // Limpiar datos al cambiar tipo
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    {Object.values(CredentialType).map(type => (
                      <option key={type} value={type}>
                        {CredentialSchemas[type].name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {schema.description}
                  </p>
                </div>

                {/* Campos del esquema */}
                <div className="space-y-3">
                  {schema.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                      {field.helpText && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botón de Test de Conexión (solo para Azure OpenAI) */}
                {formType === CredentialType.AZURE_OPENAI && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleTestConnection}
                      disabled={
                        isTesting ||
                        !formData.endpoint ||
                        !formData.deployment ||
                        !formData.apiVersion ||
                        !formData.apiKey
                      }
                      className="w-full px-4 py-2 text-sm rounded-md border flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
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
                          testResult.success
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
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
                              className={`text-xs mt-1 whitespace-pre-line ${
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
                )}

                {/* Botones */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : selectedCredential ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{selectedCredential.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(selectedCredential)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCredential)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tipo</div>
                  <div className="font-medium">{CredentialSchemas[selectedCredential.type].name}</div>
                </div>

                {selectedCredential.usedBy && selectedCredential.usedBy.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Usado por</div>
                    <div className="text-sm">{selectedCredential.usedBy.length} nodo(s)</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Creada</div>
                  <div className="text-sm">
                    {new Date(selectedCredential.createdAt).toLocaleString()}
                  </div>
                </div>

                {selectedCredential.lastUsedAt && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Último uso</div>
                    <div className="text-sm">
                      {new Date(selectedCredential.lastUsedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Mostrar información parcial de la credencial (sin datos sensibles) */}
                {selectedCredential.data && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Información de la credencial</div>
                    {Object.entries(selectedCredential.data).map(([key, value]) => {
                      const schema = CredentialSchemas[selectedCredential.type]
                      const field = schema.fields.find(f => f.name === key)
                      const isSensitive = field?.type === 'password' || key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
                      
                      if (isSensitive) {
                        // Ocultar valores sensibles
                        return (
                          <div key={key}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{field?.label || key}</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white">
                              {'•'.repeat(20)} (oculto)
                            </div>
                          </div>
                        )
                      } else if (value) {
                        // Mostrar valores no sensibles
                        return (
                          <div key={key}>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{field?.label || key}</div>
                            <div className="text-sm text-gray-900 dark:text-white break-all">
                              {String(value)}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Los datos sensibles (API keys, contraseñas) están ocultos por seguridad.
                    Usa "Editar" para ver o modificar todos los valores.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <p>Selecciona una credencial o crea una nueva</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

