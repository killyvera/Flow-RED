/**
 * Selector de Credenciales para Nodos
 * 
 * Permite a los nodos seleccionar una credencial existente en lugar de
 * ingresar las credenciales directamente.
 */

import React, { useState, useEffect } from 'react'
import {
  CredentialType,
  Credential,
  listCredentials,
  getCredentialData,
  registerCredentialUsage,
  unregisterCredentialUsage,
} from '@/utils/credentialManager'
import { CredentialManager } from './CredentialManager'

interface CredentialSelectorProps {
  nodeId: string
  credentialType: CredentialType
  selectedCredentialId?: string
  onSelect: (credentialId: string | null, credentialData: Record<string, any> | null) => void
  className?: string
}

export function CredentialSelector({
  nodeId,
  credentialType,
  selectedCredentialId,
  onSelect,
  className = '',
}: CredentialSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [selected, setSelected] = useState<string>(selectedCredentialId || '')
  const [showManager, setShowManager] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCredentials()
  }, [credentialType])

  useEffect(() => {
    if (selectedCredentialId !== selected) {
      setSelected(selectedCredentialId || '')
    }
  }, [selectedCredentialId])

  const loadCredentials = async () => {
    setLoading(true)
    try {
      const all = await listCredentials(credentialType)
      setCredentials(all)
    } catch (error) {
      console.error('Error al cargar credenciales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (credentialId: string) => {
    setSelected(credentialId)

    // Desregistrar uso anterior
    if (selected && selected !== credentialId) {
      try {
        await unregisterCredentialUsage(selected, nodeId)
      } catch (error) {
        console.warn('Error al desregistrar uso:', error)
      }
    }

    // Registrar nuevo uso
    try {
      await registerCredentialUsage(credentialId, nodeId)
    } catch (error) {
      console.warn('Error al registrar uso:', error)
    }

    // Obtener datos de la credencial
    const data = await getCredentialData(credentialId)
    onSelect(credentialId, data)
  }

  const handleClear = async () => {
    if (selected) {
      try {
        await unregisterCredentialUsage(selected, nodeId)
      } catch (error) {
        console.warn('Error al desregistrar uso:', error)
      }
    }

    setSelected('')
    onSelect(null, null)
  }

  const handleCredentialCreated = () => {
    loadCredentials()
    setShowManager(false)
  }

  return (
    <div className={className}>
      <div className="flex gap-2 items-center">
        <select
          value={selected}
          onChange={(e) => {
            if (e.target.value) {
              handleSelect(e.target.value)
            } else {
              handleClear()
            }
          }}
          disabled={loading}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="">-- Seleccionar credencial --</option>
          {credentials.map(cred => (
            <option key={cred.id} value={cred.id}>
              {cred.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowManager(true)}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          title="Gestionar credenciales"
        >
          ⚙️
        </button>
      </div>

      {selected && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Credencial seleccionada. Los datos están encriptados y se cargarán automáticamente.
        </div>
      )}

      {showManager && (
        <CredentialManager
          isOpen={showManager}
          onClose={() => {
            setShowManager(false)
            loadCredentials()
          }}
        />
      )}
    </div>
  )
}

