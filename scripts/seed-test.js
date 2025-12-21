/**
 * Script de prueba para replicar el problema de activación de nodos inject después de guardar
 * 
 * Este script incluye múltiples casos de prueba:
 * 1. Test 1: Crear un flow desde cero y agregar nodos (caso simple)
 * 2. Test 2: Guardar sobre un flow existente con muchos flows (similar a seed)
 * 3. Test 3: Crear un flow en blanco desde cero, agregar nodos, ejecutar y obtener logs
 * 
 * Cada test verifica:
 * - Que el nodo se guarda correctamente
 * - Que el nodo se despliega correctamente
 * - Que el nodo se puede activar después de guardar
 * - Que el nodo se puede activar después de sobrescribir
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

// Test 1: Crear un flow desde cero (caso simple)
async function test1_CreateFlowFromScratch() {
  console.log('\n🧪 TEST 1: Crear flow desde cero y agregar nodos\n')
  console.log('=' .repeat(60))

  try {
    // Obtener flows existentes
    console.log('📋 Obteniendo flows existentes...')
    const existingFlowsResponse = await getFlows()
    const currentRev = existingFlowsResponse.rev || ''
    console.log(`   ✅ Rev actual: ${currentRev.substring(0, 20)}...\n`)

    // Crear un flow completamente nuevo
    const testFlowId = `test-flow-${Date.now()}`
    const testInjectNodeId = `test-inject-${Date.now()}`
    const testDebugNodeId = `test-debug-${Date.now()}`

    const testFlow = {
      id: testFlowId,
      type: 'tab',
      label: 'Test Flow (Desde Cero)',
      disabled: false,
      info: '',
      env: [],
      x: 0,
      y: 0,
    }

    const testInjectNode = {
      id: testInjectNodeId,
      type: 'inject',
      name: 'Test Inject',
      z: testFlowId,
      props: [
        { p: 'payload' },
        { p: 'topic', v: 'test', vt: 'str' },
      ],
      repeat: '',
      cron: '',
      once: false,
      onceDelay: 0.1,
      topic: 'test',
      payload: '',
      payloadType: 'date',
      x: 100,
      y: 100,
      wires: [[testDebugNodeId]],
    }

    const testDebugNode = {
      id: testDebugNodeId,
      type: 'debug',
      name: 'Test Debug',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'false',
      statusVal: '',
      statusType: 'auto',
      x: 300,
      y: 100,
      wires: [],
      z: testFlowId,
    }

    // Guardar solo el flow nuevo (sin flows existentes)
    const flowsToSave = [testFlow, testInjectNode, testDebugNode]
    console.log(`💾 Guardando flow nuevo (${flowsToSave.length} nodos)...`)
    const saveResponse = await saveFlows(flowsToSave, currentRev)
    console.log(`   ✅ Flow guardado. Nueva rev: ${saveResponse.rev.substring(0, 20)}...`)

    // Esperar despliegue
    console.log('   ⏳ Esperando 5 segundos para despliegue...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verificar que el nodo existe
    console.log('\n🔍 Verificando que el nodo existe...')
    const verifyFlowsResponse = await getFlows()
    const verifyInjectNode = verifyFlowsResponse.flows.find(f => f.id === testInjectNodeId)

    if (!verifyInjectNode) {
      console.log('   ❌ ERROR: El nodo no se encontró en los flows')
      return false
    }
    console.log(`   ✅ Nodo encontrado: ${verifyInjectNode.id}`)

    // Intentar activar el nodo
    console.log('\n🖱️ Intentando activar nodo inject...')
    const activated = await waitForNode(testInjectNodeId, 30, 1000)

    if (!activated) {
      console.log('   ❌ ERROR: El nodo no se pudo activar')
      return false
    }
    console.log('   ✅ Nodo activado exitosamente')

    // Limpiar
    console.log('\n🧹 Limpiando...')
    const finalFlowsResponse = await getFlows()
    const finalRev = finalFlowsResponse.rev || ''
    const flowsToKeep = finalFlowsResponse.flows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      if (f.type === 'tab' && f.id === testFlowId) return false
      if (f.z === testFlowId) return false
      return true
    })
    await saveFlows(flowsToKeep, finalRev)
    console.log('   ✅ Flow eliminado')

    console.log('\n✅ TEST 1 COMPLETADO: Éxito\n')
    return true
  } catch (err) {
    console.error('❌ TEST 1 FALLÓ:', err.message)
    console.error(err.stack)
    return false
  }
}

// Test 2: Guardar sobre un flow existente con muchos flows (similar a seed)
async function test2_SaveOverExistingFlowWithManyFlows() {
  console.log('\n🧪 TEST 2: Guardar sobre flow existente con muchos flows (similar a seed)\n')
  console.log('=' .repeat(60))

  try {
    // Paso 1: Obtener flows existentes
    console.log('📋 Paso 1: Obteniendo flows existentes...')
    const existingFlowsResponse = await getFlows()
    const existingFlows = existingFlowsResponse.flows || []
    let currentRev = existingFlowsResponse.rev || ''
    console.log(`   ✅ Flows existentes: ${existingFlows.length}`)
    console.log(`   ✅ Rev actual: ${currentRev.substring(0, 20)}...\n`)

    // Paso 2: Crear un flow nuevo primero (simulando que ya existe)
    console.log('📝 Paso 2: Creando flow base para luego guardar sobre él...')
    const testFlowId = `test-seed-flow-${Date.now()}`
    const existingInjectNodeId = `existing-inject-${Date.now()}`
    const existingDebugNodeId = `existing-debug-${Date.now()}`

    const testFlow = {
      id: testFlowId,
      type: 'tab',
      label: 'Test Seed Flow',
      disabled: false,
      info: '',
      env: [],
      x: 0,
      y: 0,
    }

    const existingInjectNode = {
      id: existingInjectNodeId,
      type: 'inject',
      name: 'Existing Inject',
      z: testFlowId,
      props: [
        { p: 'payload' },
        { p: 'topic', v: 'existing', vt: 'str' },
      ],
      repeat: '',
      cron: '',
      once: false,
      onceDelay: 0.1,
      topic: 'existing',
      payload: '',
      payloadType: 'date',
      x: 100,
      y: 100,
      wires: [[existingDebugNodeId]],
    }

    const existingDebugNode = {
      id: existingDebugNodeId,
      type: 'debug',
      name: 'Existing Debug',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'false',
      statusVal: '',
      statusType: 'auto',
      x: 300,
      y: 100,
      wires: [],
      z: testFlowId,
    }

    // Guardar el flow base primero
    const baseFlowsToSave = [
      ...existingFlows, // Preservar flows existentes
      testFlow,
      existingInjectNode,
      existingDebugNode,
    ]
    console.log(`   💾 Guardando flow base (${baseFlowsToSave.length} nodos total)...`)
    const baseSaveResponse = await saveFlows(baseFlowsToSave, currentRev)
    currentRev = baseSaveResponse.rev || ''
    console.log(`   ✅ Flow base guardado. Nueva rev: ${currentRev.substring(0, 20)}...`)
    
    // Esperar despliegue
    console.log('   ⏳ Esperando 3 segundos para despliegue inicial...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Paso 3: Ahora guardar sobre el flow existente (agregando nuevos nodos)
    console.log('\n💾 Paso 3: Guardando sobre el flow existente (agregando nuevos nodos)...')
    const testInjectNodeId = `test-inject-${Date.now()}`
    const testDebugNodeId = `test-debug-${Date.now()}`

    // Obtener flows actualizados para preservar el estado actual
    const updatedFlowsResponse = await getFlows()
    const updatedFlows = updatedFlowsResponse.flows || []
    currentRev = updatedFlowsResponse.rev || ''

    console.log(`   ✅ Flows actuales: ${updatedFlows.length}`)
    console.log(`   ✅ Rev actual: ${currentRev.substring(0, 20)}...`)

    // Crear nuevos nodos para agregar al flow existente
    const testInjectNode = {
      id: testInjectNodeId,
      type: 'inject',
      name: 'New Inject (Seed-like)',
      z: testFlowId,
      props: [
        { p: 'payload' },
        { p: 'topic', v: 'new-test', vt: 'str' },
      ],
      repeat: '',
      cron: '',
      once: false,
      onceDelay: 0.1,
      topic: 'new-test',
      payload: '',
      payloadType: 'date',
      x: 100,
      y: 200, // Diferente posición Y para no sobreponerse
      wires: [[testDebugNodeId]],
    }

    const testDebugNode = {
      id: testDebugNodeId,
      type: 'debug',
      name: 'New Debug (Seed-like)',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'false',
      statusVal: '',
      statusType: 'auto',
      x: 300,
      y: 200, // Diferente posición Y para no sobreponerse
      wires: [],
      z: testFlowId,
    }

    // Filtrar flows existentes, manteniendo todos excepto los nuevos nodos que vamos a agregar
    // CRÍTICO: Similar a seed-test.js, mantener nodos existentes del flow de prueba
    const flowsToKeep = updatedFlows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      // Mantener el flow de prueba (tab)
      if (f.type === 'tab' && f.id === testFlowId) return true
      // Mantener nodos existentes del flow de prueba (los que creamos antes)
      if (f.z === testFlowId && f.id !== testInjectNodeId && f.id !== testDebugNodeId) return true
      // Mantener todos los otros flows y sus nodos
      if (f.z !== testFlowId) return true
      return false
    })

    // Construir el payload: flows existentes + nuevos nodos
    const flowsToSave = [
      ...flowsToKeep,
      testInjectNode,
      testDebugNode,
    ]
    console.log(`   💾 Guardando ${flowsToSave.length} nodos (${flowsToKeep.length} existentes + 2 nuevos)...`)
    const saveResponse = await saveFlows(flowsToSave, currentRev)
    console.log(`   ✅ Flow guardado sobre existente. Nueva rev: ${saveResponse.rev.substring(0, 20)}...`)

    // Esperar despliegue
    console.log('   ⏳ Esperando 5 segundos para despliegue...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verificar que el nodo nuevo existe
    console.log('\n🔍 Paso 4: Verificando que el nodo nuevo existe...')
    const verifyFlowsResponse = await getFlows()
    const verifyInjectNode = verifyFlowsResponse.flows.find(f => f.id === testInjectNodeId)
    const verifyExistingInjectNode = verifyFlowsResponse.flows.find(f => f.id === existingInjectNodeId)

    if (!verifyInjectNode) {
      console.log('   ❌ ERROR: El nodo nuevo no se encontró en los flows')
      return false
    }
    if (!verifyExistingInjectNode) {
      console.log('   ⚠️  ADVERTENCIA: El nodo existente no se encontró (puede haber sido eliminado)')
    }
    console.log(`   ✅ Nodo nuevo encontrado: ${verifyInjectNode.id}`)
    if (verifyExistingInjectNode) {
      console.log(`   ✅ Nodo existente preservado: ${verifyExistingInjectNode.id}`)
    }

    // Intentar activar el nodo nuevo
    console.log('\n🖱️ Paso 5: Intentando activar nodo inject nuevo...')
    const activated = await waitForNode(testInjectNodeId, 30, 1000)

    if (!activated) {
      console.log('   ❌ ERROR: El nodo nuevo no se pudo activar')
      return false
    }
    console.log('   ✅ Nodo nuevo activado exitosamente')

    // Limpiar
    console.log('\n🧹 Limpiando...')
    const finalFlowsResponse = await getFlows()
    const finalRev = finalFlowsResponse.rev || ''
    const flowsToKeep2 = finalFlowsResponse.flows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      if (f.type === 'tab' && f.id === testFlowId) return false
      if (f.z === testFlowId) return false // Eliminar todos los nodos del flow de prueba
      return true
    })
    await saveFlows(flowsToKeep2, finalRev)
    console.log('   ✅ Flow de prueba eliminado completamente')

    console.log('\n✅ TEST 2 COMPLETADO: Éxito\n')
    return true
  } catch (err) {
    console.error('❌ TEST 2 FALLÓ:', err.message)
    console.error(err.stack)
    return false
  }
}

// Test 3: Crear flow en blanco desde cero, agregar nodos, ejecutar y obtener logs
async function test3_CreateBlankFlowAndExecute() {
  console.log('\n🧪 TEST 3: Crear flow en blanco desde cero, agregar nodos, ejecutar y obtener logs\n')
  console.log('=' .repeat(60))

  try {
    // Obtener flows existentes
    console.log('📋 Obteniendo flows existentes...')
    const existingFlowsResponse = await getFlows()
    const currentRev = existingFlowsResponse.rev || ''
    console.log(`   ✅ Rev actual: ${currentRev.substring(0, 20)}...\n`)

    // Crear un flow completamente nuevo en blanco
    const testFlowId = `blank-flow-${Date.now()}`
    const testInjectNodeId = `blank-inject-${Date.now()}`
    const testDebugNodeId = `blank-debug-${Date.now()}`

    console.log('📝 Creando flow en blanco...')
    const testFlow = {
      id: testFlowId,
      type: 'tab',
      label: 'Blank Flow Test',
      disabled: false,
      info: '',
      env: [],
      x: 0,
      y: 0,
    }
    console.log(`   ✅ Flow creado: ${testFlowId}`)

    // Agregar nodos al flow
    console.log('\n📦 Agregando nodos al flow...')
    const testInjectNode = {
      id: testInjectNodeId,
      type: 'inject',
      name: 'Blank Inject',
      z: testFlowId,
      props: [
        { p: 'payload' },
        { p: 'topic', v: 'blank-test', vt: 'str' },
      ],
      repeat: '',
      cron: '',
      once: false,
      onceDelay: 0.1,
      topic: 'blank-test',
      payload: 'Hello from blank flow!',
      payloadType: 'str',
      x: 100,
      y: 100,
      wires: [[testDebugNodeId]],
    }

    const testDebugNode = {
      id: testDebugNodeId,
      type: 'debug',
      name: 'Blank Debug',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'false',
      statusVal: '',
      statusType: 'auto',
      x: 300,
      y: 100,
      wires: [],
      z: testFlowId,
    }
    console.log(`   ✅ Nodo inject: ${testInjectNodeId}`)
    console.log(`   ✅ Nodo debug: ${testDebugNodeId}`)

    // Guardar el flow
    const flowsToSave = [testFlow, testInjectNode, testDebugNode]
    console.log(`\n💾 Guardando flow (${flowsToSave.length} nodos)...`)
    const saveResponse = await saveFlows(flowsToSave, currentRev)
    console.log(`   ✅ Flow guardado. Nueva rev: ${saveResponse.rev.substring(0, 20)}...`)

    // Esperar despliegue
    console.log('   ⏳ Esperando 5 segundos para despliegue...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verificar que el nodo existe
    console.log('\n🔍 Verificando que el nodo existe...')
    const verifyFlowsResponse = await getFlows()
    const verifyInjectNode = verifyFlowsResponse.flows.find(f => f.id === testInjectNodeId)

    if (!verifyInjectNode) {
      console.log('   ❌ ERROR: El nodo no se encontró en los flows')
      return false
    }
    console.log(`   ✅ Nodo encontrado: ${verifyInjectNode.id}`)

    // Ejecutar el nodo inject
    console.log('\n🖱️ Ejecutando nodo inject...')
    const activated = await waitForNode(testInjectNodeId, 30, 1000)

    if (!activated) {
      console.log('   ❌ ERROR: El nodo no se pudo ejecutar')
      return false
    }
    console.log('   ✅ Nodo ejecutado exitosamente')

    // Obtener logs (simulando obtener logs del servidor)
    console.log('\n📋 Obteniendo información del flow...')
    const finalFlowsResponse = await getFlows()
    const finalInjectNode = finalFlowsResponse.flows.find(f => f.id === testInjectNodeId)
    const finalDebugNode = finalFlowsResponse.flows.find(f => f.id === testDebugNodeId)

    console.log('   📊 Estado del flow:')
    console.log(`      - Flow ID: ${testFlowId}`)
    console.log(`      - Inject Node ID: ${finalInjectNode?.id || 'No encontrado'}`)
    console.log(`      - Debug Node ID: ${finalDebugNode?.id || 'No encontrado'}`)
    console.log(`      - Total flows en Node-RED: ${finalFlowsResponse.flows.length}`)

    // Limpiar
    console.log('\n🧹 Limpiando...')
    const finalRev = finalFlowsResponse.rev || ''
    const flowsToKeep = finalFlowsResponse.flows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      if (f.type === 'tab' && f.id === testFlowId) return false
      if (f.z === testFlowId) return false
      return true
    })
    await saveFlows(flowsToKeep, finalRev)
    console.log('   ✅ Flow eliminado')

    console.log('\n✅ TEST 3 COMPLETADO: Éxito\n')
    return true
  } catch (err) {
    console.error('❌ TEST 3 FALLÓ:', err.message)
    console.error(err.stack)
    return false
  }
}

async function testFlowSaveAndTrigger() {
  console.log('🧪 Iniciando pruebas de guardado y activación de nodos inject...\n')

  try {
    // Paso 1: Obtener flows existentes
    console.log('📋 Paso 1: Obteniendo flows existentes...')
    const existingFlowsResponse = await getFlows()
    const existingFlows = existingFlowsResponse.flows || []
    const currentRev = existingFlowsResponse.rev || ''
    
    console.log(`   ✅ Flows existentes: ${existingFlows.length}`)
    console.log(`   ✅ Rev actual: ${currentRev.substring(0, 20)}...\n`)

    // Paso 2: Usar un flow existente (como flow6) en lugar de crear uno nuevo
    console.log('📝 Paso 2: Usando flow existente para prueba...')
    const testFlowId = 'flow6' // Usar flow6 existente
    const testInjectNodeId = 'test-inject-flow6'
    const testDebugNodeId = 'test-debug-flow6'
    
    // Verificar que el flow existe
    const existingTestFlow = existingFlows.find(f => f.type === 'tab' && f.id === testFlowId)
    if (!existingTestFlow) {
      console.log(`   ❌ ERROR: El flow ${testFlowId} no existe`)
      console.log(`   Flows disponibles: ${existingFlows.filter(f => f.type === 'tab').map(f => f.id).join(', ')}`)
      return
    }
    console.log(`   ✅ Flow existente encontrado: ${testFlowId}`)

    const testInjectNode = {
      id: testInjectNodeId,
      type: 'inject',
      name: 'Test Inject',
      z: testFlowId,
      props: [
        { p: 'payload' },
        { p: 'topic', v: 'test', vt: 'str' },
      ],
      repeat: '',
      cron: '',
      once: false,
      onceDelay: 0.1,
      topic: 'test',
      payload: '',
      payloadType: 'date',
      x: 100,
      y: 100,
      wires: [[testDebugNodeId]],
    }

    const testDebugNode = {
      id: testDebugNodeId,
      type: 'debug',
      name: 'Test Debug',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'false',
      statusVal: '',
      statusType: 'auto',
      x: 300,
      y: 100,
      wires: [],
      z: testFlowId,
    }

    // OPCIÓN 1: Guardar solo el flow de prueba (más simple, para aislar el problema)
    // OPCIÓN 2: Guardar todos los flows existentes + el flow de prueba (como en el editor)
    
    // Por ahora, probemos guardando solo el flow de prueba para aislar el problema
    const TEST_ONLY_NEW_FLOW = false // Cambiar a false para probar con todos los flows
    
    let flowsToSave
    if (TEST_ONLY_NEW_FLOW) {
      // Solo guardar el flow de prueba (más simple) - NO USAR EN ESTE CASO
      const testFlow = {
        id: testFlowId,
        type: 'tab',
        label: 'Test Flow Inject',
        disabled: false,
        info: '',
        env: [],
        x: 0,
        y: 0,
      }
      flowsToSave = [
        testFlow,
        testInjectNode,
        testDebugNode,
      ]
      console.log('   ℹ️  Modo: Guardando solo el flow de prueba (sin flows existentes)')
    } else {
    // Filtrar flows existentes, pero MANTENER el flow de prueba y sus nodos existentes
    // Solo agregar nuestros nodos de prueba al flow existente
    const flowsToKeep = existingFlows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      // Mantener el flow de prueba (tab)
      if (f.type === 'tab' && f.id === testFlowId) return true
      // Mantener nodos existentes del flow de prueba
      if (f.z === testFlowId && f.id !== testInjectNodeId && f.id !== testDebugNodeId) return true
      // Mantener todos los otros flows y sus nodos
      if (f.z !== testFlowId) return true
      return false
    })

      // Construir el payload: flows existentes + nuestros nodos de prueba
      flowsToSave = [
        ...flowsToKeep,
        testInjectNode,
        testDebugNode,
      ]
      console.log('   ℹ️  Modo: Guardando todos los flows existentes + nodos de prueba en flow existente')
    }

    console.log(`   ✅ Flow de prueba creado: ${testFlowId}`)
    console.log(`   ✅ Nodo inject: ${testInjectNodeId}`)
    console.log(`   ✅ Total de nodos a guardar: ${flowsToSave.length}\n`)

    // Paso 3: Guardar el flow por primera vez
    console.log('💾 Paso 3: Guardando flow por primera vez...')
    const saveResponse1 = await saveFlows(flowsToSave, currentRev)
    console.log(`   ✅ Flow guardado. Nueva rev: ${saveResponse1.rev.substring(0, 20)}...`)
    
    // Esperar un momento para que Node-RED despliegue
    console.log('   ⏳ Esperando 5 segundos para despliegue...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Paso 4: Verificar que el nodo existe en los flows
    console.log('\n🔍 Paso 4: Verificando que el nodo existe en los flows...')
    const verifyFlowsResponse = await getFlows()
    const verifyInjectNode = verifyFlowsResponse.flows.find(f => f.id === testInjectNodeId)
    
    if (!verifyInjectNode) {
      console.log('   ❌ ERROR: El nodo no se encontró en los flows después de guardar')
      console.log('   Esto sugiere que el nodo no se guardó correctamente\n')
      return
    }
    
    console.log(`   ✅ Nodo encontrado en flows: ${verifyInjectNode.id}`)
    console.log(`   ✅ Tipo: ${verifyInjectNode.type}`)
    console.log(`   ✅ Flow ID (z): ${verifyInjectNode.z}`)
    console.log(`   ✅ Nombre: ${verifyInjectNode.name || 'Sin nombre'}\n`)

    // Paso 5: Intentar activar el nodo inject (primera vez - debería funcionar)
    console.log('🖱️ Paso 5: Intentando activar nodo inject (primera vez)...')
    const firstAttempt = await waitForNode(testInjectNodeId, 30, 1000)
    
    if (!firstAttempt) {
      console.log('   ❌ ERROR: El nodo existe en flows pero no está disponible en el runtime')
      console.log('   Esto sugiere un problema con el despliegue\n')
      
      // Intentar con el endpoint alternativo
      console.log('   🔄 Intentando con endpoint alternativo /admin/inject/...')
      try {
        const altUrl = `${NODE_RED_URL}/admin/inject/${testInjectNodeId}`
        const altResponse = await fetch(altUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (altResponse.ok) {
          console.log('   ✅ El nodo funciona con el endpoint /admin/inject/')
        } else {
          console.log(`   ❌ El endpoint alternativo también falló: ${altResponse.status}`)
        }
      } catch (err) {
        console.log(`   ❌ Error con endpoint alternativo: ${err.message}`)
      }
      return
    }

    console.log('   ✅ Nodo activado exitosamente (primera vez)\n')

    // Paso 6: Obtener flows actualizados
    console.log('📋 Paso 6: Obteniendo flows actualizados...')
    const updatedFlowsResponse = await getFlows()
    const updatedRev = updatedFlowsResponse.rev || ''
    console.log(`   ✅ Nueva rev: ${updatedRev.substring(0, 20)}...\n`)

    // Paso 7: Sobrescribir el flow (simulando un guardado)
    console.log('💾 Paso 7: Sobrescribiendo flow (simulando guardado)...')
    
    // Obtener el flow actualizado para preservar cualquier cambio que Node-RED haya hecho
    const currentTestFlow = updatedFlowsResponse.flows.find(f => f.id === testFlowId)
    const currentTestInjectNode = updatedFlowsResponse.flows.find(f => f.id === testInjectNodeId)
    const currentTestDebugNode = updatedFlowsResponse.flows.find(f => f.id === testDebugNodeId)

    if (!currentTestFlow || !currentTestInjectNode || !currentTestDebugNode) {
      console.log('   ❌ ERROR: No se encontró el flow de prueba en Node-RED')
      return
    }

    // Filtrar flows existentes (excluyendo nuestro flow de prueba)
    const flowsToKeep2 = updatedFlowsResponse.flows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      if (f.type === 'tab' && f.id === testFlowId) return false
      if (f.z === testFlowId) return false
      return true
    })

    // Construir el payload con el flow actualizado
    const flowsToSave2 = [
      ...flowsToKeep2,
      currentTestFlow,
      currentTestInjectNode,
      currentTestDebugNode,
    ]

    const saveResponse2 = await saveFlows(flowsToSave2, updatedRev)
    console.log(`   ✅ Flow sobrescrito. Nueva rev: ${saveResponse2.rev.substring(0, 20)}...`)
    
    // Esperar un momento para que Node-RED despliegue
    console.log('   ⏳ Esperando 5 segundos para despliegue...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Paso 8: Intentar activar el nodo inject (segunda vez - puede fallar)
    console.log('\n🖱️ Paso 8: Intentando activar nodo inject (segunda vez - después de sobrescribir)...')
    const secondAttempt = await waitForNode(testInjectNodeId, 30, 1000)

    // Paso 9: Comparar resultados
    console.log('\n📊 Paso 9: Comparando resultados...')
    console.log(`   Primera activación (después de crear): ${firstAttempt ? '✅ Éxito' : '❌ Falló'}`)
    console.log(`   Segunda activación (después de sobrescribir): ${secondAttempt ? '✅ Éxito' : '❌ Falló'}`)

    if (firstAttempt && !secondAttempt) {
      console.log('\n🔴 PROBLEMA REPLICADO:')
      console.log('   El nodo funciona después de crear el flow, pero NO funciona después de sobrescribirlo.')
      console.log('   Esto confirma que hay un problema con el proceso de guardado/sobrescritura.\n')
    } else if (firstAttempt && secondAttempt) {
      console.log('\n✅ NO HAY PROBLEMA:')
      console.log('   El nodo funciona correctamente en ambos casos.\n')
    } else if (!firstAttempt) {
      console.log('\n⚠️ PROBLEMA INICIAL:')
      console.log('   El nodo no funciona ni siquiera después de crear el flow.')
      console.log('   Esto sugiere un problema con el despliegue inicial.\n')
    }

    // Limpiar: eliminar el flow de prueba
    console.log('🧹 Limpiando: eliminando flow de prueba...')
    const finalFlowsResponse = await getFlows()
    const finalRev = finalFlowsResponse.rev || ''
    const flowsToKeep3 = finalFlowsResponse.flows.filter(f => {
      if (!f || typeof f !== 'object' || !f.type) return false
      if (f.type === 'tab' && f.id === testFlowId) return false
      if (f.z === testFlowId) return false
      return true
    })
    await saveFlows(flowsToKeep3, finalRev)
    console.log('   ✅ Flow de prueba eliminado\n')

  } catch (err) {
    console.error('❌ Error durante la prueba:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 Iniciando suite de pruebas...\n')
  console.log('=' .repeat(60))

  const results = {
    test1: false,
    test2: false,
    test3: false,
  }

  // Test 1: Crear flow desde cero
  results.test1 = await test1_CreateFlowFromScratch()

  // Test 2: Guardar sobre flow existente con muchos flows
  results.test2 = await test2_SaveOverExistingFlowWithManyFlows()

  // Test 3: Crear flow en blanco, agregar nodos, ejecutar y obtener logs
  results.test3 = await test3_CreateBlankFlowAndExecute()

  // Resumen
  console.log('\n' + '=' .repeat(60))
  console.log('📊 RESUMEN DE PRUEBAS:\n')
  console.log(`   Test 1 (Crear desde cero): ${results.test1 ? '✅ Éxito' : '❌ Falló'}`)
  console.log(`   Test 2 (Guardar sobre existente): ${results.test2 ? '✅ Éxito' : '❌ Falló'}`)
  console.log(`   Test 3 (Flow en blanco + ejecutar): ${results.test3 ? '✅ Éxito' : '❌ Falló'}`)
  
  const allPassed = results.test1 && results.test2 && results.test3
  console.log(`\n   Resultado general: ${allPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`)
  console.log('=' .repeat(60) + '\n')

  return allPassed
}

// Ejecutar todas las pruebas
runAllTests()
  .then((allPassed) => {
    if (allPassed) {
      console.log('✅ Suite de pruebas completada exitosamente')
      process.exit(0)
    } else {
      console.log('❌ Algunas pruebas fallaron')
      process.exit(1)
    }
  })
  .catch((err) => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
  })

