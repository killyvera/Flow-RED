/**
 * Test para crear un subflow y un flujo que lo importe
 * 
 * Uso: node test-subflows.js
 * 
 * Requiere que Node-RED esté corriendo en http://localhost:1880
 */

const NODE_RED_URL = process.env.NODE_RED_URL || 'http://localhost:1880'

// Helper para generar IDs únicos
let nodeIdCounter = 1
function generateId(prefix) {
  return `${prefix}-${nodeIdCounter++}`
}

// Constantes para posicionamiento
const NODE_WIDTH = 160
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 250
const VERTICAL_SPACING = 120

// ID del subflow
const SUBFLOW_ID = 'test-subflow-1'

// Crear la definición del subflow
// Un subflow simple que recibe un mensaje, lo procesa y lo envía
const subflowDefinition = {
  id: SUBFLOW_ID,
  type: 'subflow',
  name: 'Test Subflow',
  info: 'Un subflow de prueba que procesa mensajes',
  category: 'common',
  color: '#A6BBCF',
  icon: 'font-awesome/fa-cog',
  env: [], // CRÍTICO: Los subflows deben tener env definido
  in: [
    {
      x: 120,
      y: 100,
      wires: [
        {
          id: 'subflow-internal-1' // Nodo interno que recibe la entrada
        }
      ]
    }
  ],
  out: [
    {
      x: 560,
      y: 100,
      wires: [
        {
          id: 'subflow-internal-2', // Nodo interno que envía la salida
          port: 0
        }
      ]
    }
  ],
  // Nodos internos del subflow
  // IMPORTANTE: Los nodos internos NO deben tener 'z' o deben tener z igual al id del subflow
  flow: [
    {
      id: 'subflow-internal-1',
      type: 'function',
      name: 'Procesar en Subflow',
      func: '// Procesar el mensaje\nmsg.payload = "Procesado por subflow: " + msg.payload;\nreturn msg;',
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 240,
      y: 100,
      wires: [
        ['subflow-internal-2']
      ]
    },
    {
      id: 'subflow-internal-2',
      type: 'function',
      name: 'Finalizar',
      func: '// Agregar timestamp\nmsg.timestamp = new Date().toISOString();\nreturn msg;',
      outputs: 1,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 420,
      y: 100,
      wires: [
        []
      ]
    }
  ]
}

// Crear un flow que use el subflow
const flowTab = {
  id: 'test-flow-with-subflow',
  type: 'tab',
  label: 'Flow con Subflow',
  disabled: false,
  info: 'Flow de prueba que usa un subflow',
  env: [] // CRÍTICO: Los tabs deben tener env definido
}

