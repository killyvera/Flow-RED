/**
 * Script para crear múltiples flows de ejemplo en Node-RED
 * 
 * Uso: node scripts/seed-flows.js
 * 
 * Requiere que Node-RED esté corriendo en http://localhost:1880
 * 
 * Este script crea varios flows de ejemplo que demuestran:
 * - Diferentes tipos de nodos
 * - Nodos disabled
 * - Nodos con status (error, warning, info)
 * - Flows complejos con múltiples conexiones
 * - GRUPOS con nodos agrupados visualmente
 * - Nodos con propiedades complejas (props, rules, libs, headers)
 * - Posiciones bien distribuidas para evitar encimamiento
 */

const NODE_RED_URL = process.env.NODE_RED_URL || 'http://localhost:1880'

// Helper para generar IDs únicos
let nodeIdCounter = 1
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${nodeIdCounter++}`
}

// Constantes para espaciado
const NODE_WIDTH = 160
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 250
const VERTICAL_SPACING = 120
const GROUP_PADDING = 40

// Flow 1: Flow básico con inject, function y debug
const flow1 = {
  id: 'flow1',
  type: 'tab',
  label: 'Flow Básico',
  disabled: false,
  info: 'Flow básico con nodos inject, function y debug',
  env: []
}

const flow1Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow1',
    name: 'Trigger cada 5 segundos',
    props: [{ p: 'payload', v: '', vt: 'date' }],
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
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
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
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: []
  }
]

// Flow 2: Flow con GRUPOS y nodos agrupados
const flow2 = {
  id: 'flow2',
  type: 'tab',
  label: 'Flow con Grupos',
  disabled: false,
  info: 'Flow que muestra grupos visuales con nodos agrupados',
  env: []
}

// Grupo 1: Procesamiento de datos (izquierda)
const group1 = {
  id: generateId('group'),
  type: 'group',
  z: 'flow2',
  name: 'Procesamiento de Datos',
  label: 'Procesamiento de Datos',
  x: 50,
  y: 50,
  w: 700,
  h: 250
}

// Grupo 2: Salida (derecha)
const group2 = {
  id: generateId('group'),
  type: 'group',
  z: 'flow2',
  name: 'Salida',
  label: 'Salida',
  x: 800,
  y: 50,
  w: 300,
  h: 200
}

// Calcular posiciones dentro del grupo 1 (relativas al grupo + padding)
const group1StartX = group1.x + GROUP_PADDING
const group1StartY = group1.y + GROUP_PADDING + 30 // +30 para el header

const flow2Nodes = [
  // Nodos dentro del Grupo 1 - bien distribuidos horizontalmente
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow2',
    g: group1.id,
    name: 'Entrada',
    props: [{ p: 'payload', v: '{"data":"test"}', vt: 'json' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"data":"test"}',
    payloadType: 'json',
    x: group1StartX,
    y: group1StartY,
    wires: [['json2']]
  },
  {
    id: 'json2',
    type: 'json',
    z: 'flow2',
    g: group1.id,
    name: 'Parse JSON',
    property: 'payload',
    action: '',
    pretty: false,
    x: group1StartX + HORIZONTAL_SPACING,
    y: group1StartY,
    wires: [['change2']]
  },
  {
    id: 'change2',
    type: 'change',
    z: 'flow2',
    g: group1.id,
    name: 'Transformar',
    rules: [
      { t: 'set', p: 'payload', pt: 'msg', to: 'payload.data', tot: 'msg' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: group1StartX + HORIZONTAL_SPACING * 2,
    y: group1StartY,
    wires: [['template1']]
  },
  {
    id: 'template1',
    type: 'template',
    z: 'flow2',
    g: group1.id,
    name: 'Template',
    field: 'payload',
    fieldType: 'msg',
    format: 'handlebars',
    syntax: 'mustache',
    output: 'str',
    template: 'Datos procesados: {{payload}}',
    x: group1StartX + HORIZONTAL_SPACING * 3,
    y: group1StartY,
    wires: [['debug2']]
  },
  // Nodos dentro del Grupo 2
  {
    id: 'debug2',
    type: 'debug',
    z: 'flow2',
    g: group2.id,
    name: 'Debug Final',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: group2.x + GROUP_PADDING,
    y: group2.y + GROUP_PADDING + 30,
    wires: []
  },
  // Nodos fuera de grupos - bien posicionados
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow2',
    name: 'Nodo Sin Grupo',
    props: [{ p: 'payload', v: 'test', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: 'test',
    payloadType: 'str',
    x: 100,
    y: 350,
    wires: [['debug3']]
  },
  {
    id: 'debug3',
    type: 'debug',
    z: 'flow2',
    name: 'Debug Sin Grupo',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING,
    y: 350,
    wires: []
  },
  // Agregar los grupos al array de nodos
  group1,
  group2
]

// Flow 3: Flow complejo con múltiples grupos y nodos con propiedades complejas
const flow3 = {
  id: 'flow3',
  type: 'tab',
  label: 'Flow Complejo con Grupos',
  disabled: false,
  info: 'Flow complejo con grupos, switch, change, delay y propiedades complejas',
  env: []
}

// Grupo 3: Entrada y Switch
const group3 = {
  id: generateId('group'),
  type: 'group',
  z: 'flow3',
  name: 'Entrada y Routing',
  label: 'Entrada y Routing',
  x: 50,
  y: 50,
  w: 600,
  h: 300
}

// Grupo 4: Procesamiento
const group4 = {
  id: generateId('group'),
  type: 'group',
  z: 'flow3',
  name: 'Procesamiento',
  label: 'Procesamiento',
  x: 700,
  y: 50,
  w: 800,
  h: 400
}

// Posiciones dentro de los grupos
const group3StartX = group3.x + GROUP_PADDING
const group3StartY = group3.y + GROUP_PADDING + 30
const group4StartX = group4.x + GROUP_PADDING
const group4StartY = group4.y + GROUP_PADDING + 30

const flow3Nodes = [
  // Nodos dentro del Grupo 3
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow3',
    g: group3.id,
    name: 'Entrada 1',
    props: [{ p: 'payload', v: '1', vt: 'num' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '1',
    payloadType: 'num',
    x: group3StartX,
    y: group3StartY,
    wires: [['switch1']]
  },
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow3',
    g: group3.id,
    name: 'Entrada 2',
    props: [{ p: 'payload', v: '2', vt: 'num' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '2',
    payloadType: 'num',
    x: group3StartX,
    y: group3StartY + VERTICAL_SPACING,
    wires: [['switch1']]
  },
  {
    id: 'switch1',
    type: 'switch',
    z: 'flow3',
    g: group3.id,
    name: 'Switch',
    property: 'payload',
    propertyType: 'msg',
    rules: [
      { t: 'eq', v: '1', vt: 'num' },
      { t: 'eq', v: '2', vt: 'num' }
    ],
    checkall: 'true',
    repair: false,
    outputs: 2,
    x: group3StartX + HORIZONTAL_SPACING,
    y: group3StartY + VERTICAL_SPACING / 2,
    wires: [['change3'], ['change4']]
  },
  // Nodos dentro del Grupo 4
  {
    id: 'change3',
    type: 'change',
    z: 'flow3',
    g: group4.id,
    name: 'Change 1',
    rules: [
      { t: 'set', p: 'payload', pt: 'msg', to: 'Procesado 1: ', tot: 'str' },
      { t: 'set', p: 'payload', pt: 'msg', to: 'payload + msg.payload', tot: 'jsonata' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: group4StartX,
    y: group4StartY,
    wires: [['delay1']]
  },
  {
    id: 'change4',
    type: 'change',
    z: 'flow3',
    g: group4.id,
    name: 'Change 2',
    rules: [
      { t: 'set', p: 'payload', pt: 'msg', to: 'Procesado 2: ', tot: 'str' },
      { t: 'set', p: 'payload', pt: 'msg', to: 'payload + msg.payload', tot: 'jsonata' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: group4StartX,
    y: group4StartY + VERTICAL_SPACING,
    wires: [['delay2']]
  },
  {
    id: 'delay1',
    type: 'delay',
    z: 'flow3',
    g: group4.id,
    name: 'Delay 500ms',
    pauseType: 'delay',
    timeout: '0.5',
    timeoutUnits: 'seconds',
    rate: '1',
    nbRateUnits: '1',
    rateUnits: 'second',
    randomFirst: '1',
    randomLast: '5',
    randomUnits: 'seconds',
    drop: false,
    allowrate: false,
    outputs: 1,
    x: group4StartX + HORIZONTAL_SPACING,
    y: group4StartY,
    wires: [['join1']]
  },
  {
    id: 'delay2',
    type: 'delay',
    z: 'flow3',
    g: group4.id,
    name: 'Delay 1s',
    pauseType: 'delay',
    timeout: '1',
    timeoutUnits: 'seconds',
    rate: '1',
    nbRateUnits: '1',
    rateUnits: 'second',
    randomFirst: '1',
    randomLast: '5',
    randomUnits: 'seconds',
    drop: false,
    allowrate: false,
    outputs: 1,
    x: group4StartX + HORIZONTAL_SPACING,
    y: group4StartY + VERTICAL_SPACING,
    wires: [['join1']]
  },
  {
    id: 'join1',
    type: 'join',
    z: 'flow3',
    g: group4.id,
    name: 'Join',
    mode: 'auto',
    build: 'object',
    property: 'payload',
    propertyType: 'msg',
    key: 'topic',
    joiner: '\n',
    joinerType: 'str',
    accumulate: false,
    timeout: '',
    count: '2',
    reduceRight: false,
    reduceExp: '',
    reduceInit: '',
    reduceInitType: '',
    reduceFixup: '',
    x: group4StartX + HORIZONTAL_SPACING * 2,
    y: group4StartY + VERTICAL_SPACING / 2,
    wires: [['debug4']]
  },
  {
    id: 'debug4',
    type: 'debug',
    z: 'flow3',
    g: group4.id,
    name: 'Debug Final',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: group4StartX + HORIZONTAL_SPACING * 3,
    y: group4StartY + VERTICAL_SPACING / 2,
    wires: []
  },
  // Agregar los grupos
  group3,
  group4
]

// Flow 4: Flow con nodos disabled y diferentes estados
const flow4 = {
  id: 'flow4',
  type: 'tab',
  label: 'Flow con Estados',
  disabled: false,
  info: 'Flow que muestra nodos disabled y diferentes estados',
  env: []
}

const flow4Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow4',
    name: 'Trigger Manual',
    props: [{ p: 'payload', v: 'test', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: 'test',
    payloadType: 'str',
    x: 100,
    y: 100,
    wires: [['function2']]
  },
  {
    id: 'function2',
    type: 'function',
    z: 'flow4',
    name: 'Nodo Habilitado',
    func: 'return msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['debug5']]
  },
  {
    id: 'debug5',
    type: 'debug',
    z: 'flow4',
    name: 'Debug Activo',
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
  },
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow4',
    name: 'Nodo Disabled',
    props: [{ p: 'payload', v: '', vt: 'date' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '',
    payloadType: 'date',
    disabled: true,
    x: 100,
    y: 100 + VERTICAL_SPACING,
    wires: [['function3']]
  },
  {
    id: 'function3',
    type: 'function',
    z: 'flow4',
    name: 'Nodo Disabled',
    func: 'return msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    disabled: true,
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING,
    wires: [['debug6']]
  },
  {
    id: 'debug6',
    type: 'debug',
    z: 'flow4',
    name: 'Debug Disabled',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    disabled: true,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING,
    wires: []
  }
]

// Flow 5: Flow con HTTP Request y propiedades complejas
const flow5 = {
  id: 'flow5',
  type: 'tab',
  label: 'Flow HTTP Request',
  disabled: false,
  info: 'Flow con HTTP Request y headers complejos',
  env: []
}

const flow5Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow5',
    name: 'Trigger HTTP',
    props: [{ p: 'payload', v: '', vt: 'date' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '',
    payloadType: 'date',
    x: 100,
    y: 100,
    wires: [['http1']]
  },
  {
    id: 'http1',
    type: 'http request',
    z: 'flow5',
    name: 'GET Request',
    method: 'GET',
    url: 'https://httpbin.org/get',
    paytoqs: 'ignore',
    ret: 'txt',
    usetls: false,
    tls: '',
    useAuth: false,
    authType: '',
    persist: false,
    useProxy: false,
    proxy: '',
    senderr: false,
    insecureHTTPParser: false,
    headers: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'User-Agent', value: 'Node-RED-Editor' }
    ],
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['debug7']]
  },
  {
    id: 'debug7',
    type: 'debug',
    z: 'flow5',
    name: 'HTTP Response',
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

// Combinar todos los flows
const allFlows = [
  flow1,
  ...flow1Nodes,
  flow2,
  ...flow2Nodes,
  flow3,
  ...flow3Nodes,
  flow4,
  ...flow4Nodes,
  flow5,
  ...flow5Nodes
]

async function seedFlows() {
  try {
    console.log('🌱 Iniciando seed de flows de ejemplo...')
    console.log(`📡 Conectando a Node-RED en ${NODE_RED_URL}`)
    
    // Primero, obtener flows existentes
    let existingFlows = []
    let rev = null
    try {
      const getResponse = await fetch(`${NODE_RED_URL}/flows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Node-RED-API-Version': 'v2',
        },
      })
      if (getResponse.ok) {
        const responseData = await getResponse.json()
        // Manejar tanto v1 (array) como v2 (objeto con flows)
        if (Array.isArray(responseData)) {
          existingFlows = responseData
        } else if (responseData.flows && Array.isArray(responseData.flows)) {
          existingFlows = responseData.flows
          rev = responseData.rev || getResponse.headers.get('x-node-red-rev') || getResponse.headers.get('rev')
        } else {
          existingFlows = []
        }
        const existingFlowTabs = existingFlows.filter(n => n.type === 'tab')
        console.log(`📋 Flows existentes encontrados: ${existingFlowTabs.length}`)
        if (existingFlowTabs.length > 0 && !rev) {
          rev = getResponse.headers.get('x-node-red-rev') || getResponse.headers.get('rev')
        }
      }
    } catch (err) {
      console.warn('⚠️ No se pudieron obtener flows existentes, continuando...', err.message)
      existingFlows = []
    }

    // Reemplazar completamente los flows existentes con los nuevos
    // Esto evita duplicados y nodos encimados
    // Si un flow existe (mismo ID), lo reemplazamos completamente
    const existingFlowIds = new Set(existingFlows.filter(f => f.type === 'tab').map(f => f.id))
    
    // Filtrar flows existentes que NO están en nuestros nuevos flows
    // Y agregar/reemplazar con nuestros flows nuevos
    const flowsToKeep = existingFlows.filter(f => {
      // Mantener solo config nodes y otros nodos que no sean tabs ni nodos de nuestros flows
      if (f.type === 'tab') {
        return false // Eliminar todos los tabs existentes
      }
      // Mantener config nodes y otros nodos especiales que no pertenezcan a nuestros flows
      const ourFlowIds = new Set([flow1.id, flow2.id, flow3.id, flow4.id, flow5.id])
      if (f.z && ourFlowIds.has(f.z)) {
        return false // Eliminar nodos que pertenecen a nuestros flows
      }
      return true // Mantener config nodes y otros nodos que no pertenecen a nuestros flows
    })
    
    // Usar nuestros flows nuevos (que reemplazan los existentes)
    const flowsToSend = [...flowsToKeep, ...allFlows]

    // Enviar todos los flows
    console.log('📤 Enviando flows de ejemplo a Node-RED...')
    console.log(`   - Flow 1: Flow Básico (${flow1Nodes.length} nodos)`)
    console.log(`   - Flow 2: Flow con Grupos (${flow2Nodes.length} nodos, 2 grupos)`)
    console.log(`   - Flow 3: Flow Complejo con Grupos (${flow3Nodes.length} nodos, 2 grupos)`)
    console.log(`   - Flow 4: Flow con Estados (${flow4Nodes.length} nodos)`)
    console.log(`   - Flow 5: Flow HTTP Request (${flow5Nodes.length} nodos)`)
    if (existingFlows.length > 0) {
      console.log(`   🔄 Reemplazando flows existentes con versiones limpias`)
    }
    
    // Si no hay rev y hay flows existentes, intentar obtener rev primero
    if (!rev && existingFlows.length > 0) {
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
            rev = revData.rev
          } else {
            rev = revResponse.headers.get('x-node-red-rev') || revResponse.headers.get('rev') || ''
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo obtener rev, continuando sin él...', err.message)
        rev = ''
      }
    }

    // Node-RED API v2 espera un objeto con rev y flows
    const payload = {
      rev: rev || '',
      flows: flowsToSend,
    }

    const headers = {
      'Content-Type': 'application/json',
      'Node-RED-API-Version': 'v2',
    }

    const response = await fetch(`${NODE_RED_URL}/flows`, {
      method: 'POST', // Node-RED usa POST para actualizar flows (no PUT)
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('\n✅ Flows de ejemplo creados exitosamente!')
    console.log('📋 Resultado:', result)
    console.log('\n📊 Resumen:')
    console.log(`   - Total de flows creados: 5`)
    console.log(`   - Total de nodos creados: ${allFlows.filter(n => n.type !== 'tab' && n.type !== 'group').length}`)
    console.log(`   - Total de grupos creados: ${allFlows.filter(n => n.type === 'group').length}`)
    console.log('\n🔄 Recarga tu editor visual para ver los flows')
    console.log('💡 Usa el selector de flows en la barra superior para cambiar entre ellos')
    console.log('📦 Los grupos se mostrarán como contenedores visuales con fondo y bordes')
    console.log('🔽 Haz clic en el botón de colapsar/expandir en los grupos para ocultar/mostrar nodos')
    console.log('📍 Los nodos están bien distribuidos para evitar encimamiento')
  } catch (error) {
    console.error('❌ Error al crear flows:', error.message)
    if (error.message.includes('fetch')) {
      console.error('💡 Asegúrate de que Node-RED esté corriendo en', NODE_RED_URL)
    }
    process.exit(1)
  }
}

seedFlows()
