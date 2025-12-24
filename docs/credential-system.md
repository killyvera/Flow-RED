# Sistema de Credenciales Centralizado (similar a n8n)

Sistema completo de gestión de credenciales encriptadas, similar a n8n, que permite crear, editar y reutilizar credenciales en múltiples nodos.

## Características

- ✅ **Credenciales Reutilizables**: Crea una credencial una vez, úsala en múltiples nodos
- ✅ **Encriptación AES-GCM**: Todas las credenciales están encriptadas
- ✅ **Tipos de Credenciales**: Azure OpenAI, OpenAI, Anthropic, Google AI, Custom
- ✅ **Gestión Centralizada**: UI para crear, editar, eliminar credenciales
- ✅ **Seguimiento de Uso**: Ve qué nodos usan cada credencial
- ✅ **Validación**: Validación automática según el tipo de credencial
- ✅ **Backup/Export**: Exporta e importa credenciales

## Arquitectura

```
┌─────────────────────┐
│  CredentialManager  │  ← UI de gestión
│  (Componente React)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  credentialManager   │  ← Lógica de negocio
│  (Utils)             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  encryptedStorage    │  ← Encriptación
│  (AES-GCM)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  IndexedDB + JSON   │  ← Persistencia
│  (.node-red)        │
└─────────────────────┘
```

## Uso Básico

### 1. Abrir Gestor de Credenciales

```typescript
import { CredentialManager } from '@/components/credentials/CredentialManager'

function MyComponent() {
  const [showManager, setShowManager] = useState(false)

  return (
    <>
      <button onClick={() => setShowManager(true)}>
        Gestionar Credenciales
      </button>
      <CredentialManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
      />
    </>
  )
}
```

### 2. Usar Selector de Credenciales en un Nodo

```typescript
import { CredentialSelector } from '@/components/credentials/CredentialSelector'
import { CredentialType } from '@/utils/credentialManager'

function ConnectionTab({ nodeId, nodeData, onNodeDataChange }) {
  const [credentialId, setCredentialId] = useState(nodeData.credentialId)
  const [credentialData, setCredentialData] = useState(null)

  const handleCredentialSelect = (id, data) => {
    setCredentialId(id)
    setCredentialData(data)
    
    // Actualizar nodeData con la referencia a la credencial
    onNodeDataChange({
      ...nodeData,
      credentialId: id,
      // También actualizar campos visibles desde la credencial
      endpoint: data?.endpoint,
      apiVersion: data?.apiVersion,
    })
  }

  return (
    <div>
      <CredentialSelector
        nodeId={nodeId}
        credentialType={CredentialType.AZURE_OPENAI}
        selectedCredentialId={credentialId}
        onSelect={handleCredentialSelect}
      />
      
      {/* Mostrar campos desde la credencial seleccionada */}
      {credentialData && (
        <div>
          <p>Endpoint: {credentialData.endpoint}</p>
          <p>API Version: {credentialData.apiVersion}</p>
        </div>
      )}
    </div>
  )
}
```

### 3. Obtener Datos de una Credencial Programáticamente

```typescript
import { getCredentialData } from '@/utils/credentialManager'

// Obtener datos de una credencial por ID
const data = await getCredentialData('cred-1234567890-abc')
if (data) {
  console.log('API Key:', data.apiKey)
  console.log('Endpoint:', data.endpoint)
}
```

## Tipos de Credenciales

### Azure OpenAI

```typescript
{
  endpoint: 'https://your-resource.openai.azure.com',
  apiKey: 'sk-...',
  apiVersion: '2024-02-15-preview' // Opcional
}
```

### OpenAI

```typescript
{
  apiKey: 'sk-...',
  organization: 'org-...' // Opcional
}
```

### Anthropic

```typescript
{
  apiKey: 'sk-ant-...'
}
```

### Google AI

```typescript
{
  apiKey: 'AIza...'
}
```

### Custom

```typescript
{
  key: 'nombre-campo',
  value: 'valor-encriptado'
}
```

## Integración Completa con Nodos

### Ejemplo: Azure OpenAI Model Node

```typescript
import { useState, useEffect } from 'react'
import { CredentialSelector } from '@/components/credentials/CredentialSelector'
import { CredentialType, getCredentialData } from '@/utils/credentialManager'

export function ConnectionTab({ nodeId, nodeData, onNodeDataChange }) {
  const [credentialId, setCredentialId] = useState(nodeData.credentialId)
  const [endpoint, setEndpoint] = useState(nodeData.endpoint || '')
  const [deployment, setDeployment] = useState(nodeData.deployment || '')
  const [apiVersion, setApiVersion] = useState(nodeData.apiVersion || '2024-02-15-preview')

  // Cargar datos de la credencial si existe
  useEffect(() => {
    if (credentialId) {
      getCredentialData(credentialId).then(data => {
        if (data) {
          setEndpoint(data.endpoint || '')
          setApiVersion(data.apiVersion || '2024-02-15-preview')
        }
      })
    }
  }, [credentialId])

  const handleCredentialSelect = (id, data) => {
    setCredentialId(id)
    
    // Actualizar campos desde la credencial
    if (data) {
      setEndpoint(data.endpoint || '')
      setApiVersion(data.apiVersion || '2024-02-15-preview')
    }
    
    // Actualizar nodeData
    onNodeDataChange({
      ...nodeData,
      credentialId: id,
      endpoint: data?.endpoint || endpoint,
      apiVersion: data?.apiVersion || apiVersion,
    })
  }

  return (
    <div className="space-y-4">
      {/* Selector de credencial */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Credencial
        </label>
        <CredentialSelector
          nodeId={nodeId}
          credentialType={CredentialType.AZURE_OPENAI}
          selectedCredentialId={credentialId}
          onSelect={handleCredentialSelect}
        />
      </div>

      {/* Campos editables (pueden sobrescribir valores de la credencial) */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Endpoint
        </label>
        <input
          type="url"
          value={endpoint}
          onChange={(e) => {
            setEndpoint(e.target.value)
            onNodeDataChange({ ...nodeData, endpoint: e.target.value })
          }}
          placeholder="https://your-resource.openai.azure.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Deployment
        </label>
        <input
          type="text"
          value={deployment}
          onChange={(e) => {
            setDeployment(e.target.value)
            onNodeDataChange({ ...nodeData, deployment: e.target.value })
          }}
          placeholder="gpt-4"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          API Version
        </label>
        <input
          type="text"
          value={apiVersion}
          onChange={(e) => {
            setApiVersion(e.target.value)
            onNodeDataChange({ ...nodeData, apiVersion: e.target.value })
          }}
          placeholder="2024-02-15-preview"
        />
      </div>
    </div>
  )
}
```

