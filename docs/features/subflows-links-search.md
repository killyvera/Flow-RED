# Subflows, Link Nodes y Search - Documentación

Este documento describe las funcionalidades de paridad implementadas: Subflows, Link Nodes y Search/Jump.

## Tabla de Contenidos

1. [Subflows](#subflows)
2. [Link Nodes](#link-nodes)
3. [Search y Jump](#search-y-jump)

## Subflows

Los subflows son flows reutilizables que se pueden usar como nodos en otros flows. En Node-RED, un subflow tiene una definición (type: 'subflow') y múltiples instancias (type: 'subflow:ID').

### Representación Visual

- **Subflows como nodos colapsados**: Las instancias de subflow se renderizan como nodos especiales en el canvas principal
- **Componente SubflowNode**: Renderiza subflows con:
  - Header con icono de workflow
  - Nombre del subflow
  - Información de entradas/salidas
  - Indicador visual de que es un subflow

### Navegación

- **Doble clic**: Al hacer doble clic en un nodo de subflow, se navega a su contenido
- **Menú contextual**: Opción "Abrir subflow" disponible en el menú contextual
- **Breadcrumb**: Barra de navegación que muestra la ruta de navegación:
  - Muestra: Flow Principal > Subflow 1 > Subflow 2...
  - Permite navegar a cualquier nivel del breadcrumb
  - Botón "Volver" para regresar al nivel anterior

### Implementación Técnica

#### Tipos

```typescript
// Definición de subflow
interface NodeRedSubflowDefinition {
  type: 'subflow'
  name: string
  in?: Array<{ x: number; y: number; wires: Array<{ id: string }> }>
  out?: Array<{ x: number; y: number; wires: Array<{ id: string; port?: number }> }>
  // ...
}

// Instancia de subflow
interface NodeRedSubflowInstance {
  type: string // 'subflow:ID'
  name?: string
  subflowId?: string
}
```

#### Detección

- `isSubflowDefinition(node)`: Verifica si un nodo es una definición de subflow
- `isSubflowInstance(node)`: Verifica si un nodo es una instancia de subflow
- `extractSubflowIdFromType(type)`: Extrae el ID del subflow desde el tipo

#### Mapeo

El mapeo de Node-RED a React Flow incluye:
- Detección automática de instancias de subflow
- Asociación de definiciones de subflow con sus instancias
- Preservación de todas las propiedades originales

## Link Nodes

Los link nodes permiten conectar nodos que no están directamente conectados por wires. Un `link out` envía mensajes a uno o más `link in` nodes.

### Tipos de Link Nodes

1. **Link In**: Recibe mensajes de `link out` nodes
2. **Link Out**: Envía mensajes a `link in` nodes
3. **Link Call**: Llama a un `link in` por nombre

### Visualización

- **Indicador de portal**: Los nodos link muestran un badge con icono de link en el header
- **Tooltip**: Muestra información sobre el tipo de link (in/out)
- **Color distintivo**: Los link nodes tienen un estilo visual distintivo

### Navegación Rápida

- **Menú contextual**: Cuando se hace clic derecho en un link node:
  - Si es `link in`: Muestra opciones para navegar a los `link out` conectados
  - Si es `link out`: Muestra opciones para navegar a los `link in` conectados
  - Máximo 5 opciones de navegación en el menú
- **Jump automático**: Al seleccionar una opción, se centra y resalta el nodo destino

### Implementación Técnica

#### Detección de Relaciones

```typescript
// Encontrar link out conectados a un link in
findLinkOutTargets(linkInNode, allNodes): NodeRedNode[]

// Encontrar link in conectados a un link out
findLinkInTargets(linkOutNode, allNodes): NodeRedNode[]
```

#### Propiedad `links`

Los link nodes tienen una propiedad `links` que puede ser:
- Array de IDs: `['link-out-1', 'link-out-2']`
- String separado por comas: `'link-out-1,link-out-2'`
- Nombre del link: `'MyLink'` (busca por nombre)

## Search y Jump

Sistema de búsqueda rápida de nodos con navegación directa.

### Atajo de Teclado

- **Ctrl+K** (Windows/Linux) o **Cmd+K** (Mac): Abre el modal de búsqueda
- Funciona desde cualquier parte del canvas (excepto cuando se está escribiendo en inputs)

### Funcionalidades

#### Búsqueda

- **Por nombre**: Busca en el nombre/label del nodo
- **Por tipo**: Busca en el tipo de nodo (ej: "inject", "function")
- **Por ID**: Busca en el ID del nodo (primeros 8 caracteres visibles)

#### Resultados

- **Ordenamiento inteligente**:
  1. Coincidencias por nombre (prioridad)
  2. Coincidencias por tipo
  3. Coincidencias por ID
- **Límite**: Máximo 20 resultados
- **Resaltado**: El texto coincidente se resalta en los resultados

#### Navegación

- **Teclado**:
  - `↑` / `↓`: Navegar entre resultados
  - `Enter`: Seleccionar resultado y saltar al nodo
  - `Esc`: Cerrar búsqueda
- **Mouse**: Click en cualquier resultado para saltar al nodo

#### Jump to Node

Cuando se selecciona un resultado:
1. **Centrar**: El canvas se centra en el nodo seleccionado
2. **Seleccionar**: El nodo se selecciona automáticamente
3. **Resaltar**: Animación de pulso durante 2 segundos para indicar visualmente el nodo

### Implementación Técnica

```typescript
// Función jump to node
const jumpToNode = (nodeId: string) => {
  // 1. Centrar canvas en el nodo
  reactFlowInstance.setCenter(node.position.x, node.position.y, {
    zoom: 1,
    duration: 300,
  })
  
  // 2. Seleccionar el nodo
  // 3. Agregar animación de pulso
}
```

## Flujos de Usuario

### Abrir un Subflow

1. Usuario hace doble clic en un nodo de subflow
2. Se agrega el subflow al breadcrumb
3. Se carga el contenido del subflow (TODO: implementar carga real)
4. El breadcrumb muestra la ruta de navegación

### Navegar entre Link Nodes

1. Usuario hace clic derecho en un `link in` node
2. El menú contextual muestra opciones "Ir a [nombre del link out]"
3. Usuario selecciona una opción
4. El canvas se centra y resalta el nodo `link out` correspondiente

### Buscar y Saltar a un Nodo

1. Usuario presiona `Ctrl+K` (o `Cmd+K` en Mac)
2. Se abre el modal de búsqueda
3. Usuario escribe el nombre/tipo/ID del nodo
4. Los resultados se filtran en tiempo real
5. Usuario navega con flechas o hace click en un resultado
6. El canvas se centra y resalta el nodo seleccionado

## Consideraciones de Implementación

### Preservación de Datos

- **IDs de Node-RED**: Se preservan exactamente como vienen de Node-RED
- **Propiedades desconocidas**: Todas las propiedades se preservan en `nodeRedNode`
- **Mapeo reversible**: El mapeo Node-RED ↔ React Flow es completamente reversible

### UI Consistente

- **Theme tokens**: Todos los componentes usan variables CSS del tema
- **Paneles/Modales**: Componentes consistentes con el resto de la aplicación
- **Minimal clutter**: La UI se mantiene limpia, usando modales y paneles cuando es necesario

### Limitaciones Actuales

- **Navegación de subflows**: La navegación real al contenido del subflow está marcada como TODO
  - Actualmente solo se actualiza el breadcrumb
  - Se necesita implementar la carga y renderizado del contenido del subflow
- **Link call nodes**: Los nodos `link call` no tienen navegación implementada aún
- **Búsqueda avanzada**: No hay filtros por tipo, estado, etc. (solo búsqueda de texto)

## Mejoras Futuras

- [ ] Implementar navegación real al contenido de subflows
- [ ] Agregar navegación para `link call` nodes
- [ ] Búsqueda avanzada con filtros (tipo, estado, grupo)
- [ ] Historial de navegación (volver/adelante)
- [ ] Búsqueda en propiedades de nodos (no solo nombre/tipo/ID)
- [ ] Indicadores visuales más prominentes para link nodes
- [ ] Visualización de conexiones link en el canvas (líneas punteadas)

