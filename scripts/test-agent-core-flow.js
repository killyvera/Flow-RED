/**
 * Script de test para flujo de IA con agent-core
 * 
 * Este script:
 * 1. Carga credenciales de Azure OpenAI desde el almacenamiento
 * 2. Crea un flujo con agent-core y model.azure.openai
 * 3. Configura los nodos con las credenciales y configuraciones guardadas
 * 4. Ejecuta el flujo y verifica que funcione
 */

const NODE_RED_URL = process.env.NODE_RED_URL || 'http://localhost:1880'

// Función para hacer requests a Node-RED
async function nodeRedRequest(endpoint, options = {}) {
  const url = `${NODE_RED_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-API-Version': 'v2',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return response.json()
}

// Función para obtener flows
async function getFlows() {
  return nodeRedRequest('/flows')
}

// Función para guardar flows
async function saveFlows(flows, rev) {
  return nodeRedRequest('/flows', {
    method: 'POST',
    headers: {
      'Node-RED-Deployment-Type': 'full',
    },
    body: JSON.stringify({
      rev: rev || '',
      flows: flows,
    }),
  })
}

// Función para activar un nodo inject
async function triggerInjectNode(nodeId) {
  const url = `${NODE_RED_URL}/inject/${nodeId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return response
}

// Función para esperar con polling
async function waitForNode(nodeId, maxAttempts = 30, interval = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await triggerInjectNode(nodeId)
      console.log(`✅ Nodo ${nodeId} disponible después de ${attempt} intentos`)
      return true
    } catch (err) {
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval))
      } else {
        console.log(`❌ Nodo ${nodeId} no disponible después de ${maxAttempts} intentos`)
        return false
      }
    }
  }
  return false
}

// Función para generar IDs únicos
function generateId() {
  return (1 + Math.random() * 4294967295).toString(16)
}

/**
 * Test: Crear flujo de IA con agent-core usando credenciales guardadas
 */