## API del Sistema

### Crear Credencial

```typescript
import { createCredential, CredentialType } from '@/utils/credentialManager'

const credential = await createCredential(
  'Mi Azure OpenAI',
  CredentialType.AZURE_OPENAI,
  {
    endpoint: 'https://my-resource.openai.azure.com',
    apiKey: 'sk-...',
    apiVersion: '2024-02-15-preview'
  }
)
```

### Listar Credenciales

```typescript
import { listCredentials, CredentialType } from '@/utils/credentialManager'

// Todas las credenciales
const all = await listCredentials()

// Solo Azure OpenAI
const azure = await listCredentials(CredentialType.AZURE_OPENAI)
```

### Actualizar Credencial

```typescript
import { updateCredential } from '@/utils/credentialManager'

await updateCredential('cred-123', {
  name: 'Nuevo nombre',
  data: {
    endpoint: 'https://new-endpoint.openai.azure.com',
    apiKey: 'sk-new...'
  }
})
```

### Eliminar Credencial

```typescript
import { deleteCredential } from '@/utils/credentialManager'

await deleteCredential('cred-123')
// Lanza error si la credencial está en uso
```

### Buscar Credenciales

```typescript
import { searchCredentials } from '@/utils/credentialManager'

const results = await searchCredentials('azure', CredentialType.AZURE_OPENAI)
```

### Exportar/Importar

```typescript
import { exportCredentials, importCredentials } from '@/utils/credentialManager'

// Exportar
const backup = await exportCredentials()
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
// ... descargar blob

// Importar
const file = // ... leer archivo
const data = JSON.parse(file)
await importCredentials(data)
```

## Flujo de Trabajo

### 1. Crear Credencial

1. Abrir Gestor de Credenciales
2. Click en "Nueva Credencial"
3. Seleccionar tipo (ej: Azure OpenAI)
4. Ingresar nombre y datos
5. Guardar

### 2. Usar en Nodo

1. En el nodo, usar `CredentialSelector`
2. Seleccionar credencial del dropdown
3. Los datos se cargan automáticamente
4. El nodo queda vinculado a la credencial

### 3. Editar Credencial

1. Abrir Gestor de Credenciales
2. Seleccionar credencial
3. Click en "Editar"
4. Modificar datos
5. Guardar (todos los nodos que la usan se actualizan)

### 4. Eliminar Credencial

1. Abrir Gestor de Credenciales
2. Seleccionar credencial
3. Click en "Eliminar"
4. Si está en uso, se muestra error
5. Primero desvincular de todos los nodos

## Ventajas sobre Sistema Anterior

| Característica | Sistema Anterior | Nuevo Sistema (n8n-style) |
|---------------|------------------|---------------------------|
| Reutilización | ❌ Cada nodo tiene su propia credencial | ✅ Una credencial, múltiples nodos |
| Gestión | ❌ Editar en cada nodo | ✅ Gestión centralizada |
| Seguridad | ✅ Encriptado | ✅ Encriptado + mejor organización |
| Validación | ⚠️ Manual | ✅ Automática por tipo |
| Tracking | ❌ No se sabe qué nodos usan qué | ✅ Seguimiento de uso |
| Backup | ⚠️ Manual | ✅ Export/Import integrado |

## Mejores Prácticas

1. **Nombres Descriptivos**: Usa nombres claros como "Azure OpenAI - Producción"
2. **Una Credencial por Entorno**: Separa credenciales de desarrollo, staging, producción
3. **No Compartir**: Cada usuario tiene sus propias credenciales encriptadas
4. **Backup Regular**: Exporta credenciales regularmente
5. **Validar Antes de Usar**: El sistema valida automáticamente, pero verifica manualmente si es crítico

## Seguridad

- ✅ Todas las credenciales están encriptadas con AES-GCM
- ✅ Clave maestra controlada por el usuario
- ✅ Los datos nunca se muestran en texto plano
- ✅ Validación de campos requeridos
- ✅ No se puede eliminar credencial en uso

## Próximos Pasos

- [ ] Integrar con ConnectionTab de Azure OpenAI
- [ ] Agregar más tipos de credenciales (AWS, GCP, etc.)
- [ ] Sincronización con servidor (opcional)
- [ ] Historial de cambios en credenciales
- [ ] Rotación automática de credenciales

