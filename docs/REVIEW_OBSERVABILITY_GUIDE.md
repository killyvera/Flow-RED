# Revisión: Guía de Integración Frontend - Node-RED Runtime Observability

**Fecha de Revisión:** $(date)  
**Guía Revisada:** Guía de Integración Frontend - Node-RED Runtime Observability  
**Estado del Proyecto:** Implementación actual usa WebSocket estándar de Node-RED (`/comms`), no el plugin de observability

---

## Resumen Ejecutivo

La guía describe la integración con el plugin **`node-red-runtime-observability`** que expone un endpoint `/observability` con un Execution Contract v1. Sin embargo, el proyecto actualmente:

- ✅ **Tiene implementado** un sistema de WebSocket que se conecta a `/comms` o `/admin/comms` (WebSocket estándar de Node-RED)
- ✅ **Tiene implementado** Execution Frames con una estructura similar pero diferente
- ❌ **NO tiene integrado** el plugin de observability ni el endpoint `/observability`
- ❌ **NO procesa** los eventos del plugin (`frame:start`, `node:input`, `node:output`, `frame:end`)

**Conclusión:** La guía es correcta para el plugin de observability, pero describe una integración **futura** que aún no está implementada en el código actual.

---

## Discrepancias con la Implementación Actual

### 1. Endpoint WebSocket

**Guía dice:**
```
ws://<host>:<port>/observability
```

**Implementación actual:**
- Se conecta a `/comms` o `/admin/comms` (WebSocket estándar de Node-RED)
- Archivo: `src/api/websocket.ts`
- No hay soporte para `/observability`

**Recomendación:** 
- La guía es correcta para el plugin, pero debe aclarar que es un endpoint diferente
- Agregar nota sobre la diferencia entre el WebSocket estándar y el de observability

---

### 2. Estructura de Eventos

**Guía describe eventos:**
```javascript
{
    event: "frame:start",
    frameId: "...",
    nodeId: "...",
    data: {...}
}
```

**Implementación actual procesa:**
- `status/<nodeId>` - Estados de nodos
- `debug` - Mensajes de debug
- `error` - Errores
- `nodes-started` / `nodes-stopped` - Eventos de inicio/detención

**Recomendación:**
- La guía es correcta para el plugin
- Agregar sección comparando ambos sistemas de eventos
- Documentar cómo migrar o integrar ambos

---

### 3. Execution Frames

**Guía describe:**
```typescript
interface FrameData {
    id: string;
    triggerNodeId?: string;
    startedAt: number;
    nodes: Map<string, NodeExecutionData>;
}
```

**Implementación actual:**
```typescript
interface ExecutionFrame {
    id: string;
    startedAt: number;
    endedAt?: number;
    triggerNodeId?: string;
    label?: string;
}
```

**Diferencias:**
- ✅ Estructura base similar
- ❌ Implementación actual NO tiene `nodes: Map` en el frame
- ✅ Implementación actual tiene `nodeSnapshots: Map<string, NodeExecutionSnapshot[]>` en el store
- ✅ Implementación actual tiene `label` opcional

**Recomendación:**
- La guía es correcta para el plugin
- La implementación actual es compatible pero con estructura diferente
- Se puede adaptar fácilmente

---

### 4. NodeExecutionData

**Guía describe:**
```typescript
interface NodeExecutionData {
    nodeId: string;
    nodeType: string;
    input?: IOEvent;
    outputs: IOEvent[];
    semantics?: {...};
    timing?: {...};
}
```

**Implementación actual:**
```typescript
interface NodeExecutionSnapshot {
    nodeId: string;
    frameId: string;
    status: NodeRuntimeState;
    ts: number;
    summary?: string;
    payloadPreview?: string;
}
```

**Diferencias:**
- ❌ Implementación actual NO tiene `input`/`outputs` estructurados como IOEvent
- ❌ Implementación actual NO tiene `semantics` (role, behavior)
- ❌ Implementación actual NO tiene `timing` estructurado
- ✅ Implementación actual tiene `payloadPreview` (similar pero más simple)

**Recomendación:**
- El plugin de observability proporciona información mucho más rica
- La implementación actual es más básica
- Se puede extender para soportar ambos formatos

