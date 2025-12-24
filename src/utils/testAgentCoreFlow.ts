/**
 * Utilidad para crear y ejecutar un flujo de test con agent-core
 * 
 * Esta función:
 * 1. Carga credenciales de Azure OpenAI desde el almacenamiento
 * 2. Crea un flujo completo con agent-core y model.azure.openai
 * 3. Guarda el flujo en Node-RED
 * 4. Opcionalmente ejecuta el flujo
 */

import { listCredentials, getCredentialData, CredentialType } from './credentialManager'
import { saveFlow } from '@/api/client'
import { getNodeRedBaseUrl } from '@/api/client'

/**
 * Genera un ID único para nodos
 */
function generateId(): string {
  return (1 + Math.random() * 4294967295).toString(16)
}

/**
 * Activa un nodo inject
 */
async function triggerInjectNode(nodeId: string): Promise<void> {
  const baseUrl = getNodeRedBaseUrl()
  const url = `${baseUrl}/inject/${nodeId}`
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
}

/**
 * Crea un flujo de test con agent-core usando credenciales del almacenamiento
 */
export async function createAgentCoreTestFlow(options: {
  autoExecute?: boolean
  task?: string
} = {}): Promise<{
  success: boolean
  flowId: string
  nodeIds: {
    inject: string
    agentCore: string
    model: string
    debug: string
  }
  credentialId?: string
}> {
  const { autoExecute = false, task = 'Responde con un saludo amigable en español y explica brevemente qué es la inteligencia artificial' } = options

  console.log('\n🧪 Creando flujo de test con Agent-Core\n')
  console.log('='.repeat(60))

  try {
    // 1. Cargar credenciales desde el almacenamiento
    console.log('\n🔑 Cargando credenciales desde el almacenamiento...')
    const credentials = await listCredentials(CredentialType.AZURE_OPENAI)
    
    if (credentials.length === 0) {
      throw new Error(
        'No se encontraron credenciales de Azure OpenAI.\n' +
        'Por favor, crea una credencial desde el panel de "Credenciales" en el sidebar.'
      )
    }

    // Usar la primera credencial encontrada
    const credential = credentials[0]
    console.log(`✅ Credencial encontrada: ${credential.name}`)
    
    const credentialData = await getCredentialData(credential.id)
    if (!credentialData) {
      throw new Error('No se pudieron cargar los datos de la credencial')
    }

    console.log('✅ Credenciales cargadas:')
    console.log(`   Endpoint: ${credentialData.endpoint}`)
    console.log(`   API Version: ${credentialData.apiVersion || '2024-02-15-preview'}`)
    console.log(`   Credential ID: ${credential.id}`)

    // 2. Generar IDs
    const flowId = `flow_${Date.now()}`
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

    // 3. Crear el flujo
    const flow = {
      id: flowId,
      type: 'tab',
      label: 'Hola Mundo Agéntico',
      disabled: false,
      info: 'Flujo de prueba: Agent-Core con Azure OpenAI',
      x: 0,
      y: 0,
    }

    // 4. Crear nodos
    const nodes = [
      // Flow tab
      flow,
      // Inject node
      {
        id: injectId,
        type: 'inject',
        z: flowId,
        name: 'Hola Mundo',
        props: [{ p: 'payload' }],
        repeat: '',
        crontab: '',
        once: false,
        onceDelay: 0.1,
        topic: '',
        payload: JSON.stringify({
          task,
          context: 'Este es un test del sistema agent-core - Hola Mundo Agéntico',
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
        wires: [[modelId], [], [debugId]], // [model output, tool output, result output]
      },
      // Azure OpenAI Model node
      {
        id: modelId,
        type: 'model.azure.openai',
        z: flowId,
        name: 'Azure OpenAI',
        endpoint: credentialData.endpoint,
        deployment: credentialData.deployment || 'gpt-4', // Usar deployment de la credencial si está disponible
        apiVersion: credentialData.apiVersion || '2024-02-15-preview',
        credentialId: credential.id, // Usar credencial centralizada
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
        name: 'Resultado',
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

    // 5. Guardar credenciales del modelo en Node-RED PRIMERO (antes de guardar el flow)
    // Esto es crítico porque Node-RED intenta inicializar los nodos inmediatamente después de guardar el flow
    console.log('\n💾 Guardando credenciales del modelo en Node-RED (antes del flow)...')
    console.log(`   Node ID: ${modelId}`)
    console.log(`   API Key presente: ${!!credentialData.apiKey}`)
    console.log(`   API Key length: ${credentialData.apiKey?.length || 0}`)
    
    try {
      const { saveNodeCredentials } = await import('@/api/client')
      if (credentialData.apiKey) {
        // Intentar guardar las credenciales. Si el nodo no existe aún (404), se guardarán como pendientes
        console.log('   Intentando guardar credenciales...')
        await saveNodeCredentials(modelId, { apiKey: credentialData.apiKey })
        console.log('✅ Credenciales guardadas en Node-RED')
      } else {
        console.error('❌ ERROR: No hay API key en la credencial')
        console.error('   Verifica que la credencial tenga un campo "apiKey" configurado')
        throw new Error('API key no encontrada en la credencial')
      }
    } catch (err: any) {
      console.warn('⚠️  No se pudieron guardar credenciales (puede que el nodo no exista aún):', err.message)
      console.warn('   Se intentará guardar después del flow')
    }

    // 6. Guardar el flujo
    console.log('\n💾 Guardando flujo en Node-RED...')
    const result = await saveFlow(flowId, nodes, undefined)
    console.log(`✅ Flujo guardado (rev: ${result.rev})`)

    // 7. Esperar un poco para que Node-RED procese el flow
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 8. Intentar guardar credenciales nuevamente (por si falló antes porque el nodo no existía)
    console.log('\n💾 Verificando credenciales del modelo (después del flow)...')
    try {
      const { saveNodeCredentials, savePendingCredentials, getNodeCredentials } = await import('@/api/client')
      if (credentialData.apiKey) {
        console.log('   Intentando guardar credenciales nuevamente...')
        await saveNodeCredentials(modelId, { apiKey: credentialData.apiKey })
        console.log('✅ Credenciales guardadas')
        
        // Verificar que se guardaron correctamente
        console.log('   Verificando que las credenciales se guardaron...')
        const savedCreds = await getNodeCredentials(modelId)
        if (savedCreds.apiKey) {
          console.log('✅ Credenciales verificadas: API key encontrada en Node-RED')
        } else {
          console.warn('⚠️  ADVERTENCIA: Las credenciales no se encontraron después de guardar')
          console.warn('   Puede ser necesario reiniciar Node-RED o redeployar el flow')
        }
      }
      // También intentar guardar cualquier credencial pendiente
      await savePendingCredentials()
    } catch (err: any) {
      console.warn('⚠️  Error al verificar credenciales:', err.message)
    }

    // 7. Guardar configuración del modelo en el almacenamiento
    console.log('\n💾 Guardando configuración del modelo...')
    try {
      const { saveNodeConfig } = await import('./nodeConfigStorage')
      await saveNodeConfig(modelId, 'model.azure.openai', {
        endpoint: credentialData.endpoint,
        deployment: credentialData.deployment || 'gpt-4',
        apiVersion: credentialData.apiVersion || '2024-02-15-preview',
        credentialId: credential.id,
      })
      console.log('✅ Configuración guardada')
    } catch (err) {
      console.warn('⚠️  No se pudo guardar configuración:', err)
    }

    // 7. Opcionalmente ejecutar el flujo
    if (autoExecute) {
      console.log('\n⏳ Esperando a que los nodos estén disponibles...')
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('\n🚀 Ejecutando flujo...')
      console.log(`   Tarea: "${task}"`)
      try {
        await triggerInjectNode(injectId)
        console.log('✅ Flujo ejecutado')
        console.log('\n⏳ Esperando respuesta del agente...')
        console.log('   (Esto puede tomar 10-30 segundos)')
        console.log('   Revisa el panel de debug en Node-RED para ver la respuesta')
      } catch (err: any) {
        console.warn('⚠️  No se pudo ejecutar el flujo automáticamente:', err.message)
        console.warn('   Puedes ejecutarlo manualmente desde Node-RED')
      }
    }

    console.log('\n✅ Flujo de test creado exitosamente!')
    console.log('\n📊 Resumen:')
    console.log(`   - Flow ID: ${flowId}`)
    console.log(`   - Flow Name: "Hola Mundo Agéntico"`)
    console.log(`   - Nodos creados: 4 (inject, agent-core, model, debug)`)
    console.log(`   - Credencial usada: ${credential.name} (${credential.id})`)
    if (!autoExecute) {
      console.log('\n💡 Para ejecutar el flujo:')
      console.log(`   1. Abre Node-RED en ${getNodeRedBaseUrl()}`)
      console.log(`   2. Busca el flow "Hola Mundo Agéntico"`)
      console.log(`   3. Haz clic en el botón de "inject" del nodo "Hola Mundo"`)
      console.log(`   4. Revisa el panel de debug para ver la respuesta del agente`)
    }

    return {
      success: true,
      flowId,
      nodeIds: {
        inject: injectId,
        agentCore: agentCoreId,
        model: modelId,
        debug: debugId,
      },
      credentialId: credential.id,
    }
  } catch (error: any) {
    console.error('\n❌ Error al crear el flujo:', error)
    throw error
  }
}

// Hacer disponible globalmente en el navegador
if (typeof window !== 'undefined') {
  (window as any).createAgentCoreTestFlow = createAgentCoreTestFlow
  console.log('💡 Función disponible: createAgentCoreTestFlow()')
  console.log('   Ejecuta: await createAgentCoreTestFlow({ autoExecute: true })')
}

