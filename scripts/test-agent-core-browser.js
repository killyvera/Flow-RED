/**
 * Script de test para flujo de IA con agent-core (versión navegador)
 * 
 * Este script se ejecuta en el navegador y puede acceder al almacenamiento
 * encriptado para cargar credenciales reales.
 * 
 * Uso: Importa este módulo en la consola del navegador o en un componente React
 */

/**
 * Carga credenciales de Azure OpenAI desde el almacenamiento
 */
async function loadAzureCredentialsFromStorage() {
  try {
    const { listCredentials, getCredentialData, CredentialType } = await import('../src/utils/credentialManager.js')
    
    // Buscar credenciales de Azure OpenAI
    const credentials = await listCredentials(CredentialType.AZURE_OPENAI)
    
    if (credentials.length === 0) {
      console.warn('⚠️  No se encontraron credenciales de Azure OpenAI en el almacenamiento')
      return null
    }

    // Usar la primera credencial encontrada
    const credential = credentials[0]
    console.log(`✅ Credencial encontrada: ${credential.name}`)
    
    const data = await getCredentialData(credential.id)
    return {
      credentialId: credential.id,
      ...data,
    }
  } catch (error) {
    console.error('Error al cargar credenciales:', error)
    return null
  }
}

/**
 * Carga configuración de nodo desde el almacenamiento
 */
async function loadNodeConfigFromStorage(nodeId) {
  try {
    const { getNodeConfigData } = await import('../src/utils/nodeConfigStorage.js')
    return await getNodeConfigData(nodeId)
  } catch (error) {
    console.warn('Error al cargar configuración del nodo:', error)
    return null
  }
}

/**
 * Crea un flujo de test con agent-core usando credenciales del almacenamiento
 */
export async function createAgentCoreTestFlow() {
  console.log('\n🧪 Creando flujo de test con Agent-Core\n')
  console.log('='.repeat(60))

  try {
    // 1. Cargar credenciales desde el almacenamiento
    console.log('\n🔑 Cargando credenciales desde el almacenamiento...')
    const credentials = await loadAzureCredentialsFromStorage()
    
    if (!credentials) {
      throw new Error('No se encontraron credenciales de Azure OpenAI. Crea una credencial primero desde el panel de Credenciales.')
    }

    console.log('✅ Credenciales cargadas:')
    console.log(`   Endpoint: ${credentials.endpoint}`)
    console.log(`   API Version: ${credentials.apiVersion || '2024-02-15-preview'}`)
    console.log(`   Credential ID: ${credentials.credentialId}`)

    // 2. Obtener API de Node-RED
    // Nota: En el navegador, estas funciones deben estar disponibles globalmente
    // o importarse desde el contexto de la aplicación
    const baseUrl = window.location.origin.replace(':5173', ':1880') || 'http://localhost:1880'
    
    // Función para guardar flow (simplificada para uso en navegador)
    async function saveFlow(flowId, nodes, rev) {
      const response = await fetch(`${baseUrl}/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Node-RED-API-Version': 'v2',
          'Node-RED-Deployment-Type': 'full',
        },
        body: JSON.stringify({
          rev: rev || '',
          flows: nodes,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      return response.json()
    }
    
    // 3. Generar IDs
    const flowId = `flow_${Date.now()}`
    const injectId = `inject_${Date.now()}`
    const agentCoreId = `agent_core_${Date.now()}`
    const modelId = `model_${Date.now()}`
    const debugId = `debug_${Date.now()}`

    // 4. Crear el flujo
    const flow = {
      id: flowId,
      type: 'tab',
      label: 'Test Agent Core Flow',
    }

    const nodes = [
      // Inject node
      {
        id: injectId,
        type: 'inject',
        z: flowId,
        name: 'Test Input',
        props: [{ p: 'payload' }],
        repeat: '',
        crontab: '',
        once: false,
        onceDelay: 0.1,
        topic: '',
        payload: JSON.stringify({
          task: 'Responde con un saludo amigable en español y explica brevemente qué es la inteligencia artificial',
          context: 'Este es un test del sistema agent-core',
        }),
        payloadType: 'json',
        x: 100,
        y: 100,
        wires: [[agentCoreId]],
      },
      // Agent Core node
      {
        id: agentCoreId,
        type: 'agent-core',
        z: flowId,
        name: 'Agent Core',
        strategy: 'react',
        maxIterations: 3,
        allowedTools: [],
        stopConditions: [{ type: 'final_answer' }],
        debug: true,
        x: 300,
        y: 100,
        wires: [[modelId], [], [debugId]],
      },
      // Azure OpenAI Model node
      {
        id: modelId,
        type: 'model.azure.openai',
        z: flowId,
        name: 'Azure OpenAI',
        endpoint: credentials.endpoint,
        deployment: 'gpt-4', // El usuario debe configurar esto
        apiVersion: credentials.apiVersion || '2024-02-15-preview',
        credentialId: credentials.credentialId, // Usar credencial centralizada
        temperature: 0.7,
        maxTokens: 500,
        timeoutMs: 15000,
        x: 500,
        y: 100,
        wires: [[agentCoreId]],
      },
      // Debug node
      {
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
        x: 700,
        y: 100,
        wires: [],
      },
    ]

    // 5. Guardar el flujo
    console.log('\n💾 Guardando flujo en Node-RED...')
    const result = await saveFlow(flowId, nodes, undefined)
    console.log(`✅ Flujo guardado (rev: ${result.rev})`)

    console.log('\n✅ Flujo de test creado exitosamente!')
    console.log('\n📊 Resumen:')
    console.log(`   - Flow ID: ${flowId}`)
    console.log(`   - Nodos creados: 4`)
    console.log(`   - Credencial usada: ${credentials.credentialId}`)
    console.log('\n💡 Para ejecutar el flujo:')
    console.log(`   1. Abre Node-RED en ${baseUrl}`)
    console.log(`   2. Busca el flow "Test Agent Core Flow"`)
    console.log(`   3. Haz clic en el botón de "inject" del nodo "Test Input"`)
    console.log(`   4. Revisa el panel de debug para ver la respuesta del agente`)

    return {
      success: true,
      flowId,
      nodeIds: {
        inject: injectId,
        agentCore: agentCoreId,
        model: modelId,
        debug: debugId,
      },
      credentialId: credentials.credentialId,
    }
  } catch (error) {
    console.error('\n❌ Error al crear el flujo:', error)
    throw error
  }
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  window.createAgentCoreTestFlow = createAgentCoreTestFlow
  console.log('💡 Función disponible: createAgentCoreTestFlow()')
  console.log('   Ejecuta: await createAgentCoreTestFlow()')
}