---

### 5. Semantics (Roles y Behaviors)

**Guía describe:**
```typescript
semantics: {
    role: "trigger" | "transform" | "filter" | "generator" | "sink";
    behavior: "pass-through" | "transformed" | "filtered" | "bifurcated" | "terminated";
}
```

**Implementación actual:**
- ❌ NO tiene semantics automáticas
- ✅ Tiene detección manual de trigger nodes en `executionFrameManager.ts`
- ✅ Tiene `isTriggerNode()` pero no detecta roles/behaviors automáticamente

**Recomendación:**
- El plugin proporciona semantics automáticas (muy valioso)
- La implementación actual requiere detección manual
- Integrar el plugin mejoraría significativamente la UX

---

## Errores y Mejoras en la Guía

### ✅ Aspectos Correctos

1. **Estructura de eventos del plugin** - Correcta
2. **Tipos TypeScript** - Bien definidos
3. **Ejemplos de código** - Útiles y claros
4. **Mejores prácticas** - Apropiadas

### ⚠️ Mejoras Sugeridas

#### 1. Aclarar Diferencias con WebSocket Estándar

**Agregar sección:**
```markdown
## Diferencias con WebSocket Estándar de Node-RED

El plugin de observability expone un endpoint diferente (`/observability`) 
que proporciona información más estructurada que el WebSocket estándar (`/comms`):

| Característica | WebSocket Estándar | Plugin Observability |
|----------------|-------------------|---------------------|
| Endpoint | `/comms` | `/observability` |
| Eventos | `status/`, `debug`, `error` | `frame:start`, `node:input`, `node:output`, `frame:end` |
| Semantics | Manual | Automática |
| Timing | No estructurado | Estructurado (durationMs) |
| IOEvents | No | Sí (input/output con previews) |
```

#### 2. Agregar Ejemplo de Detección de Plugin

**Agregar código:**
```javascript
// Detectar si el plugin está disponible
async function checkObservabilityAvailable() {
    try {
        const response = await fetch('/observability/health');
        return response.ok;
    } catch {
        return false;
    }
}

// Conectar al plugin si está disponible, sino usar WebSocket estándar
const hasObservability = await checkObservabilityAvailable();
if (hasObservability) {
    // Usar plugin de observability
    observabilityWS = new WebSocket(`${protocol}//${host}:${port}/observability`);
} else {
    // Fallback a WebSocket estándar
    standardWS = new WebSocket(`${protocol}//${host}:${port}/comms`);
}
```

#### 3. Corregir Ejemplo de Reconexión

**Problema en la guía:**
```javascript
observabilityWS.onclose = () => {
    setTimeout(() => {
        observabilityWS = new WebSocket(...); // ❌ No funciona, necesita crear nueva instancia
    }, 2000);
};
```

**Mejor:**
```javascript
let reconnectTimer = null;

observabilityWS.onclose = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        observabilityWS = new WebSocket(...);
    }, 2000);
};
```

#### 4. Agregar Manejo de Errores en Ejemplos

Los ejemplos no muestran manejo de errores completo. Agregar:
```javascript
observabilityWS.onerror = (error) => {
    console.error('Error en observability WebSocket:', error);
    // Intentar reconectar o fallback a WebSocket estándar
};
```

#### 5. Documentar Compatibilidad con Implementación Actual

**Agregar sección:**
```markdown
## Compatibilidad con Implementación Actual

El proyecto actualmente usa el WebSocket estándar de Node-RED. Para integrar 
el plugin de observability:

1. **Opción A: Reemplazar completamente**
   - Migrar de `/comms` a `/observability`
   - Actualizar handlers de eventos
   - Actualizar tipos TypeScript

2. **Opción B: Dual Support (Recomendado)**
   - Detectar si el plugin está disponible
   - Usar plugin si está disponible, sino fallback a WebSocket estándar
   - Mantener compatibilidad con ambos sistemas