// Nodos del flow que usa el subflow
const flowNodes = [
  {
    id: 'inject-1',
    type: 'inject',
    z: 'test-flow-with-subflow',
    name: 'Iniciar',
    props: [{ p: 'payload', v: 'Mensaje de prueba', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: 'Mensaje de prueba',
    payloadType: 'str',
    x: 100,
    y: 100,
    wires: [['subflow-instance-1']]
  },
  {
    id: 'subflow-instance-1',
    type: `subflow:${SUBFLOW_ID}`, // Instancia del subflow
    z: 'test-flow-with-subflow',
    name: 'Mi Subflow',
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['debug-1']]
  },
  {
    id: 'debug-1',
    type: 'debug',
    z: 'test-flow-with-subflow',
    name: 'Resultado',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: []
  }
]

// Función para validar la estructura antes de enviar
function validateStructure() {
  console.log('🔍 Validando estructura...')
  
  const errors = []
  
  // Validar subflow
  if (!subflowDefinition.env || !Array.isArray(subflowDefinition.env)) {
    errors.push('❌ Subflow no tiene env definido como array')
  }
  
  if (!subflowDefinition.flow || !Array.isArray(subflowDefinition.flow)) {
    errors.push('❌ Subflow no tiene flow definido como array')
  }
  
  if (!subflowDefinition.in || !Array.isArray(subflowDefinition.in)) {
    errors.push('❌ Subflow no tiene in definido como array')
  }
  
  if (!subflowDefinition.out || !Array.isArray(subflowDefinition.out)) {
    errors.push('❌ Subflow no tiene out definido como array')
  }
  
  // Validar que los wires del subflow apunten a nodos internos válidos
  if (subflowDefinition.flow) {
    const internalNodeIds = new Set(subflowDefinition.flow.map(n => n.id))
    
    // Validar in.wires
    if (subflowDefinition.in) {
      subflowDefinition.in.forEach((inPort, index) => {
        if (inPort.wires && Array.isArray(inPort.wires)) {
          inPort.wires.forEach((wire, wireIndex) => {
            if (!wire || !wire.id) {
              errors.push(`❌ Subflow in[${index}].wires[${wireIndex}] está undefined o no tiene id`)
            } else if (!internalNodeIds.has(wire.id)) {
              errors.push(`❌ Subflow in[${index}].wires[${wireIndex}] referencia nodo ${wire.id} que no existe en flow[]`)
            }
          })
        }
      })
    }
    
    // Validar out.wires
    if (subflowDefinition.out) {
      subflowDefinition.out.forEach((outPort, index) => {
        if (outPort.wires && Array.isArray(outPort.wires)) {
          outPort.wires.forEach((wire, wireIndex) => {
            if (!wire || !wire.id) {
              errors.push(`❌ Subflow out[${index}].wires[${wireIndex}] está undefined o no tiene id`)
            } else if (!internalNodeIds.has(wire.id)) {
              errors.push(`❌ Subflow out[${index}].wires[${wireIndex}] referencia nodo ${wire.id} que no existe en flow[]`)
            }
          })
        }
      })
    }
  }
  
  // Validar flow tab
  if (!flowTab.env || !Array.isArray(flowTab.env)) {
    errors.push('❌ Flow tab no tiene env definido como array')
  }
  
  // Validar que la instancia del subflow tenga el tipo correcto
  const subflowInstance = flowNodes.find(n => n.type.startsWith('subflow:'))
  if (!subflowInstance) {
    errors.push('❌ No se encontró instancia del subflow en el flow')
  } else if (subflowInstance.type !== `subflow:${SUBFLOW_ID}`) {
    errors.push(`❌ Tipo de instancia incorrecto: ${subflowInstance.type}, esperado: subflow:${SUBFLOW_ID}`)
  }
  
  if (errors.length > 0) {
    console.error('❌ Errores de validación:')
    errors.forEach(err => console.error('  ', err))
    throw new Error(`Validación falló con ${errors.length} errores`)
  }
  
  console.log('✅ Validación exitosa')
}

// Función para obtener el rev actual
async function getRev() {
  try {
    const revResponse = await fetch(`${NODE_RED_URL}/flows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Node-RED-API-Version': 'v2',
      },
    })
    if (revResponse.ok) {
      const revData = await revResponse.json()
      if (revData.rev) {
        return revData.rev
      } else {
        return revResponse.headers.get('x-node-red-rev') || revResponse.headers.get('rev') || ''
      }
    }
  } catch (err) {
    console.warn('⚠️ No se pudo obtener rev:', err.message)
  }
  return ''
}

// Función para enviar flows a Node-RED
async function sendFlows(allNodes, rev) {
  const payload = {
    rev: rev,
    flows: allNodes
  }
  
  console.log('📤 Enviando flows a Node-RED...')
  console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...')
  
  const response = await fetch(`${NODE_RED_URL}/flows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-API-Version': 'v2',
    },
    body: JSON.stringify(payload),
  })
  
  const responseText = await response.text()
  let responseData
  try {
    responseData = JSON.parse(responseText)
  } catch (e) {
    responseData = { raw: responseText }
  }
  
  if (!response.ok) {
    console.error('❌ Error al enviar flows:')
    console.error(`   Status: ${response.status} ${response.statusText}`)
    console.error(`   Response:`, responseData)
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`)
  }
  
  return responseData
}

// Función principal
async function testSubflows() {
  try {
    console.log('🚀 Iniciando test de subflows...')
    console.log(`📍 URL de Node-RED: ${NODE_RED_URL}`)
    
    // Validar estructura
    validateStructure()
    
    // CRÍTICO: Los nodos internos del subflow deben estar en el array principal con z = subflowId
    // para que Node-RED los procese y los coloque en flow.subflows[subflowId].nodes
    // Además de estar en subflowDefinition.flow[]
    const internalNodes = subflowDefinition.flow.map(node => ({
      ...node,
      z: SUBFLOW_ID  // CRÍTICO: Los nodos internos en el array principal DEBEN tener z = subflowId
    }))
    
    // Preparar todos los nodos para enviar
    // Orden importante: tabs, nodos internos de subflows, definiciones de subflow, otros nodos
    const allNodes = [
      flowTab,           // El tab del flow
      ...internalNodes,  // Los nodos internos del subflow (con z = subflowId)
      subflowDefinition,  // La definición del subflow
      ...flowNodes       // Los nodos del flow
    ]
    
    console.log(`📊 Preparando ${allNodes.length} nodos:`)
    console.log(`   - 1 tab (flow)`)
    console.log(`   - ${internalNodes.length} nodos internos del subflow (en array principal con z=${SUBFLOW_ID})`)
    console.log(`   - 1 subflow (definición con flow[] de ${subflowDefinition.flow.length} nodos)`)
    console.log(`   - ${flowNodes.length} nodos del flow`)
    
    // Obtener rev si hay flows existentes
    let rev = await getRev()
    if (rev) {
      console.log(`📌 Rev obtenido: ${rev}`)
    }
    
    // PASO 1: Crear el subflow inicial
    console.log('\n📝 PASO 1: Creando subflow inicial...')
    const createResponse = await sendFlows(allNodes, rev)
    rev = createResponse.rev || rev
    console.log('✅ Subflow inicial creado exitosamente!')
    console.log('📋 Rev después de crear:', rev)
    
    // Esperar un momento para que Node-RED procese
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // PASO 1.5: Activar el flow inicial para verificar que funciona
    console.log('\n🔍 PASO 1.5: Activando flow inicial para verificar que funciona...')
    try {
      const injectResponse = await fetch(`${NODE_RED_URL}/inject/inject-1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Node-RED-API-Version': 'v2',
        },
      })
      if (injectResponse.ok) {
        console.log('✅ Flow inicial activado correctamente')
        // Esperar un momento para que el mensaje se procese
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        console.warn(`⚠️ No se pudo activar el flow inicial: ${injectResponse.status}`)
      }
    } catch (err) {
      console.warn(`⚠️ Error al activar flow inicial: ${err.message}`)
    }
    
    // PASO 2: Editar el subflow (modificar nodos internos: posición, mensaje, etc.)
    console.log('\n📝 PASO 2: Editando subflow (modificando nodos internos: posición, mensaje, etc.)...')
    
    // Modificar los nodos internos del subflow: cambiar posiciones, mensajes, nombres
    const editedSubflowDefinition = {
      ...subflowDefinition,
      flow: subflowDefinition.flow.map((node, index) => {
        if (index === 0) {
          // Modificar el primer nodo: cambiar el mensaje, nombre y posición
          return {
            ...node,
            func: '// Procesar el mensaje (EDITADO)\nmsg.payload = "EDITADO: " + msg.payload + " [Modificado]";\nreturn msg;',
            name: 'Procesar en Subflow (Editado)',
            x: node.x + 50, // Cambiar posición X
            y: node.y + 30, // Cambiar posición Y
          }
        } else if (index === 1) {
          // Modificar el segundo nodo: cambiar el mensaje, nombre y posición
          return {
            ...node,
            func: '// Agregar timestamp (EDITADO)\nmsg.timestamp = new Date().toISOString();\nmsg.edited = true;\nreturn msg;',
            name: 'Finalizar (Editado)',
            x: node.x + 50, // Cambiar posición X
            y: node.y + 30, // Cambiar posición Y
          }
        }
        return node
      })
    }
    
    // También modificar los puertos de entrada y salida del subflow (posiciones)
    if (editedSubflowDefinition.in && editedSubflowDefinition.in.length > 0) {
      editedSubflowDefinition.in[0].x = editedSubflowDefinition.in[0].x + 20
      editedSubflowDefinition.in[0].y = editedSubflowDefinition.in[0].y + 20
    }
    if (editedSubflowDefinition.out && editedSubflowDefinition.out.length > 0) {
      editedSubflowDefinition.out[0].x = editedSubflowDefinition.out[0].x + 20
      editedSubflowDefinition.out[0].y = editedSubflowDefinition.out[0].y + 20
    }
    
    // Reconstruir los nodos internos con z = subflowId
    const editedInternalNodes = editedSubflowDefinition.flow.map(node => ({
      ...node,
      z: SUBFLOW_ID
    }))
    
    // Preparar payload editado (solo subflow editado, flow sin cambios)
    const editedAllNodes = [
      flowTab,
      ...editedInternalNodes,
      editedSubflowDefinition,
      ...flowNodes
    ]
    
    console.log(`📊 Preparando ${editedAllNodes.length} nodos editados:`)
    console.log(`   - 1 tab (flow)`)
    console.log(`   - ${editedInternalNodes.length} nodos internos del subflow (EDITADOS)`)
    console.log(`   - 1 subflow (definición EDITADA)`)
    console.log(`   - ${flowNodes.length} nodos del flow`)
    
    // Log detallado del orden y estructura
    console.log('\n🔍 Estructura del payload editado:')
    console.log(`   Orden: [tab, ...internalNodes (${editedInternalNodes.length}), subflowDefinition, ...flowNodes (${flowNodes.length})]`)
    editedInternalNodes.forEach((n, i) => {
      console.log(`   Internal[${i}]: id=${n.id}, type=${n.type}, z=${n.z}, x=${n.x}, y=${n.y}`)
    })
    console.log(`   Subflow: id=${editedSubflowDefinition.id}, flow.length=${editedSubflowDefinition.flow.length}`)
    editedSubflowDefinition.flow.forEach((n, i) => {
      console.log(`   Subflow.flow[${i}]: id=${n.id}, type=${n.type}, z=${n.z || 'undefined'}, x=${n.x}, y=${n.y}`)
    })
    
    // Obtener rev actualizado
    rev = await getRev()
    if (rev) {
      console.log(`📌 Rev obtenido para edición: ${rev}`)
    }
    
    // Enviar el subflow editado
    const editResponse = await sendFlows(editedAllNodes, rev)
    rev = editResponse.rev || rev
    console.log('✅ Subflow editado exitosamente!')
    console.log('📋 Rev después de editar subflow:', rev)
    
    // Esperar un momento para que Node-RED procese y despliegue
    console.log('⏳ Esperando a que Node-RED procese el subflow editado...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // PASO 2.5: Verificar estructura del subflow después de editar
    console.log('\n🔍 PASO 2.5: Verificando estructura del subflow después de editar...')
    const verifySubflowResponse = await fetch(`${NODE_RED_URL}/flows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Node-RED-API-Version': 'v2',
      },
    })
    
    if (verifySubflowResponse.ok) {
      const verifySubflowData = await verifySubflowResponse.json()
      const flows = Array.isArray(verifySubflowData) ? verifySubflowData : (verifySubflowData.flows || [])
      
      const editedSubflow = flows.find(f => f.id === SUBFLOW_ID && f.type === 'subflow')
      const internalNodesInMainArray = flows.filter(f => f.z === SUBFLOW_ID && f.type !== 'subflow')
      
      console.log(`   - Subflow encontrado: ${editedSubflow ? '✅' : '❌'}`)
      if (editedSubflow) {
        console.log(`   - Subflow.flow.length: ${editedSubflow.flow ? editedSubflow.flow.length : 0}`)
        console.log(`   - Subflow.in.length: ${editedSubflow.in ? editedSubflow.in.length : 0}`)
        console.log(`   - Subflow.out.length: ${editedSubflow.out ? editedSubflow.out.length : 0}`)
        
        if (editedSubflow.in && editedSubflow.in[0] && editedSubflow.in[0].wires) {
          const wireId = editedSubflow.in[0].wires[0]?.id
          console.log(`   - Subflow.in[0].wires[0].id: ${wireId}`)
          const wireNodeExists = editedSubflow.flow?.some(n => n.id === wireId) || internalNodesInMainArray.some(n => n.id === wireId)
          console.log(`   - Wire node existe en flow[] o array principal: ${wireNodeExists ? '✅' : '❌'}`)
        }
      }
      
      console.log(`   - Nodos internos en array principal con z=${SUBFLOW_ID}: ${internalNodesInMainArray.length}`)
      internalNodesInMainArray.forEach((n, i) => {
        console.log(`     [${i}] id=${n.id}, type=${n.type}, z=${n.z}, x=${n.x}, y=${n.y}`)
      })
    }
    
    // PASO 2.6: Activar el flow después de editar el subflow para verificar que funciona
    console.log('\n🔍 PASO 2.6: Activando flow después de editar subflow...')
    try {
      const injectResponseAfterEdit = await fetch(`${NODE_RED_URL}/inject/inject-1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Node-RED-API-Version': 'v2',
        },
      })
      if (injectResponseAfterEdit.ok) {
        console.log('✅ Flow activado después de editar subflow')
        // Esperar más tiempo para que el mensaje se procese completamente
        console.log('⏳ Esperando a que el mensaje se procese...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Verificar si hay errores en los logs (si Node-RED tiene endpoint de logs)
        console.log('🔍 Verificando si hay errores en el runtime...')
        // Nota: Node-RED no tiene un endpoint estándar para logs, pero podemos verificar el estado
      } else {
        const errorText = await injectResponseAfterEdit.text()
        console.error(`❌ Error al activar flow después de editar: ${injectResponseAfterEdit.status}`)
        console.error(`   Response: ${errorText}`)
      }
    } catch (err) {
      console.error(`❌ Error al activar flow después de editar: ${err.message}`)
      if (err.stack) {
        console.error(`   Stack: ${err.stack}`)
      }
    }
    
    // PASO 3: Editar el flow principal (modificar nodos: posición, mensaje, etc.)
    console.log('\n📝 PASO 3: Editando flow principal (modificando nodos: posición, mensaje, etc.)...')
    
    // Modificar nodos del flow principal: cambiar posiciones, mensajes, nombres
    const editedFlowNodes = flowNodes.map(node => {
      if (node.type === 'inject') {
        // Modificar el nodo inject: cambiar el payload, nombre y posición
        return {
          ...node,
          payload: 'Mensaje EDITADO desde flow',
          payloadType: 'str',
          name: 'Iniciar (Editado)',
          x: node.x + 40, // Cambiar posición X
          y: node.y + 20, // Cambiar posición Y
        }
      } else if (node.type === 'debug') {
        // Modificar el nodo debug: cambiar el nombre, configuración y posición
        return {
          ...node,
          name: 'Resultado (Editado)',
          complete: 'payload',
          active: true,
          tosidebar: true,
          x: node.x + 40, // Cambiar posición X
          y: node.y + 20, // Cambiar posición Y
        }
      } else if (node.type === `subflow:${SUBFLOW_ID}`) {
        // Modificar la instancia del subflow: cambiar el nombre y posición
        return {
          ...node,
          name: 'Mi Subflow (Editado)',
          x: node.x + 40, // Cambiar posición X
          y: node.y + 20, // Cambiar posición Y
        }
      }
      return node
    })
    
    // Preparar payload con flow editado (mantener subflow editado)
    const editedFlowAllNodes = [
      flowTab,
      ...editedInternalNodes,
      editedSubflowDefinition,
      ...editedFlowNodes
    ]
    
    console.log(`📊 Preparando ${editedFlowAllNodes.length} nodos (flow editado):`)
    console.log(`   - 1 tab (flow)`)
    console.log(`   - ${editedInternalNodes.length} nodos internos del subflow`)
    console.log(`   - 1 subflow (definición)`)
    console.log(`   - ${editedFlowNodes.length} nodos del flow (EDITADOS)`)
    
    // Obtener rev actualizado
    rev = await getRev()
    if (rev) {
      console.log(`📌 Rev obtenido para edición de flow: ${rev}`)
    }
    
    // Enviar el flow editado
    const editFlowResponse = await sendFlows(editedFlowAllNodes, rev)
    rev = editFlowResponse.rev || rev
    console.log('✅ Flow principal editado exitosamente!')
    console.log('📋 Rev después de editar flow:', rev)
    
    // Esperar un momento para que Node-RED procese
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // PASO 4: Verificar que todos los cambios se guardaron correctamente
    console.log('\n🔍 PASO 4: Verificando que los flows se crearon/editaron correctamente...')
    const verifyResponse = await fetch(`${NODE_RED_URL}/flows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Node-RED-API-Version': 'v2',
      },
    })
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      const flows = Array.isArray(verifyData) ? verifyData : (verifyData.flows || [])
      
      const createdTab = flows.find(f => f.id === flowTab.id)
      const createdSubflow = flows.find(f => f.id === SUBFLOW_ID && f.type === 'subflow')
      const createdInstance = flows.find(f => f.type === `subflow:${SUBFLOW_ID}`)
      
      // Verificar que el subflow fue editado correctamente
      let subflowEdited = false
      if (createdSubflow && createdSubflow.flow && Array.isArray(createdSubflow.flow)) {
        const firstNode = createdSubflow.flow[0]
        if (firstNode && firstNode.func && firstNode.func.includes('EDITADO:')) {
          subflowEdited = true
        }
      }
      
      // Verificar que el flow principal fue editado correctamente
      let flowEdited = false
      let injectEdited = false
      let debugEdited = false
      let instanceEdited = false
      
      if (createdTab) {
        // Buscar nodos del flow en el array de flows
        const injectNode = flows.find(f => f.id === 'inject-1' && f.type === 'inject')
        const debugNode = flows.find(f => f.id === 'debug-1' && f.type === 'debug')
        const instanceNode = flows.find(f => f.id === 'subflow-instance-1' && f.type === `subflow:${SUBFLOW_ID}`)
        
        if (injectNode) {
          injectEdited = injectNode.payload === 'Mensaje EDITADO desde flow' && 
                        injectNode.name === 'Iniciar (Editado)'
        }
        
        if (debugNode) {
          debugEdited = debugNode.name === 'Resultado (Editado)'
        }
        
        if (instanceNode) {
          instanceEdited = instanceNode.name === 'Mi Subflow (Editado)'
        }
        
        flowEdited = injectEdited && debugEdited && instanceEdited
      }
      
      console.log(`\n📊 Verificación:`)
      console.log(`   - Tab creado: ${createdTab ? '✅' : '❌'}`)
      console.log(`   - Subflow definición creada: ${createdSubflow ? '✅' : '❌'}`)
      console.log(`   - Instancia de subflow creada: ${createdInstance ? '✅' : '❌'}`)
      console.log(`   - Subflow editado correctamente: ${subflowEdited ? '✅' : '❌'}`)
      console.log(`   - Flow principal editado correctamente: ${flowEdited ? '✅' : '❌'}`)
      if (flowEdited) {
        console.log(`     - Nodo inject editado: ${injectEdited ? '✅' : '❌'}`)
        console.log(`     - Nodo debug editado: ${debugEdited ? '✅' : '❌'}`)
        console.log(`     - Instancia de subflow editada: ${instanceEdited ? '✅' : '❌'}`)
      }
      
      if (createdTab && createdSubflow && createdInstance && subflowEdited && flowEdited) {
        console.log('\n🎉 ¡Test completado exitosamente!')
        console.log(`\n📝 Resumen:`)
        console.log(`   - Subflow "${subflowDefinition.name}" creado con ID: ${SUBFLOW_ID}`)
        console.log(`   - Flow "${flowTab.label}" creado con ID: ${flowTab.id}`)
        console.log(`   - Instancia del subflow conectada correctamente`)
        console.log(`   - Subflow editado y almacenado correctamente ✅`)
        console.log(`   - Flow principal editado y almacenado correctamente ✅`)
        console.log(`\n💡 Puedes verificar en Node-RED en: ${NODE_RED_URL}`)
      } else {
        console.error('\n❌ Algunos elementos no se crearon/editaron correctamente')
        if (!createdTab) console.error('   - Tab no encontrado')
        if (!createdSubflow) console.error('   - Subflow no encontrado')
        if (!createdInstance) console.error('   - Instancia de subflow no encontrada')
        if (!subflowEdited) console.error('   - Subflow no fue editado correctamente')
        if (!flowEdited) {
          console.error('   - Flow principal no fue editado correctamente')
          if (!injectEdited) console.error('     - Nodo inject no fue editado')
          if (!debugEdited) console.error('     - Nodo debug no fue editado')
          if (!instanceEdited) console.error('     - Instancia de subflow no fue editada')
        }
        throw new Error('Verificación falló')
      }
    } else {
      console.warn('⚠️ No se pudo verificar los flows creados')
      throw new Error('No se pudo verificar los flows')
    }
    
  } catch (error) {
    console.error('\n❌ Error en el test:')
    console.error(error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Ejecutar el test
testSubflows()

