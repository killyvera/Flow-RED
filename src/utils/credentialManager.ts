/**
 * Sistema de Gestión de Credenciales Centralizado (similar a n8n)
 * 
 * Permite crear, editar y reutilizar credenciales encriptadas.
 * Las credenciales se organizan por tipo (Azure OpenAI, Anthropic, etc.)
 * y pueden ser referenciadas por múltiples nodos.
 */

import { setEncrypted, getEncrypted, removeEncrypted, listEncryptedKeys } from './encryptedStorage'

// Prefijo para credenciales
const CREDENTIAL_PREFIX = 'credential:'

/**
 * Tipos de credenciales soportados
 */
export enum CredentialType {
  AZURE_OPENAI = 'azure-openai',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE_AI = 'google-ai',
  CUSTOM = 'custom',
}

/**
 * Estructura de una credencial
 */
export interface Credential {
  id: string
  name: string
  type: CredentialType
  data: Record<string, any> // Datos de la credencial (encriptados)
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
  usedBy?: string[] // IDs de nodos que usan esta credencial
}

/**
 * Esquemas de credenciales por tipo
 */
export const CredentialSchemas: Record<CredentialType, {
  name: string
  description: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'password' | 'url' | 'number'
    required: boolean
    placeholder?: string
    helpText?: string
  }>
}> = {
  [CredentialType.AZURE_OPENAI]: {
    name: 'Azure OpenAI',
    description: 'Credenciales completas para Azure OpenAI Service (incluye endpoint, deployment, API version y API key)',
    fields: [
      {
        name: 'endpoint',
        label: 'Endpoint',
        type: 'url',
        required: true,
        placeholder: 'https://your-resource.openai.azure.com o https://your-resource.cognitiveservices.azure.com',
        helpText: 'URL base del recurso Azure OpenAI (sin barra final)',
      },
      {
        name: 'deployment',
        label: 'Deployment Name',
        type: 'text',
        required: true,
        placeholder: 'gpt-4, gpt-4.1-pryin, etc.',
        helpText: 'Nombre exacto del deployment en Azure OpenAI',
      },
      {
        name: 'apiVersion',
        label: 'API Version',
        type: 'text',
        required: true,
        placeholder: '2024-12-01-preview',
        helpText: 'Versión de la API de Azure OpenAI',
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Clave API de Azure OpenAI',
      },
    ],
  },
  [CredentialType.OPENAI]: {
    name: 'OpenAI',
    description: 'Credenciales para OpenAI API',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Clave API de OpenAI',
      },
      {
        name: 'organization',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-...',
        helpText: 'ID de organización (opcional)',
      },
    ],
  },
  [CredentialType.ANTHROPIC]: {
    name: 'Anthropic',
    description: 'Credenciales para Anthropic Claude API',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
        helpText: 'Clave API de Anthropic',
      },
    ],
  },
  [CredentialType.GOOGLE_AI]: {
    name: 'Google AI',
    description: 'Credenciales para Google AI (Gemini)',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AIza...',
        helpText: 'Clave API de Google AI',
      },
    ],
  },
  [CredentialType.CUSTOM]: {
    name: 'Custom',
    description: 'Credencial personalizada',
    fields: [
      {
        name: 'key',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: 'Nombre de la clave',
      },
      {
        name: 'value',
        label: 'Value',
        type: 'password',
        required: true,
        placeholder: 'Valor de la credencial',
      },
    ],
  },
}

/**
 * Crea una nueva credencial
 */
export async function createCredential(
  name: string,
  type: CredentialType,
  data: Record<string, any>
): Promise<Credential> {
  // Validar campos requeridos según el esquema
  const schema = CredentialSchemas[type]
  for (const field of schema.fields) {
    if (field.required && !data[field.name]) {
      throw new Error(`Campo requerido faltante: ${field.label}`)
    }
  }

  const credential: Credential = {
    id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usedBy: [],
  }

  // Guardar encriptado (sincronizar con servidor para que Node-RED pueda acceder)
  const key = `${CREDENTIAL_PREFIX}${credential.id}`
  await setEncrypted(key, credential, true)

  console.log(`✅ Credencial creada: ${name} (${credential.id})`)
  return credential
}

/**
 * Obtiene una credencial por ID
 */
export async function getCredential(id: string): Promise<Credential | null> {
  const key = `${CREDENTIAL_PREFIX}${id}`
  const credential = await getEncrypted(key)
  return credential as Credential | null
}

/**
 * Actualiza una credencial existente
 */
export async function updateCredential(
  id: string,
  updates: Partial<Pick<Credential, 'name' | 'data'>>
): Promise<Credential> {
  const existing = await getCredential(id)
  if (!existing) {
    throw new Error(`Credencial no encontrada: ${id}`)
  }

  // Validar campos si se actualiza data
  if (updates.data) {
    const schema = CredentialSchemas[existing.type]
    for (const field of schema.fields) {
      if (field.required && !updates.data[field.name] && !existing.data[field.name]) {
        throw new Error(`Campo requerido faltante: ${field.label}`)
      }
    }
  }

  const updated: Credential = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }

  // Guardar encriptado (sincronizar con servidor)
  const key = `${CREDENTIAL_PREFIX}${id}`
  await setEncrypted(key, updated, true)

  console.log(`✅ Credencial actualizada: ${updated.name} (${id})`)
  return updated
}

