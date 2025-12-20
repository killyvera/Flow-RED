# Notas sobre el Mapeo de Node-RED a React Flow

## Estructura de Mapeo

### Nodos Node-RED → Nodos React Flow

```typescript
Node-RED Node {
  id: string           → React Flow Node.id (preservado exactamente)
  x: number            → React Flow Node.position.x
  y: number            → React Flow Node.position.y
  type: string         → React Flow Node.data.nodeRedType (preservado)
  name?: string        → React Flow Node.data.label (o type si no hay name)
  z: string            → React Flow Node.data.flowId (preservado)
}
```

**Tipo de nodo React Flow**: Todos los nodos se renderizan como tipo `"baseNode"` (custom node moderno estilo Flowise/n8n). Los custom node types específicos por tipo de Node-RED vendrán en futuras implementaciones.

### Wires Node-RED → Edges React Flow

```typescript
Node-RED wires: string[][]  → React Flow Edges[]

Ejemplo:
wires: [["target1", "target2"], ["target3"]]

Se convierte en:
- Edge 1: source=nodeId, target=target1, sourceHandle="output-0", targetHandle="input"
- Edge 2: source=nodeId, target=target2, sourceHandle="output-0", targetHandle="input"
- Edge 3: source=nodeId, target=target3, sourceHandle="output-1", targetHandle="input"
```

**Handles**:
- **Output ports**: `output-0`, `output-1`, `output-2`, etc. (basado en el índice del array de wires)
- **Input ports**: `input` (único por ahora, se puede extender en el futuro)

## Limitaciones Conocidas

### 1. Puertos de Entrada
- Node-RED no expone explícitamente información sobre múltiples puertos de entrada
- Por ahora asumimos un único puerto de entrada (`input`)
- En el futuro se puede mejorar analizando los tipos de nodos

### 2. Tipos de Nodos
- Todos los nodos se renderizan como tipo `"default"` de React Flow
- Los custom node types específicos de Node-RED vendrán en futuras implementaciones
- La información del tipo original se preserva en `data.nodeRedType`

### 3. Grupos
- Los grupos de Node-RED (agrupaciones visuales) no se mapean actualmente
- Se pueden añadir en el futuro usando grupos de React Flow

### 4. Subflows
- Los subflows se renderizan como nodos normales por ahora
- No se expanden para mostrar su contenido interno
- La expansión de subflows es una funcionalidad futura

### 5. Link Nodes
- Los nodos "link in" y "link out" conectan nodos entre diferentes flows
- Actualmente no se manejan correctamente ya que solo visualizamos un flow a la vez
- Requieren lógica especial para mapear conexiones entre flows

### 6. Config Nodes
- Los nodos de configuración (como "mqtt-broker", "http-request") no se renderizan en el canvas
- Son filtrados automáticamente ya que no tienen posición (x, y)

### 7. Múltiples Flows (Tabs)
- Se soporta visualizar un flow a la vez
- Hay un selector para cambiar entre flows
- Los nodos se filtran por `z === flowId`

### 8. Validación de Edges
- Los edges se validan para asegurar que tanto source como target existen
- Esto previene edges rotos que apunten a nodos de otros flows o nodos no renderizados

## Ejemplo de Transformación

### Input (Node-RED)
```json
{
  "id": "abc123",
  "type": "inject",
  "x": 100,
  "y": 200,
  "z": "flow1",
  "name": "Trigger",
  "wires": [["def456"]]
}
```

### Output (React Flow Node)
```json
{
  "id": "abc123",
  "type": "default",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "Trigger",
    "nodeRedType": "inject",
    "flowId": "flow1",
    "nodeRedNode": {
      "id": "abc123",
      "type": "inject",
      "name": "Trigger",
      "z": "flow1"
    }
  }
}
```

### Output (React Flow Edge)
```json
{
  "id": "abc123-0-def456-0",
  "source": "abc123",
  "target": "def456",
  "sourceHandle": "output-0",
  "targetHandle": "input",
  "type": "default"
}
```

## Próximas Mejoras

1. **Custom Node Types**: Renderizar nodos con estilos específicos según su tipo
2. **Múltiples Input Ports**: Detectar y mapear múltiples puertos de entrada
3. **Grupos**: Visualizar grupos de Node-RED
4. **Subflows Expandibles**: Permitir expandir subflows para ver su contenido
5. **Link Nodes**: Manejar correctamente conexiones entre flows
6. **Validación Mejorada**: Validar que todos los edges sean válidos antes de renderizar

