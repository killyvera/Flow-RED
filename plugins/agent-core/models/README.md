# Model Nodes (LLMs)

Esta carpeta contiene los nodos de modelos de lenguaje (LLMs) que son subtools del plugin `agent-core`.

## 📁 Estructura

Cada modelo debe tener su propia carpeta con la siguiente estructura:

```
models/
├── azure-openai-model/          # Modelo Azure OpenAI
│   ├── azure-openai-model.js    # Entry point del nodo
│   ├── azure-openai-model.html  # UI de configuración
│   └── README.md                # Documentación del modelo
│
├── openai-model/                # Modelo OpenAI (futuro)
│   ├── openai-model.js
│   ├── openai-model.html
│   └── README.md
│
└── anthropic-model/             # Modelo Anthropic (futuro)
    ├── anthropic-model.js
    ├── anthropic-model.html
    └── README.md
```

## 🔧 Registro de Modelos

Los modelos se registran en `agent-core.js` o `index.js`:

```javascript
const AzureOpenAIModelNode = require('./models/azure-openai-model/azure-openai-model');
const OpenAIModelNode = require('./models/openai-model/openai-model');

module.exports = function(RED) {
  // Registrar agent-core
  RED.nodes.registerType('agent-core', AgentCoreNodeWrapper);
  
  // Registrar modelos
  AzureOpenAIModelNode(RED);
  OpenAIModelNode(RED);
};
```

## 📋 Convenciones

### Nombres de Carpetas
- Formato: `{provider}-model` o `{provider}-{type}-model`
- Ejemplos:
  - `azure-openai-model`
  - `openai-model`
  - `anthropic-model`
  - `google-gemini-model`

### Nombres de Archivos
- Entry point: `{nombre-carpeta}.js`
- UI: `{nombre-carpeta}.html`
- Documentación: `README.md`

### Tipo de Nodo
- Formato: `model.{provider}.{type}` o `model.{provider}`
- Ejemplos:
  - `model.azure.openai`
  - `model.openai`
  - `model.anthropic`

## 🎯 Agregar un Nuevo Modelo

1. **Crear la carpeta del modelo:**
   ```bash
   mkdir plugins/agent-core/models/mi-modelo
   ```

2. **Crear los archivos necesarios:**
   - `mi-modelo.js` (entry point)
   - `mi-modelo.html` (UI)
   - `README.md` (documentación)

3. **Implementar la lógica en `lib/models/mi-modelo/`:**
   - `MiModeloNode.js` (lógica principal)
   - `MiModeloClient.js` (cliente HTTP/API)
   - `ResponseValidator.js` (validador de respuestas)

4. **Registrar en `agent-core.js`:**
   ```javascript
   const MiModeloNode = require('./models/mi-modelo/mi-modelo');
   // ...
   MiModeloNode(RED);
   ```

5. **Crear el editor frontend en `src/components/nodes/agent-core/models/mi-modelo/`:**
   - `MiModeloConfig.tsx`
   - `tabs/` (ConnectionTab, ParametersTab, etc.)

6. **Registrar en `CustomEditorRenderer.tsx`:**
   ```typescript
   import { MiModeloConfig } from './nodes/agent-core/models/mi-modelo/MiModeloConfig'
   // ...
   'model.mi.provider': MiModeloConfig,
   ```

## ✅ Checklist para Nuevos Modelos

- [ ] Carpeta creada en `models/`
- [ ] Entry point JS creado
- [ ] HTML de configuración creado
- [ ] Lógica implementada en `lib/models/`
- [ ] Schema JSON creado en `schemas/`
- [ ] Registrado en `agent-core.js`
- [ ] Editor frontend creado
- [ ] Registrado en `CustomEditorRenderer.tsx`
- [ ] README.md con documentación
- [ ] Pruebas realizadas

## 📚 Modelos Actuales

### Azure OpenAI Model
- **Tipo:** `model.azure.openai`
- **Carpeta:** `azure-openai-model/`
- **Documentación:** [README.md](azure-openai-model/README.md)

## 🔮 Modelos Futuros

- OpenAI Model (`model.openai`)
- Anthropic Claude Model (`model.anthropic`)
- Google Gemini Model (`model.google.gemini`)
- Local LLM Models (Ollama, etc.)

