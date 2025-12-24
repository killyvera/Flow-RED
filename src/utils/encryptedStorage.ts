/**
 * Sistema de almacenamiento encriptado para datos sensibles
 * 
 * Usa Web Crypto API (nativo del navegador) para encriptar/desencriptar datos.
 * Ideal para API keys, credenciales, configuraciones sensibles, etc.
 * 
 * La clave de encriptación se deriva de una clave maestra que puede ser:
 * - Una clave del usuario (recomendado)
 * - Una clave derivada del entorno (menos seguro)
 * 
 * Los datos encriptados se almacenan usando el sistema de almacenamiento persistente.
 */

import { set, get, removeLocal, listLocalKeys } from './persistentStorage'

// Prefijo para identificar datos encriptados
const ENCRYPTED_PREFIX = 'encrypted:'

// Algoritmo de encriptación (AES-GCM es seguro y eficiente)
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits para GCM
const TAG_LENGTH = 128 // 128 bits para el tag de autenticación

/**
 * Deriva una clave de encriptación desde una clave maestra
 * Usa PBKDF2 para derivar una clave segura
 */
async function deriveKey(
  masterKey: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convertir la clave maestra a ArrayBuffer
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derivar la clave usando PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // Número de iteraciones (ajustable según necesidades de seguridad)
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // No exportable
    ['encrypt', 'decrypt']
  )
}

/**
 * Establece una clave maestra del usuario
 * 
 * IMPORTANTE: Si cambias la clave, todos los datos encriptados anteriores
 * no podrán ser desencriptados. Asegúrate de hacer backup primero.
 */
export function setMasterKey(key: string): void {
  localStorage.setItem('redflow-master-key', key)
}

/**
 * Obtiene la clave maestra actual (si existe)
 * 
 * Si no existe, genera una automáticamente (solo para desarrollo).
 * En producción, el usuario debe establecer una clave explícitamente.
 */
export function getMasterKey(): string | null {
  const userKey = localStorage.getItem('redflow-master-key')
  if (userKey) {
    return userKey
  }

  // Si no hay clave del usuario, generar una automáticamente (solo para desarrollo)
  // En producción, esto debería requerir que el usuario establezca una clave
  const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Guardar para uso futuro
  localStorage.setItem('redflow-master-key', randomKey)
  return randomKey
}

/**
 * Encripta un valor usando AES-GCM
 */
async function encryptValue(value: string, masterKey: string): Promise<string> {
  // Generar salt aleatorio
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Generar IV aleatorio
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  // Derivar la clave
  const key = await deriveKey(masterKey, salt)
  
  // Encriptar el valor
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    new TextEncoder().encode(value)
  )
  
  // Combinar salt + iv + datos encriptados en un solo array
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)
  
  // Convertir a base64 para almacenamiento
  return btoa(String.fromCharCode(...combined))
}

/**
 * Desencripta un valor usando AES-GCM
 */
async function decryptValue(encryptedValue: string, masterKey: string): Promise<string> {
  // Convertir de base64
  const combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0))
  
  // Extraer salt, IV y datos encriptados
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 16 + IV_LENGTH)
  const encrypted = combined.slice(16 + IV_LENGTH)
  
  // Derivar la clave
  const key = await deriveKey(masterKey, salt)
  
  // Desencriptar
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encrypted
  )
  
  // Convertir a string
  return new TextDecoder().decode(decrypted)
}

/**
 * Guarda un valor encriptado
 * 
 * @param key Clave para identificar el valor
 * @param value Valor a encriptar y guardar
 * @param sync Si true, sincroniza con el servidor (por defecto: false para datos sensibles)
 */
export async function setEncrypted(
  key: string,
  value: any,
  sync: boolean = false
): Promise<void> {
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('No se ha establecido una clave maestra. Usa setMasterKey() primero.')
  }

  // Convertir el valor a JSON string
  const jsonValue = JSON.stringify(value)
  
  // Encriptar
  const encrypted = await encryptValue(jsonValue, masterKey)
  
  // Guardar con prefijo para identificar que está encriptado
  const storageKey = `${ENCRYPTED_PREFIX}${key}`
  await set(storageKey, encrypted, sync)
}

/**
 * Obtiene y desencripta un valor
 * 
 * @param key Clave del valor a obtener
 * @returns Valor desencriptado o null si no existe
 */
export async function getEncrypted(key: string): Promise<any | null> {
  const masterKey = getMasterKey()
  if (!masterKey) {
    throw new Error('No se ha establecido una clave maestra. Usa setMasterKey() primero.')
  }

  const storageKey = `${ENCRYPTED_PREFIX}${key}`
  const encrypted = await get(storageKey)
  
  if (!encrypted) {
    return null
  }
  
  try {
    // Desencriptar
    const decrypted = await decryptValue(encrypted, masterKey)
    
    // Parsear JSON
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Error al desencriptar:', error)
    throw new Error('No se pudo desencriptar el valor. La clave puede ser incorrecta.')
  }
}

/**
 * Elimina un valor encriptado
 */
export async function removeEncrypted(key: string): Promise<void> {
  const storageKey = `${ENCRYPTED_PREFIX}${key}`
  await removeLocal(storageKey)
}

/**
 * Lista todas las claves encriptadas
 */
export async function listEncryptedKeys(): Promise<string[]> {
  const allKeys = await listLocalKeys()
  return allKeys
    .filter(key => key.startsWith(ENCRYPTED_PREFIX))
    .map(key => key.replace(ENCRYPTED_PREFIX, ''))
}

/**
 * Verifica si una clave está encriptada
 */
export function isEncrypted(key: string): boolean {
  return key.startsWith(ENCRYPTED_PREFIX)
}

/**
 * Migra datos no encriptados a encriptados
 * 
 * Útil para migrar datos existentes a formato encriptado
 */
export async function migrateToEncrypted(
  key: string,
  sync: boolean = false
): Promise<void> {
  // Obtener el valor no encriptado
  const value = await get(key)
  
  if (value === null) {
    throw new Error(`No se encontró un valor para la clave: ${key}`)
  }
  
  // Guardar encriptado
  await setEncrypted(key, value, sync)
  
  // Eliminar el valor no encriptado
  await removeLocal(key)
  
  console.log(`✅ Migrado a formato encriptado: ${key}`)
}