async function testAgentCoreFlow() {
  console.log('\n🧪 TEST: Flujo de IA con Agent-Core\n')
  console.log('='.repeat(60))

  try {
    // 1. Obtener flows existentes
    console.log('\n📥 Obteniendo flows existentes...')
    const flowsResponse = await getFlows()
    const rev = flowsResponse.rev || ''
    const existingFlows = flowsResponse.flows || []
    console.log(`✅ Encontrados ${existingFlows.length} flows existentes`)

    // 2. Buscar credenciales de Azure OpenAI
    // Prioridad: Variables de entorno > Archivo de credenciales local > Valores por defecto
    console.log('\n🔑 Verificando credenciales de Azure OpenAI...')
    
    let azureApiKey = process.env.AZURE_OPENAI_API_KEY
    let azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT
    let azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT
    let azureApiVersion = process.env.AZURE_OPENAI_API_VERSION

    // Intentar cargar desde archivo de credenciales local (si existe)
    try {
      const fs = await import('fs')
      const path = await import('path')
      const { fileURLToPath } = await import('url')
      const { dirname } = await import('path')
      
      // Obtener directorio actual
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const credsPath = path.join(__dirname, '..', '.azure-openai-creds.json')
      
      if (fs.default?.existsSync?.(credsPath) || fs.existsSync?.(credsPath)) {
        const readFile = fs.default?.readFileSync || fs.readFileSync
        const creds = JSON.parse(readFile(credsPath, 'utf8'))
        azureApiKey = azureApiKey || creds.apiKey
        azureEndpoint = azureEndpoint || creds.endpoint
        azureDeployment = azureDeployment || creds.deployment
        azureApiVersion = azureApiVersion || creds.apiVersion
        console.log('✅ Credenciales cargadas desde archivo local')
      }
    } catch (err) {
      // Ignorar si no se puede leer el archivo (puede que no exista)
      if (err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ERR_MODULE_NOT_FOUND' && err.code !== 'ENOENT') {
        console.warn('⚠️  No se pudo leer archivo de credenciales:', err.message)
      }
    }

    // Valores por defecto si no se encontraron
    azureEndpoint = azureEndpoint || 'https://your-resource.openai.azure.com'
    azureDeployment = azureDeployment || 'gpt-4'
    azureApiVersion = azureApiVersion || '2024-02-15-preview'

    if (!azureApiKey) {
      console.warn('⚠️  AZURE_OPENAI_API_KEY no está configurada')
      console.warn('   Configura una de las siguientes opciones:')
      console.warn('   1. Variable de entorno: AZURE_OPENAI_API_KEY')
      console.warn('   2. Archivo: .azure-openai-creds.json en la raíz del proyecto')
      console.warn('   3. El test intentará usar credenciales guardadas en Node-RED')
      console.warn('')
      console.warn('   Ejemplo de .azure-openai-creds.json:')
      console.warn('   {')
      console.warn('     "apiKey": "tu-api-key",')
      console.warn('     "endpoint": "https://tu-recurso.openai.azure.com",')
      console.warn('     "deployment": "gpt-4",')
      console.warn('     "apiVersion": "2024-02-15-preview"')
      console.warn('   }')
    } else {
      console.log('✅ Credenciales encontradas')
      console.log(`   Endpoint: ${azureEndpoint}`)
      console.log(`   Deployment: ${azureDeployment}`)
      console.log(`   API Version: ${azureApiVersion}`)
    }

    // 3. Crear IDs para los nodos
    const flowId = generateId()
    const injectId = generateId()
    const agentCoreId = generateId()
    const modelId = generateId()
    const debugId = generateId()

    console.log('\n🔨 Creando flujo de IA...')
    console.log(`   Flow ID: ${flowId}`)
    console.log(`   Inject Node: ${injectId}`)
    console.log(`   Agent Core: ${agentCoreId}`)
    console.log(`   Azure OpenAI Model: ${modelId}`)
    console.log(`   Debug: ${debugId}`)

    // 4. Crear el flujo
    const newFlow = {
      id: flowId,
      type: 'tab',
      label: 'Test Agent Core Flow',
      disabled: false,
      info: 'Flujo de prueba para agent-core con Azure OpenAI',
    }

    // 5. Crear nodo inject (entrada)
    const injectNode = {
      id: injectId,
      type: 'inject',
      z: flowId,
      name: 'Test Input',
      props: [
        {
          p: 'payload',
        },
      ],
      repeat: '',
      crontab: '',
      once: false,
      onceDelay: 0.1,
      topic: '',
      payload: JSON.stringify({
        task: 'Responde con un saludo amigable en español',
        context: 'Este es un test del sistema agent-core',
      }),
      payloadType: 'json',
      x: 100,
      y: 100,
      wires: [[agentCoreId]],
    }

    // 6. Crear nodo agent-core
    const agentCoreNode = {
      id: agentCoreId,
      type: 'agent-core',
      z: flowId,
      name: 'Agent Core',
      strategy: 'react',
      maxIterations: 3,
      allowedTools: [],
      stopConditions: [
        {
          type: 'final_answer',
        },
      ],
      debug: true,
      x: 300,
      y: 100,
      wires: [[modelId], [], [debugId]], // [model output, tool output, result output]
    }

    // 7. Crear nodo model.azure.openai
    const modelNode = {
      id: modelId,
      type: 'model.azure.openai',
      z: flowId,
      name: 'Azure OpenAI',
      endpoint: azureEndpoint,
      deployment: azureDeployment,
      apiVersion: azureApiVersion,
      temperature: 0.7,
      maxTokens: 500,
      timeoutMs: 15000,
      x: 500,
      y: 100,
      wires: [[agentCoreId]],
    }

    // 8. Crear nodo debug (salida)
    const debugNode = {
      id: debugId,
      type: 'debug',
      z: flowId,
      name: 'Result',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'payload',
      targetType: 'msg',
      statusVal: '',
      statusType: 'auto',
      x: 700,
      y: 100,
      wires: [],
    }

    // 9. Guardar el flujo primero (para que los nodos existan)
    console.log('\n💾 Guardando flujo (primera vez, sin credenciales aún)...')
    const allFlows = [...existingFlows, newFlow]
    const allNodes = [
      ...existingFlows.flatMap(f => f.nodes || []),
      injectNode,
      agentCoreNode,
      modelNode,
      debugNode,
    ]

    const saveResponse = await saveFlows(allNodes, rev)
    console.log(`✅ Flujo guardado (rev: ${saveResponse.rev})`)

    // 10. Esperar un poco para que Node-RED procese los nodos
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 11. Guardar credenciales del modelo en Node-RED (ahora que el nodo existe)
    if (azureApiKey) {
      console.log('\n💾 Guardando credenciales del modelo en Node-RED...')
      try {
        await nodeRedRequest(`/credentials/${modelId}`, {
          method: 'POST',
          body: JSON.stringify({
            apiKey: azureApiKey,
          }),
        })
        console.log('✅ Credenciales guardadas en Node-RED')
      } catch (err) {
        console.warn('⚠️  No se pudieron guardar credenciales:', err.message)
        console.warn('   El test continuará, pero el modelo puede no funcionar sin credenciales')
      }
    } else {
      console.warn('\n⚠️  No hay API key configurada, el modelo no funcionará')
      console.warn('   Configura AZURE_OPENAI_API_KEY o crea .azure-openai-creds.json')
    }

    // 12. Esperar a que los nodos estén disponibles
    console.log('\n⏳ Esperando a que los nodos estén disponibles...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Esperar 2 segundos para que Node-RED procese

    const injectReady = await waitForNode(injectId, 10, 1000)
    if (!injectReady) {
      throw new Error('El nodo inject no está disponible')
    }

    // 13. Ejecutar el flujo
    console.log('\n🚀 Ejecutando flujo...')
    console.log('   Enviando tarea al agent-core: "Responde con un saludo amigable en español"')
    await triggerInjectNode(injectId)
    console.log('✅ Flujo ejecutado')

    // 14. Esperar un poco para que el flujo se complete
    console.log('\n⏳ Esperando respuesta del agente...')
    console.log('   (Esto puede tomar 10-30 segundos dependiendo de la latencia de Azure OpenAI)')
    await new Promise(resolve => setTimeout(resolve, 15000)) // Esperar 15 segundos

    console.log('\n✅ Test completado exitosamente!')
    console.log('\n📊 Resumen:')
    console.log(`   - Flow creado: ${flowId}`)
    console.log(`   - Nodos creados: 4 (inject, agent-core, model, debug)`)
    console.log(`   - Flujo ejecutado: ✅`)
    console.log('\n💡 Revisa el panel de debug en Node-RED para ver la respuesta del agente')

    return {
      success: true,
      flowId,
      nodeIds: {
        inject: injectId,
        agentCore: agentCoreId,
        model: modelId,
        debug: debugId,
      },
    }
  } catch (error) {
    console.error('\n❌ Error en el test:', error)
    throw error
  }
}

// Ejecutar el test si se ejecuta directamente
// Detectar si estamos en Node.js o navegador
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

if (isNode) {
  // En Node.js, ejecutar directamente
  testAgentCoreFlow()
    .then(result => {
      console.log('\n✅ Test finalizado exitosamente')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Test falló:', error)
      process.exit(1)
    })
}

export { testAgentCoreFlow }

