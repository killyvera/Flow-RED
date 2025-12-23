# Azure OpenAI Model Node

> **Part of Agent Core Plugin**: This model node is included as a subtool in the `agent-core` plugin.

Nodo Model para Azure OpenAI en el sistema de agentes Redflow.

## 📋 Descripción

Este nodo representa **SOLO un modelo de lenguaje** que:
- Recibe prompts del Agent Core
- Envía requests a Azure OpenAI Chat Completions API
- Retorna respuestas en formato JSON estricto
- Es tool-aware pero **NO ejecuta tools**
- Es determinístico y observable

## 🚫 Restricciones

Este nodo **NO**:
- Ejecuta tools directamente
- Orquesta flujos de trabajo
- Almacena estado o memoria
- Modifica el agent envelope
- Genera texto libre fuera del JSON

## 📦 Instalación

El nodo se carga automáticamente como parte del plugin `agent-core` desde el directorio `plugins/agent-core` gracias a la configuración de `nodesDir` en `settings.redflow.cjs`.

### Requisitos

1. Node-RED >= 3.0.0
2. Variable de entorno `AZURE_OPENAI_API_KEY` configurada (o configurada en el nodo)
3. Recurso Azure OpenAI con un deployment activo

### Configuración de API Key

**Opción 1: En el nodo (recomendado)**
- Configura el API key directamente en la tab "Connection" del nodo

**Opción 2: Variable de entorno**
```bash
# Windows PowerShell
$env:AZURE_OPENAI_API_KEY = "tu-api-key-aqui"

# Linux/Mac
export AZURE_OPENAI_API_KEY="tu-api-key-aqui"
```

**Nota**: Si se configura en el nodo, tiene prioridad sobre la variable de entorno.

## 🔧 Configuración del Nodo

### Connection Tab

- **Endpoint**: URL del recurso Azure OpenAI
  - Formato: `https://[resource-name].openai.azure.com`
  - Ejemplo: `https://my-resource.openai.azure.com`
  
- **Deployment**: Nombre del deployment en Azure OpenAI
  - Ejemplo: `gpt-4`, `gpt-4-mini`, `gpt-35-turbo`
  
- **API Version**: Versión de la API
  - Default: `2024-02-15-preview`

- **API Key**: API key de Azure OpenAI
  - Puede configurarse aquí o usar variable de entorno

### Parameters Tab

- **Temperature**: Control de aleatoriedad (0-1)
  - 0 = Determinístico (recomendado para agentes)
  - 1 = Creativo
  - Default: `0`

- **Max Tokens**: Máximo de tokens en la respuesta (1-4000)
  - Default: `800`

- **Timeout**: Tiempo máximo de espera en milisegundos (1000-60000)
  - Default: `15000` (15 segundos)

### Tools Preview Tab

Vista read-only de las herramientas proporcionadas por el Agent Core en runtime.

### Runtime / Debug Tab

Muestra metadata de la última ejecución:
- Tokens utilizados (prompt, completion, total)
- Duración del request
- Trace ID
- Errores (si los hay)

**Nota**: Los prompts NO se guardan por seguridad, solo metadata.

## 📥 Input Contract (Agent Core → Model)

```json
{
  "systemPrompt": "string",
  "userPrompt": "string",
  "tools": [
    {
      "name": "string",
      "description": "string (opcional)",
      "inputSchema": {}
    }
  ],
  "traceId": "string"
}
```

## 📤 Output Contract (Model → Agent Core)

### Respuesta exitosa

```json
{
  "payload": {
    "action": "tool" | "final",
    "tool": "string | null",
    "input": {},
    "confidence": 0.0,
    "message": "string"
  },
  "metadata": {
    "model": "azure-openai",
    "deployment": "gpt-4",
    "promptTokens": 123,
    "completionTokens": 45,
    "totalTokens": 168,
    "durationMs": 820,
    "traceId": "uuid"
  }
}
```

