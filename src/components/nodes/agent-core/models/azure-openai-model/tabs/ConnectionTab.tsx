import React, { useState, useEffect } from 'react'
import { saveNodeCredentials } from '@/api/client'
import { CredentialSelector } from '@/components/credentials/CredentialSelector'
import { CredentialType, getCredentialData, registerCredentialUsage, unregisterCredentialUsage } from '@/utils/credentialManager'
import { saveNodeConfig, getNodeConfigData } from '@/utils/nodeConfigStorage'

export interface ConnectionTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
  nodeId?: string
}

/**
 * Tab de configuración de conexión a Azure OpenAI
 * 
 * Simplificado: Solo muestra selector de credenciales.
 * La credencial contiene TODOS los datos: endpoint, deployment, apiVersion, apiKey
 */
export function ConnectionTab({ nodeData, onNodeDataChange, nodeId }: ConnectionTabProps) {
  const [name, setName] = useState(() => nodeData?.name || '')
  const [credentialId, setCredentialId] = useState<string | null>(() => nodeData?.credentialId || null)
  const [isLoading, setIsLoading] = useState(false)

  // Cargar configuración guardada cuando se monta el componente
  useEffect(() => {
    if (!nodeId) return

    setIsLoading(true)
    
    // Cargar configuración guardada
    getNodeConfigData(nodeId).then(savedConfig => {
      if (savedConfig) {
        if (savedConfig.name !== undefined) {
          setName(savedConfig.name || '')
        }
        if (savedConfig.credentialId !== undefined) {
          setCredentialId(savedConfig.credentialId || null)
          
          // Si hay credentialId, cargar los datos de la credencial
          if (savedConfig.credentialId) {
            loadCredentialData(savedConfig.credentialId)
          }
        }
      } else if (nodeData?.credentialId) {
        // Si no hay configuración guardada pero nodeData tiene credentialId, usarlo
        setCredentialId(nodeData.credentialId)
        loadCredentialData(nodeData.credentialId)
      }
    }).catch(err => {
      console.warn('Error al cargar configuración guardada:', err)
    }).finally(() => {
      setIsLoading(false)
    })
  }, [nodeId])

  // Función para cargar datos de una credencial y actualizar todo
  const loadCredentialData = async (id: string) => {
    if (!nodeId) return
    
    try {
      const data = await getCredentialData(id)
      if (!data) {
        console.warn('No se encontraron datos para la credencial:', id)
        return
      }

      // La credencial debe contener: endpoint, deployment, apiVersion, apiKey
      const updatedData = {
        ...nodeData,
        credentialId: id,
        endpoint: data.endpoint || '',
        deployment: data.deployment || '',
        apiVersion: data.apiVersion || '2024-12-01-preview',
        // NO incluir apiKey en nodeData (es una credencial)
      }

      // Actualizar nodeData
      onNodeDataChange(updatedData)

      // Guardar configuración (sin apiKey)
      await saveNodeConfig(nodeId, {
        credentialId: id,
        endpoint: data.endpoint,
        deployment: data.deployment,
        apiVersion: data.apiVersion,
        name: name || nodeData?.name || '',
      })

      // Guardar API key en Node-RED para que el nodo pueda usarla
      if (data.apiKey) {
        try {
          await saveNodeCredentials(nodeId, { apiKey: data.apiKey })
          console.log(`[ConnectionTab] ✅ API key guardada en Node-RED para nodo ${nodeId}`)
        } catch (err: any) {
          console.warn(`[ConnectionTab] ⚠️ Error al guardar API key:`, err.message)
        }
      }

      // Registrar uso de la credencial
      await registerCredentialUsage(id, nodeId)
    } catch (error: any) {
      console.error('Error al cargar datos de credencial:', error)
    }
  }

  // Manejar selección de credencial
  const handleCredentialSelect = async (id: string | null, data: Record<string, any> | null) => {
    const previousCredentialId = credentialId

    // Desregistrar uso de credencial anterior
    if (previousCredentialId && nodeId) {
      try {
        await unregisterCredentialUsage(previousCredentialId, nodeId)
      } catch (err) {
        console.warn('Error al desregistrar uso de credencial anterior:', err)
      }
    }

    setCredentialId(id)

    if (id && data && nodeId) {
      // Cargar todos los datos de la credencial
      await loadCredentialData(id)
    } else if (!id && nodeId) {
      // Limpiar credencial
      const updatedData = {
        ...nodeData,
        credentialId: undefined,
        endpoint: undefined,
        deployment: undefined,
        apiVersion: undefined,
      }
      onNodeDataChange(updatedData)

      // Limpiar configuración guardada
      await saveNodeConfig(nodeId, {
        credentialId: null,
        endpoint: undefined,
        deployment: undefined,
        apiVersion: undefined,
        name: name || nodeData?.name || '',
      })
    }
  }

  // Manejar cambio de nombre
  const handleNameChange = (value: string) => {
    setName(value)
    const updatedData = {
      ...nodeData,
      name: value,
    }
    onNodeDataChange(updatedData)

    // Guardar nombre
    if (nodeId) {
      saveNodeConfig(nodeId, {
        name: value,
      }).catch(err => {
        console.warn('Error al guardar nombre:', err)
      })
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-text-secondary">
        Cargando configuración...
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Nombre del nodo */}
      <div>
        <label className="block text-sm font-medium mb-2 text-text-primary">
          Nombre del Nodo
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Azure OpenAI Model"
          className="w-full px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        />
        <p className="text-xs mt-1 text-text-secondary">
          Nombre descriptivo que se mostrará en el canvas
        </p>
      </div>

      {/* Selector de Credencial */}
      <div>
        <label className="block text-sm font-medium mb-2 text-text-primary">
          Credencial de Azure OpenAI
        </label>
        <p className="text-xs mb-3 text-text-secondary">
          Selecciona una credencial que contenga endpoint, deployment, API version y API key.
          Si no tienes una, puedes crear una nueva.
        </p>
        
        <CredentialSelector
          nodeId={nodeId || ''}
          credentialType={CredentialType.AZURE_OPENAI}
          selectedCredentialId={credentialId || undefined}
          onSelect={handleCredentialSelect}
          className="mb-2"
        />

        {credentialId && (
          <div className="mt-3 p-3 rounded-md border border-node-border bg-node-hover">
            <p className="text-xs text-text-secondary">
              ✅ Credencial seleccionada. Todos los campos (endpoint, deployment, API version, API key) 
              se han actualizado automáticamente desde la credencial.
            </p>
          </div>
        )}
      </div>

      {/* Información sobre la credencial seleccionada */}
      {credentialId && nodeData && (
        <div className="p-4 rounded-lg border border-node-border bg-bg-secondary">
          <h4 className="text-sm font-semibold mb-2 text-text-primary">Configuración actual:</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Endpoint:</span>
              <span className="text-text-primary font-mono">{nodeData.endpoint || 'No configurado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Deployment:</span>
              <span className="text-text-primary font-mono">{nodeData.deployment || 'No configurado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">API Version:</span>
              <span className="text-text-primary font-mono">{nodeData.apiVersion || 'No configurado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">API Key:</span>
              <span className="text-text-primary">•••••••• (encriptada)</span>
            </div>
          </div>
        </div>
      )}

      {/* Información */}
      <div className="p-4 rounded-lg border-l-4 border-accent-primary bg-bg-secondary">
        <div className="flex items-start">
          <span className="text-xl mr-2">💡</span>
          <div>
            <p className="font-semibold mb-1 text-sm text-text-primary">Sistema de Credenciales</p>
            <p className="text-xs text-text-secondary">
              Las credenciales centralizadas contienen toda la configuración necesaria:
              endpoint, deployment, API version y API key. Esto permite reutilizar la misma 
              configuración en múltiples nodos y facilita la gestión.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
