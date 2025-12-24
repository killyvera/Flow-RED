# Sistema de Almacenamiento Persistente

Sistema híbrido de almacenamiento que combina IndexedDB (cliente) con archivo JSON en `.node-red` (servidor).

## Arquitectura

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
│                 │
│  IndexedDB      │◄─── Caché local (rápido, offline)
│  (localStorage) │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│   Node-RED      │
│   (Backend)     │
│                 │
│  redflow-       │
│  persistent-    │
│  storage.json   │◄─── Persistencia en servidor
└─────────────────┘
```

## Características

### ✅ Ventajas

1. **Acceso rápido**: IndexedDB para operaciones locales instantáneas
2. **Offline-first**: Funciona sin conexión al servidor
3. **Sincronización**: Datos disponibles desde Node-RED
4. **Persistencia**: Datos sobreviven reinicios del navegador
5. **Escalable**: IndexedDB soporta grandes volúmenes de datos

### 📊 Comparación con otras opciones

| Característica | IndexedDB + JSON | SQLite (WebAssembly) | Solo localStorage |
|---------------|------------------|----------------------|------------------|
| Capacidad | ~50MB+ | ~50MB+ | ~5-10MB |
| Queries SQL | ❌ | ✅ | ❌ |
| Offline | ✅ | ✅ | ✅ |
| Acceso servidor | ✅ | ❌ | ❌ |
| Complejidad | Media | Alta | Baja |
| Tamaño bundle | 0KB | ~1-2MB | 0KB |

## Uso

### En el Frontend

```typescript
import { set, get, removeLocal, listLocalKeys } from '@/utils/persistentStorage'

// Guardar un valor (local + servidor)
await set('user-preferences', { theme: 'dark', language: 'es' })

// Obtener un valor (intenta servidor, luego local)
const preferences = await get('user-preferences')

// Solo local (más rápido, no sincroniza)
await setLocal('temp-data', { ... })
const temp = await getLocal('temp-data')

// Eliminar
await removeLocal('user-preferences')

// Listar todas las claves
const keys = await listLocalKeys()
```

### Sincronización

```typescript
import { syncToServer, syncFromServer } from '@/utils/persistentStorage'

// Sincronizar datos locales → servidor
await syncToServer()

// Cargar datos del servidor → local
await syncFromServer()
```

### Endpoints del Servidor

El plugin expone estos endpoints en Node-RED:

- `GET /redflow/persistent-storage` - Obtiene todos los datos
- `GET /redflow/persistent-storage/:key` - Obtiene un valor específico
- `POST /redflow/persistent-storage` - Guarda/actualiza datos
- `DELETE /redflow/persistent-storage/:key` - Elimina un valor

### Archivo en `.node-red`

Los datos se guardan en:
```
~/.node-red/redflow-persistent-storage.json
```

Formato:
```json
{
  "user-preferences": {
    "theme": "dark",
    "language": "es"
  },
  "custom-config": {
    "key": "value"
  }
}
```

## Casos de Uso

### 1. Preferencias de Usuario

```typescript
// Guardar preferencias
await set('user-preferences', {
  theme: 'dark',
  sidebarCollapsed: true,
  autoSave: true
})

// Cargar al iniciar
const prefs = await get('user-preferences')
if (prefs) {
  applyUserPreferences(prefs)
}
```

### 2. Cache de Datos

```typescript
// Cachear resultados de API
const cacheKey = `api-cache-${endpoint}`
const cached = await getLocal(cacheKey)
if (cached && Date.now() - cached.timestamp < 3600000) {
  return cached.data
}

// Guardar en cache
await setLocal(cacheKey, { data: result, timestamp: Date.now() })
```

### 3. Estado de UI

```typescript
// Guardar estado del editor
await set('editor-state', {
  selectedNodes: [...],
  viewport: { x: 100, y: 200, zoom: 1.5 }
})

// Restaurar al recargar
const state = await get('editor-state')
if (state) {
  restoreEditorState(state)
}
```

## Instalación

El plugin se carga automáticamente si está en `settings.redflow.cjs`:

```javascript
nodesDir: [
    // ...
    path.join(__dirname, 'plugins', 'redflow-persistent-storage')
]
```

## Migración desde localStorage

Si ya usas `localStorage` directamente:

```typescript
// Antes
localStorage.setItem('key', JSON.stringify(value))
const value = JSON.parse(localStorage.getItem('key') || 'null')

// Después
await set('key', value)
const value = await get('key')
```

## Limitaciones

1. **Sincronización manual**: No hay sincronización automática en tiempo real
2. **Sin conflictos**: No maneja conflictos de escritura simultánea
3. **Tamaño**: IndexedDB tiene límites por dominio (~50MB+)

## Mejoras Futuras

- [ ] Sincronización automática en background
- [ ] Resolución de conflictos
- [ ] Compresión de datos
- [ ] Encriptación opcional
- [ ] Versionado de datos

