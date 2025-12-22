# Guía de Integración Frontend - Node-RED Runtime Observability

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Conexión WebSocket](#conexión-websocket)
3. [Estructura de Eventos](#estructura-de-eventos)
4. [Tipos de Eventos](#tipos-de-eventos)
5. [Integración con UI](#integración-con-ui)
6. [Ejemplos de Código](#ejemplos-de-código)
7. [Casos de Uso](#casos-de-uso)
8. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

El plugin **node-red-runtime-observability** expone un Execution Contract v1 que permite observar la ejecución de flujos de Node-RED en tiempo real mediante un WebSocket dedicado.

### Características Principales

- ✅ **Input/Output por nodo**: Observa qué datos recibe y envía cada nodo
- ✅ **Semantics automáticas**: Detecta roles (trigger, transform, filter, etc.) y behaviors (pass-through, transformed, bifurcated, etc.)
- ✅ **Timing preciso**: Duración de procesamiento por nodo
- ✅ **Execution Frames**: Agrupa ejecuciones relacionadas (como "runs" en n8n)
- ✅ **Datos seguros**: Solo previews truncados, nunca payloads completos
- ✅ **Redacción automática**: Campos sensibles (passwords, tokens) se redactan automáticamente

---

## Conexión WebSocket

### Endpoint

```
ws://<host>:<port>/observability
```

Si tienes `httpAdminRoot` configurado:
```
ws://<host>:<port>/<httpAdminRoot>/observability
```

### Ejemplo de Conexión Básica

```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.hostname;
const port = '1880'; // O desde configuración
const path = '/observability';

const observabilityWS = new WebSocket(`${protocol}//${host}:${port}${path}`);

observabilityWS.onopen = () => {
    console.log('✅ Conectado a observability');
};

observabilityWS.onmessage = (e) => {
    const event = JSON.parse(e.data);
    handleObservabilityEvent(event);
};

observabilityWS.onerror = (err) => {
    console.error('❌ Error en observability WebSocket:', err);
};

observabilityWS.onclose = () => {
    console.log('🔌 Desconectado de observability');
    // Reconectar después de 2 segundos
    setTimeout(() => {
        observabilityWS = new WebSocket(`${protocol}//${host}:${port}${path}`);
    }, 2000);
};
```

---

## Estructura de Eventos

Todos los eventos siguen esta estructura base:

```typescript
interface ObservabilityEvent {
    event: string;        // Tipo de evento
    ts: number;           // Timestamp Unix (ms)
    frameId?: string;     // ID del frame (para eventos de ejecución)
    nodeId?: string;      // ID del nodo (para eventos de nodo)
    data?: any;           // Datos específicos del evento
}
```

---

## Tipos de Eventos

### 1. `connected`

Emitido cuando el cliente se conecta al WebSocket.

```javascript
{
    event: "connected",
    ts: 1766377387527,
    message: "Connected to Node-RED Observability"
}
```

**Uso**: Confirmar conexión exitosa.

---

### 2. `heartbeat`

Emitido cada 15 segundos para mantener la conexión activa.

```javascript
{
    event: "heartbeat",
    ts: 1766377388334,
    connections: 1
}
```

**Uso**: Puedes ignorarlo o usarlo para detectar desconexiones.

---

### 3. `frame:start`

Emitido cuando comienza una nueva ejecución (frame).

```javascript
{
    event: "frame:start",
    ts: 1766377573050,
    frameId: "frame-1766377573050-5z9qvrfye",
    data: {
        id: "frame-1766377573050-5z9qvrfye",
        startedAt: 1766377573050,
        triggerNodeId: "inject-1"  // Puede ser undefined inicialmente
    }
}
```

**Campos**:
- `frameId`: ID único del frame
- `data.id`: Mismo que frameId
- `data.startedAt`: Timestamp de inicio
- `data.triggerNodeId`: ID del nodo que inició la ejecución (puede ser `undefined` si aún no se detectó)

**Uso**: 
- Inicializar tracking del frame
- Resaltar el nodo trigger
- Mostrar indicador de ejecución activa

---

### 4. `node:input`

Emitido cuando un nodo recibe un mensaje.

```javascript
{
    event: "node:input",
    ts: 1766377573056,
    frameId: "frame-1766377573050-5z9qvrfye",
    nodeId: "inject-1",
    data: {
        nodeId: "inject-1",
        nodeType: "inject",
        input: {
            direction: "input",
            timestamp: 1766377573056,
            payload: {
                preview: "Mensaje de prueba",
                type: "string",
                size: 18,
                truncated: false
            }
        },
        sampled: true  // false si fue filtrado por sampling
    }
}
```

**Campos**:
- `nodeId`: ID del nodo
- `nodeType`: Tipo de nodo (inject, function, debug, etc.)
- `input`: IOEvent con el payload recibido
- `sampled`: `true` si se capturó el payload completo, `false` si fue filtrado

**Uso**:
- Animar edge entrante al nodo
- Mostrar preview del payload en tooltip/panel
- Cambiar estado visual del nodo a "processing"

---

### 5. `node:output`

Emitido cuando un nodo envía mensaje(s).

```javascript
{
    event: "node:output",
    ts: 1766377573057,
    frameId: "frame-1766377573050-5z9qvrfye",
    nodeId: "subflow-instance-1",
    data: {
        nodeId: "subflow-instance-1",
        nodeType: "subflow",
        outputs: [
            {
                direction: "output",
                port: 0,
                timestamp: 1766377573057,
                payload: {
                    preview: "Mensaje de prueba",
                    type: "string",
                    size: 18,
                    truncated: false
                }
            }
        ],
        semantics: {
            role: "transform",
            behavior: "transformed"
        },
        timing: {
            receivedAt: 1766377573056,
            sentAt: 1766377573057,
            durationMs: 1
        },
        sampled: true
    }
}
```

**Campos**:
- `outputs`: Array de IOEvents (puede ser múltiple si hay bifurcación)
- `outputs[].port`: Puerto de salida (0, 1, 2...)
- `semantics.role`: `"trigger" | "transform" | "filter" | "generator" | "sink"`
- `semantics.behavior`: `"pass-through" | "transformed" | "filtered" | "bifurcated" | "terminated"`
- `timing.receivedAt`: Timestamp cuando recibió el input
- `timing.sentAt`: Timestamp cuando envió el output
- `timing.durationMs`: Duración de procesamiento en milisegundos

**Uso**:
- Animar edges salientes (uno por cada output)
- Mostrar semantics en badges/indicadores
- Mostrar timing en tooltips
- Detectar bifurcaciones (múltiples outputs)

---

### 6. `frame:end`

Emitido cuando termina una ejecución (frame).

```javascript
{
    event: "frame:end",
    ts: 1766377578926,
    frameId: "frame-1766377573050-5z9qvrfye",
    data: {
        id: "frame-1766377573050-5z9qvrfye",
        endedAt: 1766377578926,
        stats: {
            nodeCount: 5,
            outputsEmitted: 8,
            filteredNodes: 1,
            erroredNodes: 0,
            durationMs: 5876
        }
    }
}
```

**Campos**:
- `stats.nodeCount`: Número de nodos que participaron
- `stats.outputsEmitted`: Total de outputs emitidos
- `stats.filteredNodes`: Nodos que recibieron pero no enviaron (filtrados)
- `stats.erroredNodes`: Nodos que tuvieron errores
- `stats.durationMs`: Duración total del frame

**Uso**:
- Limpiar animaciones después de un delay
- Mostrar estadísticas de ejecución
- Liberar recursos del frame

---

## Integración con UI

### Gestión de Estado

```javascript
// Store para frames activos
const activeFrames = new Map(); // frameId -> FrameData

// Estructura de FrameData
interface FrameData {
    id: string;
    triggerNodeId?: string;
    startedAt: number;
    nodes: Map<string, NodeExecutionData>;
}

interface NodeExecutionData {
    nodeId: string;
    nodeType: string;
    input?: IOEvent;
    outputs: IOEvent[];
    semantics?: {
        role: string;
        behavior: string;
    };
    timing?: {
        receivedAt?: number;
        sentAt?: number;
        durationMs?: number;
    };
}
```

### Handler Principal

```javascript
function handleObservabilityEvent(event) {
    switch (event.event) {
        case 'connected':
            console.log('Observability conectado');
            break;
            
        case 'heartbeat':
            // Opcional: actualizar último heartbeat
            lastHeartbeat = Date.now();
            break;
            
        case 'frame:start':
            handleFrameStart(event);
            break;
            
        case 'node:input':
            handleNodeInput(event);
            break;
            
        case 'node:output':
            handleNodeOutput(event);
            break;
            
        case 'frame:end':
            handleFrameEnd(event);
            break;
            
        default:
            console.warn('Evento desconocido:', event);
    }
}
```

---

## Ejemplos de Código

### Ejemplo 1: Clase ObservabilityManager

```javascript
class ObservabilityManager {
    constructor(config = {}) {
        this.ws = null;
        this.frames = new Map();
        this.isConnected = false;
        this.reconnectDelay = 2000;
        this.config = {
            host: config.host || window.location.hostname,
            port: config.port || '1880',
            path: config.path || '/observability',
            ...config
        };
        
        this.onFrameStart = null;
        this.onNodeInput = null;
        this.onNodeOutput = null;
        this.onFrameEnd = null;
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${this.config.host}:${this.config.port}${this.config.path}`;
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
            this.isConnected = true;
            console.log('✅ Observability conectado');
        };
        
        this.ws.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                this.handleEvent(event);
            } catch (err) {
                console.error('Error parsing observability event:', err);
            }
        };
        
        this.ws.onerror = (err) => {
            console.error('❌ Error en observability WebSocket:', err);
            this.isConnected = false;
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('🔌 Desconectado de observability');
            
            // Reconectar automáticamente
            if (this.config.autoReconnect !== false) {
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        };
    }
    
    handleEvent(event) {
        switch (event.event) {
            case 'frame:start':
                this.handleFrameStart(event);
                break;
            case 'node:input':
                this.handleNodeInput(event);
                break;
            case 'node:output':
                this.handleNodeOutput(event);
                break;
            case 'frame:end':
                this.handleFrameEnd(event);
                break;
        }
    }
    
    handleFrameStart(event) {
        const { frameId, data } = event;
        
        const frame = {
            id: frameId,
            triggerNodeId: data.triggerNodeId,
            startedAt: data.startedAt,
            nodes: new Map()
        };
        
        this.frames.set(frameId, frame);
        
        if (this.onFrameStart) {
            this.onFrameStart(event, frame);
        }
    }
    
    handleNodeInput(event) {
        const { frameId, nodeId, data } = event;
        const frame = this.frames.get(frameId);
        
        if (frame) {
            const nodeExec = frame.nodes.get(nodeId) || {
                nodeId,
                nodeType: data.nodeType,
                outputs: []
            };
            
            nodeExec.input = data.input;
            nodeExec.timing = nodeExec.timing || {};
            nodeExec.timing.receivedAt = data.input?.timestamp;
            
            frame.nodes.set(nodeId, nodeExec);
        }
        
        if (this.onNodeInput) {
            this.onNodeInput(event, frame);
        }
    }
    
    handleNodeOutput(event) {
        const { frameId, nodeId, data } = event;
        const frame = this.frames.get(frameId);
        
        if (frame) {
            const nodeExec = frame.nodes.get(nodeId) || {
                nodeId,
                nodeType: data.nodeType,
                input: null
            };
            
            nodeExec.outputs = data.outputs;
            nodeExec.semantics = data.semantics;
            nodeExec.timing = {
                ...nodeExec.timing,
                ...data.timing
            };
            
            frame.nodes.set(nodeId, nodeExec);
        }
        
        if (this.onNodeOutput) {
            this.onNodeOutput(event, frame);
        }
    }
    
    handleFrameEnd(event) {
        const { frameId, data } = event;
        const frame = this.frames.get(frameId);
        
        if (this.onFrameEnd) {
            this.onFrameEnd(event, frame, data.stats);
        }
        
        // Limpiar frame después de un delay
        setTimeout(() => {
            this.frames.delete(frameId);
        }, 5000);
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

// Uso
const observability = new ObservabilityManager({
    host: 'localhost',
    port: '1880'
});

observability.onFrameStart = (event, frame) => {
    console.log('Frame iniciado:', frame.id);
    highlightNode(frame.triggerNodeId, 'executing');
};

observability.onNodeInput = (event, frame) => {
    animateIncomingEdge(event.nodeId, event.data.input.timestamp);
    updateNodeStatus(event.nodeId, 'processing');
};

observability.onNodeOutput = (event, frame) => {
    event.data.outputs.forEach(output => {
        animateOutgoingEdge(event.nodeId, output.port, output.timestamp);
    });
    updateNodeSemantics(event.nodeId, event.data.semantics);
    updateNodeStatus(event.nodeId, 'completed');
};

observability.onFrameEnd = (event, frame, stats) => {
    console.log('Frame completado:', stats);
    setTimeout(() => clearAnimations(frame.id), 2000);
};

observability.connect();
```

---

### Ejemplo 2: Integración con React

```jsx
import { useEffect, useState, useRef } from 'react';

function useObservability(config = {}) {
    const [frames, setFrames] = useState(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = config.host || window.location.hostname;
        const port = config.port || '1880';
        const ws = new WebSocket(`${protocol}//${host}:${port}/observability`);
        
        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        
        ws.onmessage = (e) => {
            const event = JSON.parse(e.data);
            
            setFrames(prev => {
                const newFrames = new Map(prev);
                
                switch (event.event) {
                    case 'frame:start':
                        newFrames.set(event.frameId, {
                            id: event.frameId,
                            triggerNodeId: event.data.triggerNodeId,
                            startedAt: event.data.startedAt,
                            nodes: new Map()
                        });
                        break;
                        
                    case 'node:input':
                        const frame = newFrames.get(event.frameId);
                        if (frame) {
                            const nodeExec = frame.nodes.get(event.nodeId) || {
                                nodeId: event.nodeId,
                                nodeType: event.data.nodeType,
                                outputs: []
                            };
                            nodeExec.input = event.data.input;
                            nodeExec.timing = { ...nodeExec.timing, receivedAt: event.data.input.timestamp };
                            frame.nodes.set(event.nodeId, nodeExec);
                        }
                        break;
                        
                    case 'node:output':
                        const frame2 = newFrames.get(event.frameId);
                        if (frame2) {
                            const nodeExec = frame2.nodes.get(event.nodeId) || {
                                nodeId: event.nodeId,
                                nodeType: event.data.nodeType
                            };
                            nodeExec.outputs = event.data.outputs;
                            nodeExec.semantics = event.data.semantics;
                            nodeExec.timing = { ...nodeExec.timing, ...event.data.timing };
                            frame2.nodes.set(event.nodeId, nodeExec);
                        }
                        break;
                        
                    case 'frame:end':
                        // Frame terminado - mantener por un tiempo para mostrar stats
                        setTimeout(() => {
                            setFrames(prev => {
                                const updated = new Map(prev);
                                updated.delete(event.frameId);
                                return updated;
                            });
                        }, 5000);
                        break;
                }
                
                return newFrames;
            });
        };
        
        wsRef.current = ws;
        
        return () => {
            ws.close();
        };
    }, [config.host, config.port]);
    
    return { frames, isConnected };
}

// Uso en componente
function FlowVisualization() {
    const { frames, isConnected } = useObservability();
    
    return (
        <div>
            <div>Estado: {isConnected ? '✅ Conectado' : '❌ Desconectado'}</div>
            <div>Frames activos: {frames.size}</div>
            
            {Array.from(frames.values()).map(frame => (
                <FrameView key={frame.id} frame={frame} />
            ))}
        </div>
    );
}
```

---

### Ejemplo 3: Animación de Edges

```javascript
function animateIncomingEdge(nodeId, timestamp) {
    // Encontrar todos los edges que llegan a este nodo
    const incomingEdges = getEdgesToNode(nodeId);
    
    incomingEdges.forEach(edge => {
        // Animar edge con timestamp específico
        animateEdge(edge.id, {
            direction: 'forward',
            startTime: timestamp - 100, // Iniciar 100ms antes
            duration: 200
        });
    });
}

function animateOutgoingEdge(nodeId, port, timestamp) {
    // Encontrar edges que salen de este nodo en el puerto específico
    const outgoingEdges = getEdgesFromNode(nodeId, port);
    
    outgoingEdges.forEach(edge => {
        animateEdge(edge.id, {
            direction: 'forward',
            startTime: timestamp,
            duration: 200
        });
    });
}

function animateEdge(edgeId, options) {
    const edge = document.querySelector(`[data-edge-id="${edgeId}"]`);
    if (!edge) return;
    
    // Agregar clase de animación
    edge.classList.add('edge-animating');
    
    // Remover después de la animación
    setTimeout(() => {
        edge.classList.remove('edge-animating');
    }, options.duration);
}
```

---

### Ejemplo 4: Visualización de Semantics

```javascript
function updateNodeSemantics(nodeId, semantics) {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    const { role, behavior } = semantics;
    
    // Agregar badges
    let roleBadge = nodeElement.querySelector('.role-badge');
    if (!roleBadge) {
        roleBadge = document.createElement('span');
        roleBadge.className = 'role-badge';
        nodeElement.appendChild(roleBadge);
    }
    roleBadge.textContent = role;
    roleBadge.className = `role-badge role-${role}`;
    
    // Agregar indicador de behavior
    nodeElement.setAttribute('data-behavior', behavior);
    
    // Colores según behavior
    const behaviorColors = {
        'pass-through': '#4CAF50',
        'transformed': '#2196F3',
        'filtered': '#FF9800',
        'bifurcated': '#9C27B0',
        'terminated': '#F44336'
    };
    
    nodeElement.style.borderColor = behaviorColors[behavior] || '#ccc';
}
```

---

### Ejemplo 5: Mostrar Timing

```javascript
function showNodeTiming(nodeId, timing) {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    let timingTooltip = nodeElement.querySelector('.timing-tooltip');
    if (!timingTooltip) {
        timingTooltip = document.createElement('div');
        timingTooltip.className = 'timing-tooltip';
        nodeElement.appendChild(timingTooltip);
    }
    
    if (timing.durationMs !== undefined) {
        timingTooltip.textContent = `${timing.durationMs}ms`;
        timingTooltip.style.display = 'block';
    }
}
```

---

## Casos de Uso

### 1. Visualización de Ejecución en Tiempo Real

```javascript
// Mostrar qué nodos están ejecutándose
function visualizeExecution(frame) {
    frame.nodes.forEach((nodeExec, nodeId) => {
        if (nodeExec.timing.receivedAt && !nodeExec.timing.sentAt) {
            // Nodo está procesando
            setNodeStatus(nodeId, 'processing');
        } else if (nodeExec.timing.sentAt) {
            // Nodo completó
            setNodeStatus(nodeId, 'completed');
        }
    });
}
```

### 2. Detección de Nodos Filtrados

```javascript
function highlightFilteredNodes(frame) {
    frame.nodes.forEach((nodeExec, nodeId) => {
        if (nodeExec.semantics?.behavior === 'filtered') {
            // Nodo recibió input pero no envió output
            highlightNode(nodeId, 'filtered');
            showTooltip(nodeId, 'Este nodo filtró el mensaje');
        }
    });
}
```

### 3. Detección de Bifurcaciones

```javascript
function handleBifurcation(event) {
    if (event.data.outputs.length > 1) {
        // Múltiples outputs = bifurcación
        const nodeId = event.nodeId;
        
        event.data.outputs.forEach((output, index) => {
            // Animar cada branch por separado
            animateBranch(nodeId, output.port, index);
        });
        
        showBadge(nodeId, `${event.data.outputs.length} branches`);
    }
}
```

### 4. Estadísticas de Ejecución

```javascript
function showExecutionStats(stats) {
    const statsPanel = document.getElementById('execution-stats');
    
    statsPanel.innerHTML = `
        <div>Nodos ejecutados: ${stats.nodeCount}</div>
        <div>Outputs emitidos: ${stats.outputsEmitted}</div>
        <div>Nodos filtrados: ${stats.filteredNodes}</div>
        <div>Errores: ${stats.erroredNodes}</div>
        <div>Duración: ${stats.durationMs}ms</div>
    `;
}
```

### 5. Debug de Payloads

```javascript
function showPayloadPreview(event) {
    if (event.event === 'node:input' && event.data.input) {
        const preview = event.data.input.payload.preview;
        showPayloadTooltip(event.nodeId, preview);
    } else if (event.event === 'node:output' && event.data.outputs.length > 0) {
        const preview = event.data.outputs[0].payload.preview;
        showPayloadTooltip(event.nodeId, preview);
    }
}
```

---

## Mejores Prácticas

### 1. Manejo de Errores

```javascript
observabilityWS.onmessage = (e) => {
    try {
        const event = JSON.parse(e.data);
        handleObservabilityEvent(event);
    } catch (err) {
        console.error('Error procesando evento:', err, e.data);
        // No romper la aplicación
    }
};
```

### 2. Limpieza de Recursos

```javascript
// Limpiar frames antiguos periódicamente
setInterval(() => {
    const now = Date.now();
    activeFrames.forEach((frame, frameId) => {
        // Eliminar frames más antiguos de 30 segundos
        if (now - frame.startedAt > 30000) {
            activeFrames.delete(frameId);
            clearFrameAnimations(frameId);
        }
    });
}, 5000);
```

### 3. Throttling de Actualizaciones UI

```javascript
// Evitar actualizar UI demasiado rápido
let lastUpdate = 0;
const UPDATE_THROTTLE = 16; // ~60fps

function throttledUpdateUI() {
    const now = Date.now();
    if (now - lastUpdate < UPDATE_THROTTLE) {
        requestAnimationFrame(throttledUpdateUI);
        return;
    }
    lastUpdate = now;
    updateUI();
}
```

### 4. Manejo de Reconexión

```javascript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function reconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Máximo de intentos de reconexión alcanzado');
        return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    setTimeout(() => {
        console.log(`Reintentando conexión (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        connect();
    }, delay);
}
```

### 5. Filtrado de Eventos

```javascript
// Solo procesar eventos de frames activos
function handleObservabilityEvent(event) {
    if (event.frameId && !activeFrames.has(event.frameId)) {
        // Frame no está siendo rastreado, ignorar
        return;
    }
    
    // Procesar evento
    switch (event.event) {
        // ...
    }
}
```

### 6. Performance: Usar Web Workers

```javascript
// Para procesamiento pesado de eventos
const worker = new Worker('observability-worker.js');

worker.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === 'processed-event') {
        updateUI(data);
    }
};

observabilityWS.onmessage = (e) => {
    // Enviar a worker para procesamiento
    worker.postMessage({ type: 'process-event', data: e.data });
};
```

---

## Estructura de Datos Completa

### IOEvent

```typescript
interface IOEvent {
    direction: "input" | "output";
    port?: number;              // Para outputs: índice del puerto (0, 1, 2...)
    timestamp: number;
    payload: {
        preview?: any;           // Preview truncado y seguro
        type: string;            // "object" | "string" | "number" | "array" | "null"
        size?: number;           // Tamaño aproximado en bytes
        truncated: boolean;      // Si el payload fue truncado
    };
}
```

### NodeExecutionData

```typescript
interface NodeExecutionData {
    nodeId: string;
    nodeType: string;
    input?: IOEvent;
    outputs: IOEvent[];
    semantics: {
        role: "trigger" | "transform" | "filter" | "generator" | "sink";
        behavior: "pass-through" | "transformed" | "filtered" | "bifurcated" | "terminated";
    };
    timing: {
        receivedAt?: number;
        sentAt?: number;
        durationMs?: number;
    };
    errors?: {
        message: string;
        code?: string;
    };
}
```

### FrameStats

```typescript
interface FrameStats {
    nodeCount: number;          // Nodos que participaron
    outputsEmitted: number;     // Total de outputs
    filteredNodes: number;      // Nodos que filtraron
    erroredNodes: number;        // Nodos con errores
    durationMs?: number;         // Duración total
}
```

---

## Ejemplo Completo de Integración

```javascript
// observability-integration.js
class FlowObservability {
    constructor(config) {
        this.config = config;
        this.ws = null;
        this.frames = new Map();
        this.nodeStates = new Map();
        this.isConnected = false;
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${this.config.host}:${this.config.port}/observability`;
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
            this.isConnected = true;
            this.onConnected?.();
        };
        
        this.ws.onmessage = (e) => {
            const event = JSON.parse(e.data);
            this.handleEvent(event);
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            this.onDisconnected?.();
            setTimeout(() => this.connect(), 2000);
        };
    }
    
    handleEvent(event) {
        switch (event.event) {
            case 'frame:start':
                this.handleFrameStart(event);
                break;
            case 'node:input':
                this.handleNodeInput(event);
                break;
            case 'node:output':
                this.handleNodeOutput(event);
                break;
            case 'frame:end':
                this.handleFrameEnd(event);
                break;
        }
    }
    
    handleFrameStart(event) {
        const frame = {
            id: event.frameId,
            triggerNodeId: event.data.triggerNodeId,
            startedAt: event.data.startedAt,
            nodes: new Map()
        };
        
        this.frames.set(event.frameId, frame);
        
        // Resaltar nodo trigger
        if (frame.triggerNodeId) {
            this.highlightNode(frame.triggerNodeId, 'trigger');
        }
        
        this.onFrameStart?.(event, frame);
    }
    
    handleNodeInput(event) {
        const { frameId, nodeId, data } = event;
        const frame = this.frames.get(frameId);
        
        if (!frame) return;
        
        // Actualizar estado del nodo
        const nodeState = this.nodeStates.get(nodeId) || {};
        nodeState.status = 'processing';
        nodeState.lastInput = data.input;
        this.nodeStates.set(nodeId, nodeState);
        
        // Animar edge entrante
        this.animateIncomingEdges(nodeId, data.input.timestamp);
        
        // Actualizar UI
        this.updateNodeUI(nodeId, nodeState);
        
        this.onNodeInput?.(event, frame);
    }
    
    handleNodeOutput(event) {
        const { frameId, nodeId, data } = event;
        const frame = this.frames.get(frameId);
        
        if (!frame) return;
        
        // Actualizar estado del nodo
        const nodeState = this.nodeStates.get(nodeId) || {};
        nodeState.status = 'completed';
        nodeState.outputs = data.outputs;
        nodeState.semantics = data.semantics;
        nodeState.timing = data.timing;
        this.nodeStates.set(nodeId, nodeState);
        
        // Animar edges salientes
        data.outputs.forEach(output => {
            this.animateOutgoingEdges(nodeId, output.port, output.timestamp);
        });
        
        // Actualizar UI con semantics
        this.updateNodeSemantics(nodeId, data.semantics);
        this.updateNodeUI(nodeId, nodeState);
        
        this.onNodeOutput?.(event, frame);
    }
    
    handleFrameEnd(event) {
        const { frameId, data } = event;
        const frame = this.frames.get(frameId);
        
        // Mostrar estadísticas
        this.showStats(data.stats);
        
        // Limpiar después de delay
        setTimeout(() => {
            this.clearFrame(frameId);
        }, 3000);
        
        this.onFrameEnd?.(event, frame, data.stats);
    }
    
    // Métodos de UI (implementar según tu framework)
    highlightNode(nodeId, type) {
        // Implementar según tu UI
    }
    
    animateIncomingEdges(nodeId, timestamp) {
        // Implementar según tu UI
    }
    
    animateOutgoingEdges(nodeId, port, timestamp) {
        // Implementar según tu UI
    }
    
    updateNodeSemantics(nodeId, semantics) {
        // Implementar según tu UI
    }
    
    updateNodeUI(nodeId, state) {
        // Implementar según tu UI
    }
    
    showStats(stats) {
        // Implementar según tu UI
    }
    
    clearFrame(frameId) {
        const frame = this.frames.get(frameId);
        if (frame) {
            frame.nodes.forEach((_, nodeId) => {
                this.nodeStates.delete(nodeId);
            });
        }
        this.frames.delete(frameId);
    }
}

// Uso
const flowObs = new FlowObservability({
    host: 'localhost',
    port: '1880'
});

flowObs.onFrameStart = (event, frame) => {
    console.log('🚀 Frame iniciado:', frame.id);
};

flowObs.onNodeInput = (event, frame) => {
    console.log('📥 Input:', event.nodeId);
};

flowObs.onNodeOutput = (event, frame) => {
    console.log('📤 Output:', event.nodeId, event.data.semantics);
};

flowObs.onFrameEnd = (event, frame, stats) => {
    console.log('🏁 Frame terminado:', stats);
};

flowObs.connect();
```

---

## Troubleshooting

### No recibo eventos

1. Verifica que el plugin esté habilitado en `settings.js`:
   ```javascript
   observability: { enabled: true }
   ```

2. Verifica la conexión WebSocket:
   ```javascript
   ws.onerror = (err) => console.error('WS Error:', err);
   ws.onclose = (e) => console.log('WS Closed:', e.code, e.reason);
   ```

3. Verifica los logs de Node-RED para ver si se están emitiendo eventos

### Eventos llegan pero la UI no se actualiza

1. Verifica que los handlers estén correctamente conectados
2. Usa `console.log` para debuggear el flujo de eventos
3. Verifica que los selectores de DOM sean correctos

### Performance issues

1. Limita el número de frames en memoria
2. Usa throttling para actualizaciones UI
3. Considera usar Web Workers para procesamiento pesado
4. Limpia frames antiguos periódicamente

---

## Recursos Adicionales

- **Plugin Repository**: `c:\code\node-red-runtime-observability`
- **WebSocket Endpoint**: `ws://localhost:1880/observability`
- **Documentación del Plugin**: Ver `README.md` en el repositorio del plugin

---

## Conclusión

Con esta integración puedes:

✅ Visualizar ejecuciones en tiempo real  
✅ Animar edges con timestamps precisos  
✅ Mostrar semantics (roles y behaviors)  
✅ Detectar nodos filtrados y bifurcaciones  
✅ Mostrar timing por nodo  
✅ Mostrar estadísticas de ejecución  

El Execution Contract v1 proporciona toda la información necesaria para construir una UI rica y visual de la ejecución de Node-RED.

