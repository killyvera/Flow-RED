# Test de Flujo de IA con Agent-Core

Este documento explica cómo ejecutar tests automáticos para el flujo de IA con agent-core usando credenciales de Azure OpenAI.

## Opción 1: Test desde Node.js (Script)

### Configuración de Credenciales

Tienes tres opciones para configurar las credenciales:

#### Opción A: Variables de Entorno (Recomendado)

```bash
export AZURE_OPENAI_API_KEY="tu-api-key"
export AZURE_OPENAI_ENDPOINT="https://tu-recurso.openai.azure.com"
export AZURE_OPENAI_DEPLOYMENT="gpt-4"
export AZURE_OPENAI_API_VERSION="2024-02-15-preview"
```

#### Opción B: Archivo de Credenciales

Crea un archivo `.azure-openai-creds.json` en la raíz del proyecto:

```json
{
  "apiKey": "tu-api-key",
  "endpoint": "https://tu-recurso.openai.azure.com",
  "deployment": "gpt-4",
  "apiVersion": "2024-02-15-preview"
}
```

**⚠️ IMPORTANTE**: Agrega `.azure-openai-creds.json` a `.gitignore` para no commitear credenciales.

#### Opción C: Usar Credenciales Guardadas en Node-RED

Si ya tienes credenciales guardadas en Node-RED, el script intentará usarlas automáticamente.

### Ejecutar el Test

```bash
npm run test:agent-core
```

O directamente:

```bash
node scripts/test-agent-core-flow.js
```

### Qué Hace el Test

1. ✅ Carga credenciales de Azure OpenAI
2. ✅ Crea un flow nuevo con:
   - Nodo `inject` (entrada)
   - Nodo `agent-core` (orquestador)
   - Nodo `model.azure.openai` (modelo de Azure)
   - Nodo `debug` (salida)
3. ✅ Guarda el flow en Node-RED
4. ✅ Guarda las credenciales en Node-RED
5. ✅ Ejecuta el flujo automáticamente
6. ✅ Espera la respuesta del agente

### Ver Resultados

Después de ejecutar el test:

1. Abre Node-RED en `http://localhost:1880`
2. Busca el flow "Test Agent Core Flow"
3. Revisa el panel de debug para ver la respuesta del agente

## Opción 2: Test desde el Navegador (Usando Credenciales del Almacenamiento)

Esta opción usa las credenciales guardadas en el almacenamiento encriptado del navegador.

### Pasos

1. **Abre la aplicación en el navegador**
2. **Abre la consola del navegador** (F12)
3. **Importa y ejecuta el script**:

```javascript
// Importar el módulo
const { createAgentCoreTestFlow } = await import('./scripts/test-agent-core-browser.js')

// Ejecutar el test
await createAgentCoreTestFlow()
```

O simplemente ejecuta:

```javascript
await window.createAgentCoreTestFlow()
```

### Requisitos

- Debes tener al menos una credencial de Azure OpenAI guardada en el sistema de credenciales
- La credencial debe tener `endpoint`, `apiKey` y opcionalmente `apiVersion`
- Node-RED debe estar corriendo en `http://localhost:1880`

### Qué Hace el Test del Navegador

1. ✅ Carga credenciales desde el almacenamiento encriptado
2. ✅ Crea un flow con agent-core y model.azure.openai
3. ✅ Configura el nodo model.azure.openai con la credencial centralizada
4. ✅ Guarda el flow en Node-RED
5. ✅ Te indica cómo ejecutar el flujo manualmente

## Estructura del Flujo Creado

```
[Inject] → [Agent Core] → [Azure OpenAI Model] → [Agent Core] → [Debug]
   ↑                                                                    ↓
   └──────────────────────────────────────────────────────────────────┘
```

### Flujo de Ejecución

1. **Inject Node**: Envía una tarea al agent-core
2. **Agent Core**: Recibe la tarea y la envía al modelo para razonar
3. **Azure OpenAI Model**: Procesa la tarea y responde
4. **Agent Core**: Recibe la respuesta, valida y decide si necesita más iteraciones
5. **Debug Node**: Muestra el resultado final

## Solución de Problemas

### Error: "No se encontraron credenciales"

**Solución**: Crea una credencial de Azure OpenAI desde el panel de "Credenciales" en la aplicación.

### Error: "HTTP 404: Resource not found"

**Solución**: Verifica que:
- El `endpoint` sea correcto (ej: `https://tu-recurso.openai.azure.com`)
- El `deployment` exista y esté activo en Azure
- La `apiVersion` sea válida

### Error: "HTTP 401: Unauthorized"

**Solución**: Verifica que la API key sea correcta y tenga permisos.

### El flujo no se ejecuta

**Solución**:
1. Verifica que Node-RED esté corriendo
2. Revisa los logs de Node-RED para ver errores
3. Asegúrate de que el nodo `model.azure.openai` tenga las credenciales configuradas

## Notas

- El test crea un flow nuevo cada vez que se ejecuta
- Los flows de test tienen el prefijo "Test Agent Core Flow"
- Puedes eliminar los flows de test manualmente desde Node-RED
- Las credenciales se guardan en Node-RED de forma segura (encriptadas)