/**
 * Elimina una credencial
 */
export async function deleteCredential(id: string): Promise<void> {
  const credential = await getCredential(id)
  if (!credential) {
    throw new Error(`Credencial no encontrada: ${id}`)
  }

  // Verificar si está en uso
  if (credential.usedBy && credential.usedBy.length > 0) {
    throw new Error(
      `No se puede eliminar: la credencial está en uso por ${credential.usedBy.length} nodo(s)`
    )
  }

  const key = `${CREDENTIAL_PREFIX}${id}`
  await removeEncrypted(key)

  console.log(`✅ Credencial eliminada: ${credential.name} (${id})`)
}

/**
 * Lista todas las credenciales
 */
export async function listCredentials(type?: CredentialType): Promise<Credential[]> {
  const allKeys = await listEncryptedKeys()
  const credentialKeys = allKeys.filter(key => key.startsWith(CREDENTIAL_PREFIX))
  
  const credentials: Credential[] = []
  for (const key of credentialKeys) {
    const id = key.replace(CREDENTIAL_PREFIX, '')
    const credential = await getCredential(id)
    if (credential) {
      if (!type || credential.type === type) {
        credentials.push(credential)
      }
    }
  }

  // Ordenar por nombre
  return credentials.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Registra que un nodo está usando una credencial
 */
export async function registerCredentialUsage(
  credentialId: string,
  nodeId: string
): Promise<void> {
  const credential = await getCredential(credentialId)
  if (!credential) {
    throw new Error(`Credencial no encontrada: ${credentialId}`)
  }

  const usedBy = credential.usedBy || []
  if (!usedBy.includes(nodeId)) {
    usedBy.push(nodeId)
  }

  await updateCredential(credentialId, {
    data: credential.data, // Mantener data existente
    name: credential.name, // Mantener name existente
  })

  // Actualizar lastUsedAt
  const updated = await getCredential(credentialId)
  if (updated) {
    updated.lastUsedAt = Date.now()
    updated.usedBy = usedBy
    const key = `${CREDENTIAL_PREFIX}${credentialId}`
    await setEncrypted(key, updated, true)
  }
}

/**
 * Desregistra el uso de una credencial por un nodo
 */
export async function unregisterCredentialUsage(
  credentialId: string,
  nodeId: string
): Promise<void> {
  const credential = await getCredential(credentialId)
  if (!credential) {
    return // No lanzar error si no existe
  }

  const usedBy = (credential.usedBy || []).filter(id => id !== nodeId)

  await updateCredential(credentialId, {
    data: credential.data,
    name: credential.name,
  })

  // Actualizar usedBy
  const updated = await getCredential(credentialId)
  if (updated) {
    updated.usedBy = usedBy
    const key = `${CREDENTIAL_PREFIX}${credentialId}`
    await setEncrypted(key, updated, true)
  }
}

/**
 * Obtiene los datos de una credencial (para usar en un nodo)
 * 
 * ⚠️ ADVERTENCIA: Esto desencripta y retorna los datos sensibles
 */
export async function getCredentialData(id: string): Promise<Record<string, any> | null> {
  const credential = await getCredential(id)
  if (!credential) {
    return null
  }

  // Actualizar lastUsedAt
  credential.lastUsedAt = Date.now()
  const key = `${CREDENTIAL_PREFIX}${id}`
  await setEncrypted(key, credential, true)

  return credential.data
}

/**
 * Busca credenciales por nombre o tipo
 */
export async function searchCredentials(
  query: string,
  type?: CredentialType
): Promise<Credential[]> {
  const all = await listCredentials(type)
  const lowerQuery = query.toLowerCase()
  
  return all.filter(cred => 
    cred.name.toLowerCase().includes(lowerQuery) ||
    cred.type.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Exporta todas las credenciales (para backup)
 */
export async function exportCredentials(): Promise<Credential[]> {
  return await listCredentials()
}

/**
 * Importa credenciales desde un backup
 */
export async function importCredentials(credentials: Credential[]): Promise<void> {
  for (const credential of credentials) {
    // Validar estructura
    if (!credential.id || !credential.name || !credential.type || !credential.data) {
      console.warn('Credencial inválida omitida:', credential)
      continue
    }

    // Guardar (puede sobrescribir si ya existe)
    const key = `${CREDENTIAL_PREFIX}${credential.id}`
    await setEncrypted(key, credential, true)
  }

  console.log(`✅ ${credentials.length} credenciales importadas`)
}

/**
 * Valida una credencial según su tipo
 */
export function validateCredential(
  type: CredentialType,
  data: Record<string, any>
): { valid: boolean; errors: string[] } {
  const schema = CredentialSchemas[type]
  const errors: string[] = []

  for (const field of schema.fields) {
    if (field.required && !data[field.name]) {
      errors.push(`Campo requerido faltante: ${field.label}`)
    }

    // Validaciones adicionales según tipo
    if (field.type === 'url' && data[field.name]) {
      try {
        new URL(data[field.name])
      } catch {
        errors.push(`URL inválida: ${field.label}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

