/**
 * Script para crear un flow de ejemplo en Node-RED
 * 
 * Uso: node scripts/create-sample-flow.js
 * 
 * Requiere que Node-RED esté corriendo en http://localhost:1880
 */

const NODE_RED_URL = process.env.NODE_RED_URL || 'http://localhost:1880'

// Flow de ejemplo con algunos nodos básicos
const sampleFlow = [
  {
    id: 'flow1',
    type: 'tab',
    label: 'Flow de Ejemplo',
    disabled: false,
    info: 'Flow de ejemplo para probar el editor visual',
    env: []
  },
  {
    id: 'inject1',
    type: 'inject',
    z: 'flow1',
    name: 'Trigger cada 5 segundos',
    props: [{ prop: 'payload', v: '', vt: 'date' }],
    repeat: '5',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '',
    payloadType: 'date',
    x: 100,
    y: 100,
    wires: [['function1']]
  },
  {
    id: 'function1',
    type: 'function',
    z: 'flow1',
    name: 'Procesar',
    func: 'msg.payload = "Hola desde Node-RED: " + new Date().toISOString();\nreturn msg;',
    outputs: 1,
    noerr: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 300,
    y: 100,
    wires: [['debug1']]
  },
  {
    id: 'debug1',
    type: 'debug',
    z: 'flow1',
    name: 'Debug',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 500,
    y: 100,
    wires: []
  }
]

async function createSampleFlow() {
  try {
    console.log('📤 Enviando flow de ejemplo a Node-RED...')
    
    const response = await fetch(`${NODE_RED_URL}/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Node-RED-API-Version': 'v2',
      },
      body: JSON.stringify({
        flows: sampleFlow,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Flow de ejemplo creado exitosamente!')
    console.log('📋 Resultado:', result)
    console.log('\n🔄 Recarga tu editor visual para ver el flow')
  } catch (error) {
    console.error('❌ Error al crear flow:', error.message)
    if (error.message.includes('fetch')) {
      console.error('💡 Asegúrate de que Node-RED esté corriendo en', NODE_RED_URL)
    }
    process.exit(1)
  }
}

createSampleFlow()

