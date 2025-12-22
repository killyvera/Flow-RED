# Node Inspector Data Contract

## Overview

El Node Inspector ha sido rediseñado para exponer un contrato de datos único y consistente estilo n8n: **Input / Output / Context**. Esta estructura proporciona una experiencia de usuario clara y predecible al inspeccionar nodos en el canvas.

## Estructura de Tabs

El Node Inspector tiene exactamente 4 tabs principales:

1. **Data** - Vista principal de datos (siempre visible)
2. **Execution** - Timeline y metadata de ejecución (siempre visible)
3. **Configuration** - Campos editables del nodo (solo en modo edición)
4. **Advanced** - Información técnica avanzada (colapsado por defecto)

## Tab Data

El tab Data es la vista principal y siempre está disponible. Contiene 3 sub-tabs:

### Input

Muestra los datos de entrada del nodo:

- **Trigger/Webhook nodes**: Muestra datos reales capturados del evento
- **Otros nodos**: Infiere datos desde el nodo upstream en el mismo Execution Frame
- **Badge "Inferred"**: Se muestra cuando los datos son inferidos, junto con el nombre del nodo fuente

**Empty state**: "No input data available"

### Output

Muestra el último output capturado del nodo:

- Siempre muestra el `payloadPreview` más reciente del snapshot
- Indica si está truncado
- Muestra timestamp del último output

**Empty state**: "No output data captured yet"

### Context

Muestra metadata de ejecución:

- **Frame ID**: ID del Execution Frame actual
- **Execution Status**: Estado de runtime (idle/running/success/error)
- **Duration**: Duración de ejecución en milisegundos
- **Node Type**: Tipo del nodo
- **Metadata conocida**: Topic, headers, statusCode (si están presentes)
- **Last Update**: Timestamp de la última actualización

**Empty state**: "No context data available"

## Tab Execution

Muestra información sobre CUÁNDO y CÓMO se ejecutó el nodo:

- **Status Badge**: Estado visual con color
- **Frame Reference**: ID del frame de ejecución
- **Duration**: Duración de ejecución
- **Timeline Visual**: 
  - `[Previous Nodes] → [CURRENT NODE] → [Next Nodes]`
  - El nodo actual está destacado visualmente

## Tab Configuration

Solo visible en modo edición (`isEditMode`).

Contiene:
- Campos dinámicos basados en el schema del nodo
- Tipos de campos: texto, número, boolean, select, JSON, etc.
- Información básica del nodo (ID, posición X/Y) - solo lectura

**NO contiene**:
- Payload/logs
- Runtime state
- Datos de ejecución

## Tab Advanced

Colapsado por defecto. Contiene información técnica para usuarios avanzados:

- **Raw Message (msg)**: JSON completo del mensaje (si está disponible)
- **Debug Logs**: Logs de ejecución filtrados por este nodo
- **Internal IDs**: 
  - React Flow ID
  - Node-RED ID
  - Flow ID (z)
- **Wiring Info**: 
  - Input edges (source → target)
  - Output edges (source → target)
  - Handles (sourceHandle/targetHandle)

## Componente DataViewer

Componente reutilizable para visualizar datos en múltiples formatos:

### Modos de Visualización

1. **Schema**: Muestra la estructura de los datos (keys, types, previews)
2. **Table**: Muestra datos en formato tabla
3. **JSON**: Muestra datos en formato JSON formateado

### Características

- **Empty states**: Mensajes claros cuando no hay datos
- **Badge "Inferred"**: Indica cuando los datos son inferidos
- **Badge "Truncated"**: Indica cuando los datos están truncados
- **Expand/Collapse**: Para payloads largos
- **Source node name**: Muestra de dónde vienen los datos inferidos

## Hooks de Datos

Los siguientes hooks proporcionan datos estructurados:

- `useNodeInputData(nodeId, frameId)`: Obtiene input (real o inferido)
- `useNodeOutputData(nodeId)`: Obtiene último output
- `useNodeContext(nodeId, frameId)`: Obtiene metadata de contexto
- `useExecutionTimeline(nodeId)`: Construye timeline de ejecución

## Reglas de Inferencia

### Input Data

1. Si el nodo es un trigger/webhook:
   - Usar datos reales del snapshot en el frame actual
   - Si no hay frame, usar el snapshot más reciente

2. Si el nodo NO es trigger:
   - Inferir desde el primer nodo upstream conectado
   - Buscar snapshot del upstream en el mismo frame
   - Mostrar badge "Inferred" con nombre del nodo fuente

### Output Data

- Siempre usar el snapshot más reciente con `payloadPreview`
- `payloadPreview` siempre está truncado (100 caracteres)
- Mostrar timestamp del snapshot

## Terminología

### Labels Primarios (User-Friendly)

- "Input data" (no "msg.input")
- "Output data" (no "msg.payload")
- "Context" (no "execution context")

### Jargon de Node-RED (Solo en Tooltips/Advanced)

- `msg`, `payload`, `wires` solo aparecen en:
  - Tooltips
  - Tab Advanced
  - Documentación técnica

## Consideraciones Técnicas

### Performance

- Todos los hooks usan `useMemo` para evitar recálculos innecesarios
- Los datos se calculan solo cuando cambian las dependencias
- Lazy loading de datos pesados (JSON parsing solo cuando se necesita)

### Compatibilidad

- **NO cambia** el runtime de Node-RED
- **NO remueve** datos existentes (solo reorganiza)
- **NO agrega** nueva instrumentación backend
- Trabaja con `payloadPreview` truncado por ahora (puede mejorarse después)

### Estilos

- Usa theme tokens existentes (`bg-primary`, `text-primary`, etc.)
- Mantiene consistencia visual con el resto de la app
- Responsive (el panel es de ancho fijo: 320px)

## Ejemplos de Uso

### Ver Input de un Nodo

1. Seleccionar nodo en el canvas
2. Abrir Node Inspector (doble clic o botón)
3. Tab "Data" → Sub-tab "Input"
4. Ver datos reales (si es trigger) o inferidos (si tiene upstream)

### Ver Output de un Nodo

1. Ejecutar el flow
2. Seleccionar nodo
3. Tab "Data" → Sub-tab "Output"
4. Ver último output capturado

### Ver Timeline de Ejecución

1. Seleccionar nodo
2. Tab "Execution"
3. Ver timeline: `[prev] → [CURRENT] → [next]`

### Editar Configuración

1. Activar modo edición
2. Seleccionar nodo
3. Tab "Configuration"
4. Editar campos según el schema del nodo

## Mejoras Futuras

- Capturar payload completo (no solo preview truncado)
- Múltiples modos de visualización en DataViewer (schema/table/json)
- Mejor inferencia para múltiples inputs
- Historial de outputs (no solo el último)
- Filtros y búsqueda en logs avanzados

