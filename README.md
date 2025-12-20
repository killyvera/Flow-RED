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

## Próximos Pasos

- [ ] Integración con API de Node-RED para cargar flows ✅
- [ ] Renderizado de nodos de Node-RED como custom nodes
- [ ] Sistema de paleta de nodos
- [ ] Editor de propiedades de nodos
- [ ] Guardado de flows modificados

## Licencia

Apache-2.0
