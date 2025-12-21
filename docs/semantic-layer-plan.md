# Semantic Layer Plan: Concept Unification Map

**Objetivo:** Reconciliar los conceptos implícitos de Node-RED con los explícitos de n8n, mejorando la experiencia del usuario sin modificar el runtime de Node-RED.

**Fecha:** 2025-12-20  
**Estado:** Plan de Implementación

---

## 1. Concept Unification Map

### Tabla de Mapeo de Conceptos

| Concepto | Node-RED (Implícito) | n8n (Explícito) | Flow-RED Actual | Propuesta UI Language |
|----------|----------------------|-----------------|-----------------|----------------------|
| **Unidad de Datos** | `msg` (objeto implícito) | `items[]` (array explícito) | Mostrado como "payload" en logs | **"Data Item"** o **"Message"** - Mostrar como objeto expandible con preview |
| **Datos Principales** | `msg.payload` (acceso implícito) | `item.json` (acceso explícito) | "Último Payload" en tab Estado | **"Output Data"** - Preview del payload con tipo y tamaño |
| **Metadatos** | `msg.topic` (propiedad implícita) | `item.binary`, `item.json`, etc. (estructura explícita) | No mostrado explícitamente | **"Message Metadata"** - Sección expandible con topic, timestamp, etc. |
| **Conexiones** | `wires` (array de arrays implícito) | Input/Output panels explícitos | "Conexiones" en tab Estado (Input/Output) | **"Connections"** - Mantener pero agregar tooltips explicativos |
| **Estado de Ejecución** | `status` (evento WebSocket) | Node run results (explícito) | Indicador de color en nodo + tab Estado | **"Execution Status"** - Badge con icono + texto descriptivo |
| **Debug/Logs** | Debug sidebar (separado) | Run history (integrado) | ExecutionLog panel + logs en tab Estado | **"Execution History"** - Unificar en un solo lugar con filtros |
| **Contexto** | `flow.context`, `global.context` (implícito) | Variables explícitas en UI | No mostrado | **"Variables"** - Sección en tab Estado mostrando flow/global context |
| **Triggers** | `inject` node, `http in` (implícito) | Trigger nodes explícitos | Botón "Activar" en InjectNode | **"Trigger"** - Mantener pero agregar explicación visual de qué hace |
| **Ejecución** | Implícita (automática) | Execution panel explícito | Animaciones en edges + logs | **"Execution Flow"** - Visualización clara del flujo de datos durante ejecución |
| **Resultados** | Implícitos (en debug) | Node output preview explícito | "Último Payload" en tab Estado | **"Output Preview"** - Preview expandible del output de cada nodo |

### Análisis Detallado

#### 1. Unidad de Datos (msg vs items)

**Node-RED:**
- `msg` es un objeto JavaScript que se pasa entre nodos
- Estructura implícita: `{payload, topic, _msgid, ...}`
- No se visualiza directamente en la UI clásica

**n8n:**
- `items[]` es un array explícito de objetos de datos
- Cada item tiene estructura clara: `{json, binary, ...}`
- Se muestra en paneles Input/Output

**Flow-RED Actual:**
- Se muestra "payload" en logs de ejecución
- "Último Payload" en tab Estado del NodePropertiesPanel
- No se muestra la estructura completa del `msg`

**Propuesta:**
- Renombrar "Último Payload" → **"Last Message"**
- Mostrar estructura expandible: `{payload, topic, _msgid, timestamp}`
- Agregar tooltip: "This is the message object that was passed to this node"

#### 2. Datos Principales (msg.payload)

**Node-RED:**
- `msg.payload` es el campo principal pero implícito
- Puede ser cualquier tipo de dato

**n8n:**
- `item.json` es explícito y siempre es JSON
- Se muestra en preview expandible

**Flow-RED Actual:**
- Se muestra como JSON en "Último Payload"
- No hay preview del tipo de dato

**Propuesta:**
- Agregar badge de tipo: "String", "Number", "Object", "Array"
- Mostrar tamaño: "2.3 KB"
- Preview truncado con opción de expandir

#### 3. Conexiones (wires)

**Node-RED:**
- `wires` es un array de arrays: `[["target1"], ["target2", "target3"]]`
- Cada sub-array representa un puerto de salida
- Implícito en la estructura del nodo

