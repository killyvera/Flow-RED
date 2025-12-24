# Sistema de Almacenamiento Encriptado

Sistema seguro para almacenar datos sensibles como API keys, credenciales, y configuraciones de nodos IA.

## Características de Seguridad

- ✅ **Encriptación AES-GCM**: Algoritmo seguro y autenticado
- ✅ **Derivación de clave PBKDF2**: 100,000 iteraciones con SHA-256
- ✅ **Salt aleatorio**: Cada encriptación usa un salt único
- ✅ **IV aleatorio**: Vector de inicialización único por encriptación
- ✅ **Clave maestra del usuario**: El usuario controla la clave de encriptación

## Arquitectura

```
┌─────────────────┐
│   Usuario       │
│  (Clave Maestra)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Web Crypto API │
│  (AES-GCM)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IndexedDB +    │
│  JSON (.node-red)│
│  (Datos Encriptados)│
└─────────────────┘
```

## Uso Básico

### 1. Establecer Clave Maestra

**IMPORTANTE**: Debes establecer una clave maestra antes de usar el sistema.

```typescript
import { setMasterKey } from '@/utils/encryptedStorage'

// Establecer clave maestra (hacerlo una vez al inicio)
setMasterKey('mi-clave-segura-super-secreta-123')
```

**Recomendación**: Genera una clave fuerte y guárdala de forma segura. Si la pierdes, no podrás desencriptar los datos.

### 2. Guardar API Keys

```typescript
import { saveApiKey, getApiKey } from '@/utils/credentialStorage'

// Guardar API key de Azure OpenAI
await saveApiKey('azure-openai', 'sk-...')

// Obtener API key
const apiKey = await getApiKey('azure-openai')
if (apiKey) {
  console.log('API key encontrada')
}
```

### 3. Guardar Credenciales de Nodos

```typescript
import { 
  saveNodeCredentials, 
  getNodeCredentials 
} from '@/utils/credentialStorage'

// Guardar credenciales de un nodo
await saveNodeCredentials('node-123', {
  apiKey: 'sk-...',
  token: 'abc123'
})

// Obtener credenciales
const credentials = await getNodeCredentials('node-123')
if (credentials) {
  console.log('API Key:', credentials.apiKey)
}
```

### 4. Guardar Configuración Completa de Nodo IA

```typescript
import { saveNodeConfig, getNodeConfig } from '@/utils/credentialStorage'

// Guardar configuración completa (config + credenciales)
await saveNodeConfig(
  'azure-openai-model-1',
  {
    endpoint: 'https://...',
    deployment: 'gpt-4',
    apiVersion: '2024-02-15-preview'
  },
  {
    apiKey: 'sk-...'
  }
)

// Obtener configuración completa
const nodeData = await getNodeConfig('azure-openai-model-1')
if (nodeData) {
  console.log('Config:', nodeData.config)
  console.log('Credentials:', nodeData.credentials)
}
```

## Integración con Componentes

### Ejemplo: ConnectionTab para Azure OpenAI

```typescript
import { saveNodeConfig, getNodeConfig } from '@/utils/credentialStorage'

export function ConnectionTab({ nodeId, nodeData, onNodeDataChange }) {
  // Cargar configuración al montar
  useEffect(() => {
    if (nodeId) {
      getNodeConfig(nodeId).then(data => {
        if (data) {
          // Restaurar configuración
          setEndpoint(data.config.endpoint)
          setDeployment(data.config.deployment)
          setApiKey(data.credentials.apiKey)
        }
      })
    }
  }, [nodeId])

  const handleSave = async () => {
    // Guardar configuración encriptada
    await saveNodeConfig(
      nodeId,
      {
        endpoint,
        deployment,
        apiVersion
      },
      {
        apiKey
      }
    )
    
    // También actualizar nodeData para el flow
    onNodeDataChange({
      ...nodeData,
      endpoint,
      deployment,
      apiVersion
      // NO incluir apiKey aquí - está encriptado por separado
    })
  }
}
```

## Backup y Restauración

### Exportar Credenciales

```typescript
import { exportCredentials } from '@/utils/credentialStorage'

// Exportar todas las credenciales (para backup)
const backup = await exportCredentials()

// Guardar en un archivo (el usuario debe descargarlo)
const blob = new Blob([JSON.stringify(backup, null, 2)], { 
  type: 'application/json' 
})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `credentials-backup-${Date.now()}.json`
a.click()
```

### Importar Credenciales

```typescript
import { importCredentials } from '@/utils/credentialStorage'

// Leer archivo de backup
const fileInput = document.createElement('input')
fileInput.type = 'file'
fileInput.accept = 'application/json'
fileInput.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const text = await file.text()
    const data = JSON.parse(text)
    await importCredentials(data)
    console.log('✅ Credenciales importadas')
  }
}
fileInput.click()
```

## Gestión de Clave Maestra

### Verificar si hay clave maestra

```typescript
import { getMasterKey } from '@/utils/encryptedStorage'

const masterKey = getMasterKey()
if (!masterKey) {
  // Pedir al usuario que establezca una clave
  const userKey = prompt('Ingresa tu clave maestra:')
  setMasterKey(userKey)
}
```

### Cambiar Clave Maestra

**⚠️ ADVERTENCIA**: Si cambias la clave maestra, todos los datos encriptados anteriores no podrán ser desencriptados.

```typescript
// 1. Exportar todas las credenciales primero
const backup = await exportCredentials()

// 2. Establecer nueva clave
setMasterKey('nueva-clave-segura')

// 3. Importar credenciales (se encriptarán con la nueva clave)
await importCredentials(backup)
```

## Migración desde Sistema Actual

Si ya tienes credenciales en `localStorage` o en el sistema de credenciales pendientes:

```typescript
import { 
  getPendingNodeCredentials,
  saveNodeCredentials 
} from '@/utils/credentialStorage'
import { getPendingNodeCredentials as getPending } from '@/api/client'

// Migrar credenciales pendientes a formato encriptado
const pending = getPending()
for (const [nodeId, credentials] of Object.entries(pending)) {
  await saveNodeCredentials(nodeId, credentials)
  console.log(`✅ Migrado: ${nodeId}`)
}
```

## Seguridad

### Mejores Prácticas

1. **Clave Maestra Fuerte**: Usa una clave de al menos 32 caracteres
2. **No Compartir Clave**: Nunca compartas tu clave maestra
3. **Backup Regular**: Exporta credenciales regularmente
4. **No Loggear**: Nunca loguees credenciales en consola
5. **HTTPS**: Asegúrate de usar HTTPS en producción

### Limitaciones

- **Clave Maestra en localStorage**: La clave maestra se guarda en localStorage (no encriptada)
  - **Mitigación**: Considera usar un sistema de autenticación más robusto en producción
- **Sin Sincronización Automática**: Los datos encriptados no se sincronizan automáticamente con el servidor
  - **Mitigación**: Usa `sync: true` solo si el servidor también encripta los datos

## Comparación con Node-RED Credentials

| Característica | Sistema Encriptado | Node-RED Credentials |
|---------------|-------------------|---------------------|
| Encriptación | AES-GCM (cliente) | AES (servidor) |
| Acceso | Cliente + Servidor | Solo Servidor |
| Clave | Control del usuario | Node-RED gestiona |
| Backup | Exportación manual | Archivo credentials.json |
| Uso | API keys, configs | Credenciales de nodos |

**Recomendación**: Usa el sistema encriptado para datos del cliente (preferencias, API keys de usuario) y Node-RED credentials para credenciales que Node-RED necesita en runtime.