```

---

## Recomendaciones de Implementación

### Fase 1: Preparación

1. **Crear tipos TypeScript para eventos del plugin:**
   ```typescript
   // src/types/observability.ts
   export interface ObservabilityEvent {
       event: string;
       ts: number;
       frameId?: string;
       nodeId?: string;
       data?: any;
   }
   
   export interface IOEvent {
       direction: "input" | "output";
       port?: number;
       timestamp: number;
       payload: {
           preview?: any;
           type: string;
           size?: number;
           truncated: boolean;
       };
   }
   ```

2. **Extender ExecutionFrame para soportar ambos formatos:**
   ```typescript
   export interface ExecutionFrame {
       // ... campos actuales
       // Agregar campos opcionales del plugin
       nodes?: Map<string, NodeExecutionData>;
   }
   ```

### Fase 2: Cliente WebSocket de Observability

1. **Crear cliente separado o extender el existente:**
   ```typescript
   // src/api/observabilityWebSocket.ts
   export class ObservabilityWebSocketClient {
       // Similar a NodeRedWebSocketClient pero para /observability
   }
   ```

2. **Detectar disponibilidad del plugin:**
   ```typescript
   async function isObservabilityAvailable(): Promise<boolean> {
       // Verificar si el endpoint existe
   }
   ```

### Fase 3: Integración Dual

1. **Modificar `useNodeRedWebSocket` para soportar ambos:**
   ```typescript
   export function useNodeRedWebSocket(enabled: boolean = true) {
       const [useObservability, setUseObservability] = useState(false);
       
       useEffect(() => {
           checkObservability().then(available => {
               setUseObservability(available);
           });
       }, []);
       
       // Usar plugin si está disponible, sino WebSocket estándar
   }
   ```

2. **Mapear eventos del plugin a estructura actual:**
   ```typescript
   function mapObservabilityEvent(event: ObservabilityEvent): NodeRedWebSocketEvent {
       // Convertir eventos del plugin a formato compatible
   }
   ```

### Fase 4: UI Enhancements

1. **Mostrar semantics en UI:**
   - Agregar badges de role/behavior en nodos
   - Mostrar timing en tooltips
   - Visualizar bifurcaciones

2. **Mejorar visualización de IOEvents:**
   - Mostrar previews en inspector
   - Animar edges con timestamps precisos
   - Mostrar múltiples outputs (bifurcaciones)

---

## Checklist de Integración

### Pre-requisitos
- [ ] Plugin `node-red-runtime-observability` instalado en Node-RED
- [ ] Plugin habilitado en `settings.js`
- [ ] Endpoint `/observability` accesible

### Implementación
- [ ] Crear tipos TypeScript para eventos del plugin
- [ ] Crear cliente WebSocket para `/observability`
- [ ] Implementar detección de disponibilidad del plugin
- [ ] Crear mappers de eventos (plugin → estructura actual)
- [ ] Extender ExecutionFrame para soportar NodeExecutionData
- [ ] Integrar semantics en UI
- [ ] Agregar visualización de timing
- [ ] Implementar visualización de bifurcaciones
- [ ] Agregar fallback a WebSocket estándar

### Testing
- [ ] Probar con plugin habilitado
- [ ] Probar con plugin deshabilitado (fallback)
- [ ] Probar reconexión automática
- [ ] Probar con múltiples frames simultáneos
- [ ] Probar con bifurcaciones
- [ ] Probar performance con muchos eventos

### Documentación
- [ ] Actualizar README con instrucciones del plugin
- [ ] Documentar configuración del plugin
- [ ] Agregar ejemplos de uso
- [ ] Documentar diferencias entre ambos sistemas

---

## Conclusión

La guía es **técnicamente correcta** y describe bien el plugin de observability. Sin embargo:

1. **No está implementada** en el código actual
2. **Falta contexto** sobre diferencias con WebSocket estándar
3. **Necesita ejemplos** de integración dual (plugin + estándar)
4. **Puede mejorarse** con manejo de errores más robusto

**Recomendación:** 
- ✅ Mantener la guía como está (es correcta)
- ✅ Agregar sección de "Compatibilidad con Implementación Actual"
- ✅ Agregar ejemplos de detección y fallback
- ✅ Crear plan de integración (checklist arriba)

La integración del plugin mejoraría significativamente la observabilidad del sistema, especialmente con:
- Semantics automáticas
- Timing estructurado
- IOEvents con previews
- Detección automática de bifurcaciones