**n8n:**
- Paneles Input/Output explícitos
- Cada conexión se muestra claramente

**Flow-RED Actual:**
- Se muestra en tab Estado como "Conexiones"
- Input/Output separados con nombres de nodos
- No se explica qué son los "wires"

**Propuesta:**
- Mantener estructura actual
- Agregar tooltip: "These are the connections (wires) that pass data between nodes"
- Mostrar número de puerto de salida si hay múltiples

#### 4. Contexto (flow/global context)

**Node-RED:**
- `flow.context` y `global.context` son almacenes de variables
- Implícitos, solo accesibles en código

**n8n:**
- Variables explícitas en UI
- Se pueden ver y editar

**Flow-RED Actual:**
- No se muestra en ningún lugar

**Propuesta:**
- Agregar sección "Variables" en tab Estado
- Mostrar flow context y global context si están disponibles
- Solo lectura (no editable desde UI)

#### 5. Debug/Logs

**Node-RED:**
- Debug sidebar separado
- Logs por nodo debug

**n8n:**
- Run history integrado
- Logs por ejecución completa

**Flow-RED Actual:**
- ExecutionLog panel (separado)
- Logs en tab Estado del nodo
- Dos lugares diferentes para ver logs

**Propuesta:**
- Unificar en tab Estado del nodo
- Agregar filtros: "All", "Errors", "Debug", "Info"
- Timeline visual de ejecuciones

---

## 2. User Journeys

### Journey 1: "I want to understand what happened" (Debugging)

**Escenario:** Un usuario tiene un flow que no funciona como esperaba. Necesita entender qué pasó durante la ejecución.

#### Flujo Actual (Problemático)

1. Usuario ejecuta flow
2. Ve animación en edges (confuso - ¿qué significa?)
3. No sabe dónde buscar logs
4. Abre ExecutionLog panel (si lo encuentra)
5. Ve logs genéricos sin contexto claro
6. Abre tab Estado del nodo
7. Ve "Último Payload" pero no entiende qué es
8. **Confusión:** No sabe si el problema es en este nodo o en otro

#### Flujo Propuesto (Mejorado)

1. Usuario ejecuta flow
2. **Mejora:** Tooltip en animación: "Data flowing from [Node A] to [Node B]"
3. **Mejora:** Badge de estado en cada nodo: "✓ Success" o "✗ Error"
4. Usuario hace clic en nodo con error
5. **Mejora:** Tab Estado se abre automáticamente
6. **Mejora:** Sección "Execution Summary" al inicio:
   - "This node executed 3 times"
   - "Last execution: 2.3ms ago"
   - "Status: Error - Connection timeout"
7. **Mejora:** Sección "What Happened" con timeline:
   - "10:23:45.123 - Received data from [Inject Node]"
   - "10:23:45.125 - Processing..."
   - "10:23:45.128 - Error: Connection timeout"
8. **Mejora:** Sección "Input Data" mostrando qué recibió
9. **Mejora:** Sección "Error Details" con stack trace si aplica
10. **Mejora:** Botón "View Full Execution History" que abre ExecutionLog filtrado

**Cambios de UI Requeridos:**
- Agregar tooltips explicativos en animaciones
- Agregar badge de estado más descriptivo
- Reorganizar tab Estado con secciones claras
- Agregar timeline visual de ejecución
- Agregar sección "Execution Summary"

### Journey 2: "I want to see what this node outputs" (Data Visibility)

**Escenario:** Un usuario quiere ver qué datos produce un nodo específico para entender el flujo de datos.

#### Flujo Actual (Problemático)

1. Usuario selecciona nodo
2. Abre tab Estado
3. Ve "Último Payload" (¿qué es payload?)
4. Ve JSON crudo sin explicación
5. **Confusión:** No sabe si esto es lo que el nodo envió o recibió
6. No sabe cómo ver el output de otros nodos en la cadena

#### Flujo Propuesto (Mejorado)

1. Usuario selecciona nodo
2. **Mejora:** Tab Estado se abre automáticamente
3. **Mejora:** Sección "Output Data" (en lugar de "Último Payload"):
   - Badge: "Output Type: Object"
   - Preview: `{name: "John", age: 30, ...}`
   - Botón "View Full Output" para expandir
4. **Mejora:** Sección "Input Data" mostrando qué recibió:
   - "Received from: [Inject Node]"
   - Preview del input