### Respuesta con error

```json
{
  "payload": {
    "error": {
      "code": "AZURE_OPENAI_TIMEOUT",
      "message": "Request timeout after 15000ms",
      "traceId": "uuid",
      "durationMs": 15000
    }
  }
}
```

## ⚠️ Manejo de Errores

El nodo maneja los siguientes errores:

| Código | Descripción |
|--------|-------------|
| `AZURE_OPENAI_TIMEOUT` | Request timeout |
| `AZURE_OPENAI_HTTP_ERROR` | HTTP error con código |
| `AZURE_OPENAI_JSON_INVALID` | JSON inválido en respuesta |
| `AZURE_OPENAI_MISSING_FIELD` | Campo requerido faltante |
| `AZURE_OPENAI_INVALID_ACTION` | Action no válido |
| `AZURE_OPENAI_MISSING_CONTENT` | Sin contenido en respuesta |
| `AZURE_OPENAI_JSON_PARSE_ERROR` | Error al parsear JSON |
| `AZURE_OPENAI_REQUEST_ERROR` | Error de red |

**Nota**: El nodo NO reintenta automáticamente. Los reintentos son responsabilidad del Agent Core.

## 🔗 Conexiones (Strict Edges)

### Conexiones permitidas

- **Entrada**: Solo desde Agent Core (output "model")
- **Salida**: Solo hacia Agent Core

### Conexiones NO permitidas

- ❌ Tool edges
- ❌ Memory edges
- ❌ Data edges directos

## 📊 Observabilidad

El nodo emite logs estructurados con:
- Trace ID
- Duración del request
- Tokens utilizados
- Errores

**Importante**: Los prompts NO se incluyen en logs por seguridad.

## 🎯 Uso con Agent Core

```
[Agent Core] ---(model output)---> [Azure OpenAI Model] ---(response)---> [Agent Core]
```

El Agent Core:
1. Construye el system prompt con instrucciones del agente
2. Construye el user prompt con el contexto actual
3. Proporciona la lista de tools disponibles
4. Envía el ModelInput al Model Node
5. Recibe la decisión del modelo
6. Ejecuta la acción correspondiente (tool o final)

## 🔍 Validaciones

### Request Validation

- ✅ Endpoint debe ser formato Azure OpenAI
- ✅ Deployment debe estar configurado
- ✅ System prompt y user prompt requeridos
- ✅ Tools debe ser un array válido

### Response Validation

- ✅ Respuesta debe ser JSON válido
- ✅ `action` debe ser "tool" o "final"
- ✅ Si `action` es "tool", `tool` es requerido
- ✅ `confidence` debe estar entre 0 y 1

## 📁 Estructura de Archivos

```
plugins/agent-core/
├── models/
│   ├── azure-openai-model.js      # Entry point
│   ├── azure-openai-model.html    # UI de Node-RED
│   └── README.md                  # Este archivo
├── lib/
│   └── models/
│       └── azure-openai/
│           ├── AzureOpenAIModelNode.js    # Lógica principal
│           ├── AzureOpenAIClient.js      # Cliente HTTP
│           └── ResponseValidator.js       # Validador de respuestas
└── schemas/
    └── azure-openai.model.schema.json    # Schema de config
```

## 🔐 Seguridad

- ✅ API key desde configuración del nodo o variable de entorno
- ✅ Prompts NO se guardan en logs
- ✅ Solo metadata en observabilidad
- ✅ Validación estricta de respuestas
- ✅ Timeout configurable
- ✅ JSON estricto (response_format: json_object)

## 📚 Referencias

- [Agent Core README](../README.md)
- [Azure OpenAI API Reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [JSON Mode](https://platform.openai.com/docs/guides/json-mode)

## 📄 Licencia

Apache-2.0 (part of agent-core plugin)

---

**Versión**: 1.0.0  
**Autor**: Redflow Team  
**Categoría**: Model  
**Plugin**: agent-core

