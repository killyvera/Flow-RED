/**
 * Selector de Credenciales para Nodos
 * 
 * Permite a los nodos seleccionar una credencial existente en lugar de
 * ingresar las credenciales directamente.
 */

import { useState, useEffect } from 'react'
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
          className="flex-1 px-3 py-2 text-sm border border-node-border rounded-md bg-bg-secondary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="px-3 py-2 text-sm bg-bg-secondary text-text-primary border border-node-border rounded-md hover:bg-node-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          title="Gestionar credenciales"
        >
          ⚙️
        </button>
      </div>

      {selected && (
        <div className="mt-2 text-xs text-text-secondary">
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

