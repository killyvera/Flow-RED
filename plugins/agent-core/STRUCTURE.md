# Estructura del Plugin Agent Core

Este documento describe la organización de archivos del plugin `agent-core` y sus subtools.

## 📁 Estructura de Carpetas

```
plugins/agent-core/
├── agent-core.js              # Entry point principal (registra agent-core)
├── agent-core.html            # UI de configuración de agent-core
├── index.js                   # Entry point alternativo (también registra ambos nodos)
├── package.json               # Metadata del plugin
├── README.md                  # Documentación principal
│
├── lib/                       # Librerías del backend
│   ├── AgentCoreNode.js      # Implementación principal del Agent Core
│   ├── ReactStrategy.js      # Estrategia REACT
│   ├── EnvelopeManager.js    # Gestión de AgentEnvelope
│   ├── ModelValidator.js     # Validación de respuestas del modelo
│   ├── ToolExecutor.js       # Ejecución de herramientas
│   ├── types.js              # Definiciones de tipos TypeScript
│   └── models/               # Modelos de lenguaje (subtools)
│       └── azure-openai/
│           ├── AzureOpenAIModelNode.js    # Nodo Model Azure OpenAI
│           ├── AzureOpenAIClient.js        # Cliente HTTP para Azure OpenAI
│           └── ResponseValidator.js        # Validador de respuestas JSON
│
├── models/                    # Modelos de lenguaje (subtools)
│   ├── README.md              # Guía para agregar nuevos modelos
│   └── azure-openai-model/    # Modelo Azure OpenAI
│       ├── azure-openai-model.js      # Entry point del nodo
│       ├── azure-openai-model.html    # UI de configuración
│       └── README.md                  # Documentación del modelo
│
└── schemas/                   # Schemas JSON de validación
    ├── agent-core.react.schema.json
    └── azure-openai.model.schema.json
```

## 🎨 Estructura del Frontend (Redflow UI)

```
src/components/nodes/
├── agent-core/
│   ├── AgentCoreConfig.tsx    # Editor de configuración del Agent Core
│   ├── tabs/                  # Tabs del editor del Agent Core
│   │   ├── StrategyTab.tsx
│   │   ├── ToolsTab.tsx
│   │   ├── StopConditionsTab.tsx
│   │   ├── ModelTab.tsx
│   │   └── DebugTab.tsx
│   └── models/                # Editores de modelos (subtools)
│       └── azure-openai-model/
│           ├── AzureOpenAIModelConfig.tsx
│           └── tabs/
│               ├── ConnectionTab.tsx
│               ├── ParametersTab.tsx
│               ├── ToolsPreviewTab.tsx
│               └── RuntimeTab.tsx
│
└── http-request/              # Otros nodos (no relacionados)
    └── ...
```

## 🔗 Registro de Nodos

### Backend (Node-RED)

El plugin registra dos nodos:

1. **`agent-core`** (nodo principal)
   - Entry point: `agent-core.js`
   - Registrado en: `agent-core.js` e `index.js`

2. **`model.azure.openai`** (subtool)
   - Entry point: `models/azure-openai-model.js`
   - Registrado en: `agent-core.js` e `index.js` (llamada a `AzureOpenAIModelNode(RED)`)

### Frontend (Redflow)

Los editores custom están registrados en `CustomEditorRenderer.tsx`:

- `agent-core` → `AgentCoreConfig`
- `model.azure.openai` → `AzureOpenAIModelConfig`

## 📦 Principios de Organización

1. **Backend separado por funcionalidad:**
   - `lib/` contiene la lógica de negocio
   - `models/` contiene entry points de subtools
   - `schemas/` contiene validaciones JSON

2. **Frontend refleja la estructura del backend:**
   - Cada nodo tiene su carpeta en `src/components/nodes/`
   - Los subtools están dentro de la carpeta del nodo padre
   - Cada nodo/subtool tiene su `Config.tsx` y carpeta `tabs/`

3. **Un solo lugar para cada cosa:**
   - No hay duplicación de archivos
   - Las referencias apuntan a la ubicación correcta
   - Los subtools están claramente identificados como parte del plugin padre

## 🚫 Carpetas Eliminadas (Duplicados)

- ❌ `plugins/azure-openai-model/` (eliminada - ahora está en `agent-core/models/`)
- ❌ `src/components/nodes/azure-openai-model/` (eliminada - ahora está en `agent-core/models/`)

## ✅ Estructura Final Limpia

- ✅ Un solo plugin: `agent-core`
- ✅ Subtools organizados dentro del plugin
- ✅ Frontend refleja la estructura del backend
- ✅ Sin duplicación de archivos
- ✅ Referencias actualizadas correctamente

