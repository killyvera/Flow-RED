# Node-RED Visual Editor

Editor visual moderno para Node-RED construido con React, React Flow, TypeScript y Tailwind CSS.

## Características

- 🎨 Interfaz visual moderna y limpia
- 🔄 Cliente standalone que se conecta a Node-RED headless
- ⚡ Construido con Vite para desarrollo rápido
- 🎯 TypeScript para type safety
- 🎨 Tailwind CSS para estilos
- 📦 Zustand para gestión de estado
- 📊 Sistema de logging con `debug` (activar/desactivar fácilmente)

## Requisitos

- Node.js >= 18.5
- npm o yarn
- Node-RED corriendo (ver configuración abajo)

## Instalación

```bash
cd editor-frontend
npm install
```

## Configuración

1. Copia `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

2. Edita `.env.local` y configura la URL de Node-RED:
```
VITE_NODE_RED_URL=http://localhost:1880
```

3. (Opcional) Activa el sistema de logging:
```
VITE_DEBUG=editor-frontend:*
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne).

## Crear Flow de Ejemplo

Si Node-RED no tiene flows configurados, puedes crear uno de ejemplo:

```bash
npm run create-sample-flow
```

Esto creará un flow simple con nodos inject, function y debug para probar el editor.

## Sistema de Logging

El proyecto usa la librería `debug` para logging. Ver [LOGGING.md](./LOGGING.md) para más detalles.

### Activar logs

Edita `.env.local`:
```
VITE_DEBUG=editor-frontend:*
```

O desde la consola del navegador:
```javascript
localStorage.setItem('debug', 'editor-frontend:*')
location.reload()
```

### Desactivar logs

Elimina `VITE_DEBUG` de `.env.local` o ejecuta en la consola:
```javascript
localStorage.removeItem('debug')
location.reload()
```

## Build

```bash
npm run build
```

Los archivos compilados estarán en `dist/`.

## Estructura del Proyecto

```
src/
├── api/          # Cliente API para Node-RED
├── canvas/       # Componentes de React Flow y mappers
├── state/        # Stores de Zustand
├── theme/        # Tokens visuales y configuración
├── pages/        # Páginas de la aplicación
├── components/   # Componentes reutilizables
├── utils/        # Utilidades (logger, etc.)
├── App.tsx       # Componente raíz
└── main.tsx      # Punto de entrada
```

## Configuración de Node-RED

Para ejecutar Node-RED en modo headless (solo API, sin UI), ver [NODE_RED_HEADLESS_SETUP.md](./NODE_RED_HEADLESS_SETUP.md).

## Estado de Implementación

### ✅ Funcionalidades Completadas

El editor visual ha completado todos los 8 prompts principales de desarrollo:

1. **✅ Bootstrap del Producto** - Estructura base, React Flow, Tailwind, Zustand
2. **✅ Node-RED ↔ React Flow Mapping** - Mapeo bidireccional completo
3. **✅ Visual Style (Flowise/n8n-like)** - Diseño moderno y limpio
4. **✅ Edición Visual Controlada** - Drag, connect, deploy funcional
5. **✅ Node Inspector (Sidebar Moderna)** - Editor de propiedades dinámico
6. **✅ Flow Tabs, Groups & Zones** - Múltiples flows y agrupación visual
7. **✅ Realtime State & Events** - WebSocket, estados en tiempo real, animaciones
8. **✅ Theming, Dark Mode & Branding** - Sistema de temas completo

### Características Principales

- 🎨 **Interfaz Moderna:** Estilo similar a Flowise/n8n con diseño limpio
- 🔄 **Edición Visual:** Arrastrar nodos, crear conexiones, deploy a Node-RED
- 📊 **Tiempo Real:** Estados de runtime, animaciones en edges, logs de ejecución
- 🎯 **Grupos Visuales:** Agrupar nodos, colapsar/expandir, personalizar colores
- 🎨 **Sistema de Temas:** Light/Dark mode, temas personalizables, accesibilidad
- 🔍 **Inspector de Nodos:** Panel de propiedades dinámico con tabs (Configuración/Estado)
- 📋 **Paleta de Nodos:** Búsqueda, categorías, drag & drop
- ⌨️ **Atajos de Teclado:** Copy/Paste, Delete, shortcuts

### Ver Detalles Completos

Para un informe detallado del estado de implementación, ver [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).

## Licencia

Apache-2.0
