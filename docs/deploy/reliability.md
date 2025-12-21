# Deploy Reliability Documentation

Este documento describe el sistema de confiabilidad implementado para el guardado y deploy de flows en Flow-RED, incluyendo el manejo de conflictos, autosave de drafts, y recuperación de datos.

## Tabla de Contenidos

1. [Sistema de Dirty State](#sistema-de-dirty-state)
2. [Manejo de Conflictos](#manejo-de-conflictos)
3. [Autosave de Drafts](#autosave-de-drafts)
4. [Recuperación de Datos](#recuperación-de-datos)
5. [Flujos de Usuario](#flujos-de-usuario)

## Sistema de Dirty State

El sistema de dirty state rastrea todos los cambios realizados en un flow para determinar si hay cambios no guardados.

### Cambios Rastreados

El sistema detecta cambios en:

- **Posición de nodos**: Cuando un nodo se mueve en el canvas
- **Conexiones**: Cuando se crean, modifican o eliminan edges entre nodos
- **Propiedades de nodos**: Cuando se editan propiedades en el inspector (NodePropertiesPanel)
- **Propiedades de grupos**: Cuando se editan propiedades de grupos (GroupPropertiesPanel)
- **Estructura**: Cuando se agregan o eliminan nodos/grupos

### Indicadores Visuales

- **Toolbar**: Muestra un indicador "Sin guardar" cuando hay cambios no guardados
- **Flow Tab**: Muestra un indicador visual en la pestaña del flow (si está implementado)
- **Confirmación al cambiar de flow**: Se solicita confirmación antes de cambiar de flow si hay cambios sin guardar

### Implementación Técnica

El sistema utiliza `dirtyState.ts` que compara el estado actual del flow con un snapshot del último estado guardado. La comparación es profunda y eficiente, usando mapas para comparación rápida.

```typescript
// Crear snapshot del estado guardado
const snapshot = createFlowSnapshot(nodes, edges, nodeRedNodes)

// Verificar si hay cambios
const isDirty = hasUnsavedChanges(currentNodes, currentEdges, snapshot)
```

## Manejo de Conflictos

Cuando se intenta guardar un flow y hay un conflicto de versión (HTTP 409) o un mismatch de `rev`, se muestra un modal con opciones para resolver el conflicto.

### Tipos de Conflictos

1. **HTTP 409 (Version Conflict)**: El flow fue modificado por otro usuario o en otra sesión
2. **Rev Mismatch**: La versión del flow en el servidor ha cambiado desde la última carga

### Opciones de Resolución

El modal de conflictos ofrece tres opciones:

#### 1. Recargar desde el servidor

- **Acción**: Descarta los cambios locales y carga la versión más reciente del servidor
- **Cuándo usar**: Cuando los cambios locales no son importantes o cuando quieres ver los cambios del servidor primero
- **Resultado**: Se pierden los cambios locales no guardados

#### 2. Exportar backup local

- **Acción**: Descarga los cambios locales como un archivo JSON antes de recargar
- **Cuándo usar**: Cuando quieres preservar tus cambios locales antes de recargar
- **Resultado**: Se descarga un archivo `flow-backup-{timestamp}.json` con el flow completo

#### 3. Forzar sobrescritura

- **Acción**: Sobrescribe la versión del servidor con los cambios locales (sin `rev`)
- **Cuándo usar**: Solo cuando estás seguro de que quieres reemplazar la versión del servidor
- **Advertencia**: Esta acción puede sobrescribir cambios de otros usuarios
- **Resultado**: El flow se guarda forzando la sobrescritura

### Flujo de Manejo de Conflictos

```
Usuario intenta guardar
    ↓
saveFlow() detecta HTTP 409 o rev mismatch
    ↓
Se muestra DeployConflictModal
    ↓
Usuario elige:
    ├─ Recargar → loadFlows() + renderFlow()
    ├─ Exportar → Descarga JSON
    └─ Forzar → saveFlow() sin rev
```

## Autosave de Drafts

El sistema guarda automáticamente drafts de los flows cada 30 segundos si hay cambios no guardados.

### Almacenamiento

- **Primario**: IndexedDB (preferido para mayor capacidad y mejor rendimiento)
- **Fallback**: localStorage (si IndexedDB no está disponible)

### Estructura de Datos

Cada draft contiene:

```typescript
interface DraftData {
  flowId: string
  nodes: Node[]
  edges: Edge[]
  nodeRedNodes: NodeRedNode[]
  timestamp: number
}
```

### Frecuencia de Autosave

- **Intervalo**: 30 segundos
- **Condiciones**: Solo se guarda si:
  - Hay un `activeFlowId`
  - El modo de edición está activo
  - Hay cambios no guardados (`isDirty === true`)

### Limpieza de Drafts

Los drafts se eliminan automáticamente cuando:
- El flow se guarda exitosamente
- El usuario descarta el draft al cargar el flow
- El usuario cierra el modal de restauración sin restaurar

## Recuperación de Datos

### Detección de Drafts

Al cargar un flow, el sistema verifica si existe un draft guardado:

1. Se busca un draft para el `flowId` activo
2. Si se encuentra, se muestra el modal `DraftRestoreModal`
3. El usuario puede elegir restaurar o descartar el draft

### Restauración de Drafts

Si el usuario elige restaurar:

1. Se cargan los nodos y edges del draft
2. Se actualiza el estado del canvas
3. Se actualiza `nodeRedNodes` en el store
4. Se crea un nuevo snapshot del estado guardado
5. El draft se mantiene hasta que se guarde exitosamente

### Descarte de Drafts

Si el usuario elige descartar:

1. Se elimina el draft del almacenamiento
2. Se carga el flow desde el servidor
3. Se crea un snapshot del estado cargado

### Flujo de Recuperación

```
Cargar flow
    ↓
Verificar draft en IndexedDB/localStorage
    ↓
¿Draft encontrado?
    ├─ Sí → Mostrar DraftRestoreModal
    │   ├─ Restaurar → Cargar draft en canvas
    │   └─ Descartar → Eliminar draft + cargar desde servidor
    └─ No → Cargar desde servidor normalmente
```

## Flujos de Usuario

### Flujo Normal de Guardado

```
1. Usuario hace cambios en el flow
2. Indicador "Sin guardar" aparece en toolbar
3. Autosave guarda draft cada 30s
4. Usuario hace clic en "Save & Deploy"
5. Sistema valida el flow
6. Sistema obtiene `rev` actual
7. Sistema envía flow a Node-RED
8. Si éxito:
   - Se actualiza estado guardado
   - Se elimina draft
   - Indicador "Sin guardar" desaparece
   - Se muestra mensaje de éxito
```

### Flujo con Conflicto

```
1. Usuario intenta guardar
2. Node-RED responde con HTTP 409
3. Se muestra DeployConflictModal
4. Usuario elige opción:
   ├─ Recargar: Se pierden cambios locales, se carga versión del servidor
   ├─ Exportar: Se descarga backup, luego se puede recargar
   └─ Forzar: Se sobrescribe servidor (puede perder cambios de otros)
```

### Flujo de Recuperación de Draft

```
1. Usuario recarga la página o cambia de flow
2. Sistema detecta draft guardado
3. Se muestra DraftRestoreModal con timestamp
4. Usuario elige:
   ├─ Restaurar: Se cargan nodos/edges del draft
   └─ Descartar: Se elimina draft, se carga desde servidor
```

## Consideraciones de Seguridad

### No Pérdida Silenciosa de Datos

- Todos los cambios se rastrean y se muestran indicadores visuales
- Se solicita confirmación antes de descartar cambios
- Los drafts se guardan automáticamente para recuperación

### Prevención de Sobrescritura Accidental

- El modal de conflictos advierte sobre sobrescritura
- La opción "Forzar sobrescritura" requiere confirmación explícita
- Se recomienda siempre exportar backup antes de forzar

### Privacidad de Datos

- Los drafts se almacenan localmente (IndexedDB/localStorage)
- No se envían datos al servidor sin acción explícita del usuario
- Los backups exportados son archivos JSON locales

## Mejoras Futuras

- [ ] Indicador de dirty state en las pestañas de flows
- [ ] Historial de drafts (múltiples versiones)
- [ ] Comparación visual entre draft y versión del servidor
- [ ] Sincronización automática cuando no hay conflictos
- [ ] Notificaciones cuando otros usuarios modifican el flow

