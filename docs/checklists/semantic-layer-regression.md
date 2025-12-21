# Semantic Layer Regression Checklist

**Fecha:** 2025-01-20  
**Versión:** 1.0

Este checklist verifica que las funcionalidades existentes no se hayan roto después de implementar la capa semántica (Execution Frames, Semantic Summaries, Explain Mode, Polish).

## Funcionalidades Core

### Render Flows
- [ ] Los flows se cargan correctamente desde Node-RED
- [ ] Los nodos se renderizan en sus posiciones correctas
- [ ] Los edges (conexiones) se muestran correctamente
- [ ] Los grupos se renderizan con sus estilos correctos
- [ ] El canvas se puede hacer zoom y pan sin problemas

### Edit & Deploy
- [ ] Se pueden mover nodos arrastrándolos
- [ ] Se pueden crear conexiones entre nodos
- [ ] Se pueden eliminar conexiones
- [ ] El botón "Save & Deploy" guarda correctamente
- [ ] Los cambios se reflejan en Node-RED después de guardar
- [ ] No se pierden propiedades de nodos al guardar

### WebSocket Online/Offline
- [ ] WebSocket se conecta correctamente cuando Node-RED está disponible
- [ ] WebSocket maneja desconexión gracefully (sin errores en consola)
- [ ] WebSocket se reconecta automáticamente con backoff exponencial
- [ ] Los estados de runtime se actualizan cuando WebSocket está conectado
- [ ] La UI no se bloquea cuando WebSocket está desconectado
- [ ] El indicador de conexión WebSocket funciona correctamente

### Themes
- [ ] El toggle de dark/light mode funciona
- [ ] Los colores del tema se aplican correctamente
- [ ] Los nodos usan colores del tema (no hardcoded)
- [ ] Los edges usan colores del tema
- [ ] Los grupos usan colores del tema
- [ ] El tema se persiste en localStorage

### Groups
- [ ] Se pueden crear grupos desde el menú contextual
- [ ] Se pueden asignar nodos a grupos
- [ ] Se pueden remover nodos de grupos
- [ ] Se pueden editar propiedades de grupos (nombre, color)
- [ ] Se pueden colapsar/expandir grupos
- [ ] Los nodos se ocultan/muestran correctamente al colapsar/expandir
- [ ] Se pueden duplicar grupos
- [ ] Se pueden eliminar grupos

### Inspector Edits
- [ ] El panel de propiedades se abre al seleccionar un nodo
- [ ] Se pueden editar propiedades de nodos en modo edición
- [ ] Los cambios se reflejan en el nodo inmediatamente
- [ ] El panel de propiedades muestra la pestaña "Configuración" en modo edición
- [ ] El panel de propiedades muestra la pestaña "Estado" siempre
- [ ] Se pueden editar propiedades de grupos

## Funcionalidades de Capa Semántica

### Execution Frames
- [ ] Los frames se crean automáticamente cuando hay trigger nodes
- [ ] Los frames se crean manualmente con el botón "Start Capture"
- [ ] Los frames se cierran automáticamente después de 5 segundos de inactividad
- [ ] Los frames se cierran manualmente con el botón "Stop Capture"
- [ ] El ExecutionBar muestra el estado correcto (Recording/Idle)
- [ ] El ExecutionBar muestra estadísticas del frame actual/último
- [ ] El toggle Enable/Disable funciona correctamente
- [ ] Se mantienen máximo 20 frames en el historial
- [ ] Se mantienen máximo 50 snapshots por nodo

### Semantic Summaries
- [ ] Los resúmenes se generan correctamente para diferentes tipos de nodos
- [ ] Los resúmenes se muestran en las tarjetas de nodos (BaseNode)
- [ ] Los resúmenes se muestran en el inspector (NodePropertiesPanel)
- [ ] Los badges de severidad muestran el color correcto
- [ ] Los tooltips en badges funcionan correctamente
- [ ] Los payloads se truncan correctamente (max 100 caracteres)
- [ ] Los resúmenes se actualizan cuando cambia el estado de runtime

### Explain Mode
- [ ] El toggle Explain Mode funciona correctamente
- [ ] Los overlays de explicación se muestran en los nodos cuando Explain Mode está activo
- [ ] Los labels "passes msg" se muestran en edges en hover cuando Explain Mode está activo
- [ ] El inspector muestra vista amigable cuando Explain Mode está activo
- [ ] El ExplainModeStepper aparece cuando Explain Mode está activo
- [ ] La navegación Next/Previous funciona correctamente
- [ ] La navegación con teclado (flechas) funciona
- [ ] El botón Exit funciona correctamente
- [ ] El orden de ejecución se calcula correctamente (BFS desde triggers)

### Polish (Naming, Microinteractions, Performance)
- [ ] "Último Payload" se muestra como "Output Data"
- [ ] "Guardar" se muestra como "Save & Deploy"
- [ ] Los tooltips mantienen términos técnicos para usuarios avanzados
- [ ] Los empty states muestran mensajes amigables
- [ ] Los safe fallbacks funcionan ("No preview available", "Unknown node type")
- [ ] La memoización funciona correctamente (no hay renders innecesarios)
- [ ] El truncation de payloads funciona en todos los lugares
- [ ] Los caps de frames y snapshots se respetan

## Casos Especiales

### Edge Cases
- [ ] Flows sin nodos se renderizan correctamente
- [ ] Flows sin edges se renderizan correctamente
- [ ] Nodos desconocidos/personalizados funcionan correctamente
- [ ] Nodos sin propiedades editables muestran mensaje apropiado
- [ ] Nodos sin conexiones muestran información correcta
- [ ] Flows muy grandes (100+ nodos) se renderizan sin problemas de performance

### Integración
- [ ] Execution Frames + Semantic Summaries funcionan juntos
- [ ] Explain Mode + Semantic Summaries funcionan juntos
- [ ] Execution Frames + Explain Mode funcionan juntos
- [ ] Todos los modos funcionan con grupos
- [ ] Todos los modos funcionan con temas

## Notas

- Este checklist debe ejecutarse después de cada cambio significativo en la capa semántica
- Marcar cada item como completado después de verificar manualmente
- Si un item falla, documentar el problema y crear un issue

