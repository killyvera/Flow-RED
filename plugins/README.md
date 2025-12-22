# Plugins

Esta carpeta contiene plugins, nodos personalizados y extensiones para el editor de Node-RED.

## Estructura

Cada plugin debe estar en su propia subcarpeta con el siguiente nombre: `nombre-del-plugin`.

## Plugins incluidos

### node-red-runtime-observability

Plugin de observabilidad en tiempo de ejecución para Node-RED. Captura Input/Output por nodo sin modificar el core de Node-RED.

**Características:**
- Captura de datos de entrada y salida por nodo
- WebSocket para comunicación en tiempo real
- Integración con el frontend del editor

**Uso:**
Este plugin se carga automáticamente cuando Node-RED está en ejecución y proporciona datos de observabilidad al frontend.

## Agregar nuevos plugins

Para agregar un nuevo plugin:

1. Crea una carpeta con el nombre del plugin dentro de `plugins/`
2. Copia los archivos del plugin a esa carpeta
3. Asegúrate de que el plugin tenga un `package.json` válido
4. Documenta el plugin en este README

## Notas

- Los plugins deben ser compatibles con Node-RED >= 3.0.0
- Los plugins deben seguir las convenciones de Node-RED para plugins
- Evita incluir archivos de git (`.git`, `node_modules`, etc.) al copiar plugins

