# Auto-carga de Plugins en Node-RED

Este documento explica cómo configurar Node-RED para que cargue automáticamente los plugins de Redflow al iniciar.

## Método 1: Usar settings.redflow.js (Recomendado)

### Paso 1: Usar el archivo de configuración incluido

El proyecto incluye `settings.redflow.js` que ya está configurado para cargar automáticamente todos los plugins.

### Paso 2: Iniciar Node-RED con este archivo

```bash
node-red --settings ./settings.redflow.js
```

### Paso 3: Verificar que los plugins se cargaron

Busca en los logs de Node-RED estas líneas:

```
[info] [agent-core] Plugin loaded successfully
[info] [runtime-observability] Plugin loaded successfully
```

## Método 2: Modificar tu settings.js existente

Si ya tienes un archivo `settings.js` en `~/.node-red/`, agrégale esta configuración:

```javascript
module.exports = {
    // ... tus otras configuraciones ...
    
    // Auto-cargar plugins desde el proyecto Redflow
    nodesDir: [
        '/ruta/completa/a/editor-frontend/plugins/node-red-runtime-observability',
        '/ruta/completa/a/editor-frontend/plugins/agent-core'
    ],
    
    // Configuración del plugin de observabilidad
    observability: {
        enabled: true,
        websocket: {
            port: 3001,
            path: '/observability'
        }
    },
    
    // Configuración del plugin agent-core
    agentCore: {
        enabled: true,
        maxIterations: 5,
        debug: false
    }
}
```

**Reemplaza** `/ruta/completa/a/editor-frontend` con la ruta real al proyecto.

## Método 3: Script de Configuración Automática

Puedes usar el script de setup incluido:

```bash
npm run setup:node-red
```

Este script:
1. Detecta tu directorio de Node-RED
2. Crea o actualiza tu `settings.js`
3. Agrega las rutas correctas a los plugins
4. Configura los plugins automáticamente

## Verificar que funcionó

### 1. Verificar plugins cargados

```bash
curl http://localhost:1880/nodes
```

Busca en la respuesta:
- `"type": "agent-core"`
- `"module": "node-red-agent-core"`

### 2. Verificar observabilidad

```bash
curl http://localhost:3001/observability/health
```

Debería responder con el estado del plugin.

### 3. Desde el frontend Redflow

1. Abre la Paleta de Nodos
2. Busca "Agent Core" en la categoría correspondiente
3. Debería aparecer disponible para usar

## Estructura de Plugins

```
editor-frontend/
├── plugins/
│   ├── node-red-runtime-observability/
│   │   ├── index.js                 # Auto-cargado por Node-RED
│   │   └── package.json
│   └── agent-core/
│       ├── index.js                 # Auto-cargado por Node-RED
│       └── package.json
└── settings.redflow.js              # Configuración que referencia los plugins
```

## Configuración de nodesDir

La directiva `nodesDir` le dice a Node-RED dónde buscar nodos adicionales:

```javascript
nodesDir: [
    '/ruta/absoluta/al/plugin1',
    '/ruta/absoluta/al/plugin2'
]
```

**Importante:**
- Usa rutas **absolutas**, no relativas
- Apunta al **directorio que contiene index.js**, no al index.js mismo
- Cada plugin debe tener su propio `package.json` con el campo `node-red`

## Troubleshooting

### Los plugins no se cargan

1. **Verifica la ruta en nodesDir:**
   ```javascript
   console.log(require('path').join(__dirname, 'plugins', 'agent-core'))
   ```

2. **Verifica que package.json tenga la sección node-red:**
   ```json
   {
     "node-red": {
       "nodes": {
         "agent-core": "index.js"
       }
     }
   }
   ```

3. **Revisa los logs de Node-RED:**
   ```bash
   node-red --settings ./settings.redflow.js --verbose
   ```

### Error: Cannot find module

Si ves errores de módulos faltantes:

```bash
# En cada carpeta de plugin
cd plugins/agent-core
npm install

cd ../node-red-runtime-observability
npm install
```

### Puerto 3001 ocupado

Si el puerto de observabilidad está en uso:

```javascript
observability: {
    websocket: {
        port: 3002,  // Cambia a otro puerto
        path: '/observability'
    }
}
```

Y actualiza el frontend en `.env.local`:
```
VITE_OBSERVABILITY_WS_PORT=3002
```

## Alternativas

### Instalación global (no recomendado para desarrollo)

```bash
cd plugins/agent-core
npm link

cd ~/.node-red
npm link node-red-agent-core
```

### Instalación local (no recomendado para desarrollo)

```bash
cd ~/.node-red
npm install /ruta/completa/a/editor-frontend/plugins/agent-core
```

## Scripts de NPM

Agrega estos scripts a `package.json` para facilitar el uso:

```json
{
  "scripts": {
    "start:node-red": "node-red --settings ./settings.redflow.js",
    "start:node-red:verbose": "node-red --settings ./settings.redflow.js --verbose",
    "setup:node-red": "node scripts/setup-node-red.js"
  }
}
```

## Siguiente Paso

Una vez configurado, inicia Node-RED y el frontend simultáneamente:

```bash
# Terminal 1: Node-RED
npm run start:node-red

# Terminal 2: Redflow Frontend
npm run dev
```

Luego abre `http://localhost:5173` y deberías ver los plugins disponibles en la paleta de nodos.