5. **Mejora:** Sección "Data Transformation":
   - "This node received: {payload: 'Hello'}"
   - "This node output: {payload: 'Hello World', topic: 'greeting'}"
   - Visualización de cambios (diff)
6. **Mejora:** Botón "Trace Data Flow" que muestra:
   - Dónde vino el dato (nodos anteriores)
   - Dónde va el dato (nodos siguientes)
   - Preview del dato en cada paso

**Cambios de UI Requeridos:**
- Renombrar "Último Payload" → "Output Data"
- Agregar sección "Input Data"
- Agregar sección "Data Transformation" con diff visual
- Agregar botón "Trace Data Flow"
- Mejorar preview con tipo y tamaño

### Journey 3: "I want to demo this to non-technical users" (Explain Mode)

**Escenario:** Un usuario quiere mostrar un flow a alguien que no entiende Node-RED o programación.

#### Flujo Actual (Problemático)

1. Usuario muestra flow
2. Persona ve nodos y conexiones (confuso)
3. No entiende qué hace cada nodo
4. No entiende qué son los "wires"
5. No entiende qué es "payload"
6. **Confusión:** Demasiados términos técnicos

#### Flujo Propuesto (Mejorado)

1. Usuario activa "Explain Mode" (toggle en settings)
2. **Mejora:** Tooltips descriptivos en cada nodo:
   - "This node receives data and processes it"
   - "This node sends data to the next node"
3. **Mejora:** Labels simplificados:
   - "Connection" en lugar de "Wire"
   - "Data" en lugar de "Payload"
   - "Result" en lugar de "Output"
4. **Mejora:** Modo "Step-by-Step Explanation":
   - Al hacer clic en un nodo, muestra: "This node does: [descripción simple]"
   - "It receives: [tipo de dato simple]"
   - "It sends: [tipo de dato simple]"
5. **Mejora:** Panel "Flow Overview":
   - "This flow receives data from [trigger]"
   - "Then it processes the data in [node]"
   - "Finally it sends the result to [output]"
6. **Mejora:** Ejecución con explicaciones:
   - "Step 1: Triggering the flow..."
   - "Step 2: Processing data in [Node A]..."
   - "Step 3: Sending result to [Node B]..."

**Cambios de UI Requeridos:**
- Agregar toggle "Explain Mode" en SettingsMenu
- Agregar tooltips descriptivos (condicionales según modo)
- Agregar labels simplificados (condicionales según modo)
- Agregar panel "Flow Overview"
- Agregar modo "Step-by-Step Explanation"
- Agregar explicaciones durante ejecución

---

## 3. Top 5 Confusion Points & UX Fixes

### Confusion Point #1: "What is 'payload'?"

**Problema:**
- Usuarios ven "payload" en múltiples lugares pero no entienden qué es
- Es un término técnico de Node-RED que no es intuitivo
- No hay explicación visual de qué contiene

**Ubicación Actual:**
- Tab Estado: "Último Payload"
- Logs: "Payload: ..."
- InjectNode: "Payload: date"

**Fix Propuesto:**
1. **Renombrar en UI:**
   - "Último Payload" → "Last Output Data"
   - "Payload" en logs → "Data"
   - Agregar tooltip: "Payload is the main data that flows between nodes"

2. **Agregar explicación visual:**
   - Badge de tipo: "String", "Object", "Number"
   - Preview expandible con estructura
   - Icono de información con explicación

3. **Agregar sección educativa:**
   - En tab Estado, agregar collapsible "What is payload?"
   - Explicación simple: "Payload is the main data that each node processes and passes to the next node"

**Implementación:**
- Cambiar labels en `NodePropertiesPanel.tsx`
- Agregar tooltips en componentes relevantes
- Agregar sección educativa colapsable

**Impacto:** Bajo - Solo cambios de UI, sin afectar funcionalidad

---

### Confusion Point #2: "Where did my data go?"

**Problema:**
- Usuarios ejecutan un flow pero no saben qué pasó con los datos
- No hay trazabilidad clara del flujo de datos
- No se muestra qué nodo recibió qué datos

**Ubicación Actual:**
- Animaciones en edges (confusas)
- Logs separados en ExecutionLog
- No hay conexión visual entre ejecución y datos

**Fix Propuesto:**
1. **Mejorar animaciones:**
   - Agregar tooltip: "Data flowing from [Node A] to [Node B]"
   - Mostrar preview del dato en tooltip
   - Agregar número de ejecución: "Execution #3"

2. **Agregar "Data Flow Trace":**
   - Botón en tab Estado: "Trace Data Flow"
   - Muestra timeline visual:
     - "10:23:45 - [Inject] sent: {payload: 'Hello'}"
     - "10:23:45.001 - [Function] received: {payload: 'Hello'}"
     - "10:23:45.002 - [Function] sent: {payload: 'Hello World'}"
     - "10:23:45.003 - [Debug] received: {payload: 'Hello World'}"

3. **Agregar "Execution Timeline":**
   - En tab Estado, sección "Execution Timeline"
   - Muestra todas las ejecuciones del nodo
   - Cada ejecución muestra input y output

**Implementación:**
- Mejorar tooltips en `edges.tsx`
- Agregar componente "DataFlowTrace" en `NodePropertiesPanel.tsx`
- Agregar sección "Execution Timeline" usando logs existentes

**Impacto:** Medio - Requiere agregar componentes nuevos pero usa datos existentes

---

### Confusion Point #3: "What does this node do?"

**Problema:**
- Usuarios ven un nodo pero no entienden qué hace
- No hay descripción clara de la función del nodo
- Especialmente confuso para nodos personalizados

**Ubicación Actual:**
- Solo se muestra el nombre del nodo
- No hay descripción visible
- Schema puede tener descripción pero no se muestra prominentemente

**Fix Propuesto:**
1. **Agregar "Node Description" en tab Estado:**
   - Sección al inicio: "What this node does"
   - Descripción del schema si está disponible
   - Fallback: Descripción genérica basada en tipo de nodo

2. **Agregar tooltip en nodo:**
   - Al hover, mostrar descripción corta
   - Ejemplo: "This node triggers the flow manually"

3. **Agregar "Node Info" panel:**
   - Botón "ℹ️ Info" en nodo
   - Panel lateral con:
     - Descripción completa
     - Inputs esperados
     - Outputs generados
     - Ejemplos de uso

**Implementación:**
- Agregar sección "Node Description" en `NodePropertiesPanel.tsx`
- Agregar tooltip en `BaseNode.tsx`
- Agregar panel "NodeInfo" como componente nuevo
- Usar schema.description si está disponible

**Impacto:** Bajo - Solo UI, usa datos existentes del schema

---

### Confusion Point #4: "Why did this fail?"

**Problema:**
- Cuando un nodo falla, solo se ve un indicador rojo
- No hay explicación clara del error
- No se muestra qué input causó el error

**Ubicación Actual:**
- Indicador rojo en nodo
- Logs en ExecutionLog (si se encuentra)
- No hay conexión clara entre error y causa

**Fix Propuesto:**
1. **Mejorar indicador de error:**
   - Badge con texto: "Error: Connection timeout"
   - Click en badge abre tab Estado automáticamente

2. **Agregar "Error Details" en tab Estado:**
   - Sección prominente cuando hay error
   - Muestra:
     - Mensaje de error
     - Stack trace (colapsable)
     - Input que causó el error
     - Timestamp del error

3. **Agregar "Error History":**
   - Lista de errores anteriores
   - Patrones comunes (si hay múltiples errores similares)

4. **Agregar "Suggested Fixes":**
   - Basado en tipo de error, sugerencias:
     - "Connection timeout" → "Check if the service is running"
     - "Invalid JSON" → "Check the input data format"

**Implementación:**
- Mejorar `BaseNode.tsx` para mostrar mensaje de error
- Agregar sección "Error Details" en `NodePropertiesPanel.tsx`
- Agregar lógica para extraer mensaje de error de logs
- Agregar componente "SuggestedFixes" con reglas básicas

**Impacto:** Medio - Requiere procesamiento de errores pero no cambios en runtime

---

### Confusion Point #5: "How do I see what's happening in real-time?"

**Problema:**
- Usuarios ejecutan un flow pero no ven claramente qué está pasando
- Animaciones en edges son confusas
- Logs están en panel separado
- No hay vista unificada de la ejecución

**Ubicación Actual:**
- Animaciones en edges (poco claras)
- ExecutionLog panel (separado, no siempre visible)
- Logs en tab Estado (solo para nodo seleccionado)

**Fix Propuesto:**
1. **Agregar "Execution View" mode:**
   - Toggle en toolbar: "Execution View"
   - Cuando está activo:
     - Muestra timeline de ejecución en panel lateral
     - Resalta nodos que están ejecutando
     - Muestra datos en cada paso
     - Pausa/Resume para inspeccionar

2. **Mejorar animaciones:**
   - Agregar label: "Executing: [Node Name]"
   - Mostrar preview del dato en animación
   - Agregar progreso: "Step 2 of 5"

3. **Agregar "Execution Summary":**
   - Panel flotante durante ejecución
   - Muestra:
     - Nodos ejecutados: 3/10
     - Tiempo transcurrido: 1.2s
     - Último nodo: [Node Name]
     - Estado: Running / Success / Error

4. **Agregar "Replay Execution":**
   - Después de ejecución, botón "Replay"
   - Reproduce la ejecución paso a paso
   - Permite pausar en cada paso

**Implementación:**
- Agregar toggle "Execution View" en `CanvasPage.tsx`
- Mejorar animaciones en `edges.tsx` con labels
- Agregar componente "ExecutionSummary" flotante
- Agregar componente "ExecutionTimeline" en panel lateral
- Agregar lógica de "Replay" usando logs existentes

**Impacto:** Alto - Requiere nuevos componentes pero no cambios en runtime

---

## 4. Priorización de Implementación

### Fase 1: Quick Wins (Bajo Impacto, Alto Valor)
1. **Confusion Point #1:** Renombrar "payload" → "data" en UI
2. **Confusion Point #3:** Agregar descripción de nodo en tab Estado
3. **Journey 1:** Agregar tooltips explicativos en animaciones

**Tiempo estimado:** 2-3 días

### Fase 2: Mejoras de Visibilidad (Medio Impacto, Alto Valor)
1. **Confusion Point #2:** Agregar "Data Flow Trace"
2. **Confusion Point #4:** Mejorar indicadores de error
3. **Journey 2:** Mejorar sección "Output Data"

**Tiempo estimado:** 1 semana

### Fase 3: Features Avanzadas (Alto Impacto, Medio Valor)
1. **Confusion Point #5:** Agregar "Execution View" mode
2. **Journey 3:** Agregar "Explain Mode"
3. **Journey 1:** Agregar timeline visual de ejecución

**Tiempo estimado:** 2 semanas

---

## 5. Consideraciones Técnicas

### Restricciones
- ✅ No modificar runtime de Node-RED
- ✅ No agregar nuevas features de runtime
- ✅ Todos los fixes son en UI solamente
- ✅ Usar datos existentes de WebSocket y logs

### Datos Disponibles
- WebSocket events: `status`, `debug`, `error`
- Execution logs: `ExecutionLogEntry[]` en store
- Node data: `node.data.nodeRedNode`
- Edges: `edges[]` en store
- Runtime states: `nodeRuntimeStates` en store

### Componentes a Modificar/Crear
- `NodePropertiesPanel.tsx` - Agregar secciones nuevas
- `BaseNode.tsx` - Mejorar tooltips y badges
- `edges.tsx` - Mejorar animaciones con labels
- `ExecutionLog.tsx` - Mejorar visualización
- Nuevos componentes:
  - `DataFlowTrace.tsx`
  - `ExecutionTimeline.tsx`
  - `ExecutionSummary.tsx`
  - `NodeInfo.tsx`
  - `SuggestedFixes.tsx`

---

## 6. Métricas de Éxito

### Métricas Cuantitativas
- Reducción en tiempo para encontrar errores (target: -50%)
- Reducción en preguntas de soporte sobre conceptos básicos (target: -70%)
- Aumento en uso de features de debugging (target: +100%)

### Métricas Cualitativas
- Feedback de usuarios: "Más fácil de entender"
- Reducción en confusión reportada
- Aumento en adopción por usuarios no técnicos

---

## 7. Próximos Pasos

1. **Revisar y aprobar este plan**
2. **Crear issues/tickets para cada fase**
3. **Implementar Fase 1 (Quick Wins)**
4. **Recopilar feedback de usuarios**
5. **Iterar y mejorar basado en feedback**

---

**Nota:** Este documento es un plan de implementación. Todos los cambios propuestos son en la UI solamente y no requieren modificaciones al runtime de Node-RED.

