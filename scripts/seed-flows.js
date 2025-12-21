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
    name: 'Trigger Manual',
    props: [{ p: 'payload', v: 'Hola desde Node-RED', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: 'Hola desde Node-RED',
    payloadType: 'str',
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

// Flow 6: Flow para demostrar estados de runtime (tiempo real)
const flow6 = {
  id: 'flow6',
  type: 'tab',
  label: 'Runtime Feedback Demo',
  disabled: false,
  info: 'Flow para demostrar estados de runtime en tiempo real (running, error, warning, idle)',
  env: []
}

const flow6Nodes = [
  // Trigger manual para demostrar estados
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow6',
    name: 'Trigger Manual',
    props: [{ p: 'payload', v: '{"test": true, "timestamp": ""}', vt: 'json' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"test": true, "timestamp": ""}',
    payloadType: 'json',
    x: 100,
    y: 100,
    wires: [['function_running', 'function_error', 'function_warning']]
  },
  // Nodo que muestra estado "running"
  {
    id: 'function_running',
    type: 'function',
    z: 'flow6',
    name: 'Nodo Running',
    func: '// Establecer estado "running" (verde)\nnode.status({fill:"green",shape:"dot",text:"Procesando datos..."});\n\n// Simular procesamiento\nmsg.payload = {\n  ...msg.payload,\n  processed: true,\n  node: "running",\n  timestamp: new Date().toISOString()\n};\n\n// Limpiar estado después de 1 segundo\nsetTimeout(() => {\n  node.status({fill:"grey",shape:"dot",text:"Completado"});\n}, 1000);\n\nreturn msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 50,
    wires: [['debug_running']]
  },
  {
    id: 'debug_running',
    type: 'debug',
    z: 'flow6',
    name: 'Debug Running',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 50,
    wires: []
  },
  // Nodo que muestra estado "error"
  {
    id: 'function_error',
    type: 'function',
    z: 'flow6',
    name: 'Nodo con Error',
    func: '// Simular error ocasionalmente\nconst shouldError = Math.random() > 0.3;\n\nif (shouldError) {\n  // Estado de error (rojo)\n  node.status({fill:"red",shape:"ring",text:"Error: valor inválido"});\n  msg.error = "Error simulado";\n  \n  // Limpiar después de 2 segundos\n  setTimeout(() => {\n    node.status({fill:"grey",shape:"dot",text:"Reintentando..."});\n  }, 2000);\n} else {\n  // Estado normal\n  node.status({fill:"green",shape:"dot",text:"OK"});\n  setTimeout(() => {\n    node.status({fill:"grey",shape:"dot"});\n  }, 1000);\n}\n\nmsg.payload = {\n  ...msg.payload,\n  processed: true,\n  node: "error",\n  hasError: shouldError,\n  timestamp: new Date().toISOString()\n};\n\nreturn msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 150,
    wires: [['debug_error']]
  },
  {
    id: 'debug_error',
    type: 'debug',
    z: 'flow6',
    name: 'Debug Error',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 150,
    wires: []
  },
  // Nodo que muestra estado "warning"
  {
    id: 'function_warning',
    type: 'function',
    z: 'flow6',
    name: 'Nodo con Warning',
    func: '// Simular advertencia basada en valor aleatorio\nconst value = Math.random();\n\nif (value > 0.6) {\n  // Estado de advertencia (amarillo)\n  node.status({fill:"yellow",shape:"dot",text:"Advertencia: valor alto (" + value.toFixed(2) + ")"});\n  msg.warning = true;\n  \n  setTimeout(() => {\n    node.status({fill:"grey",shape:"dot"});\n  }, 1500);\n} else {\n  // Estado normal\n  node.status({fill:"green",shape:"dot",text:"Normal"});\n  setTimeout(() => {\n    node.status({fill:"grey",shape:"dot"});\n  }, 1000);\n}\n\nmsg.payload = {\n  ...msg.payload,\n  processed: true,\n  node: "warning",\n  value: value,\n  hasWarning: value > 0.6,\n  timestamp: new Date().toISOString()\n};\n\nreturn msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 250,
    wires: [['debug_warning']]
  },
  {
    id: 'debug_warning',
    type: 'debug',
    z: 'flow6',
    name: 'Debug Warning',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 250,
    wires: []
  },
  // Nodo que permanece en estado "idle"
  {
    id: 'function_idle',
    type: 'function',
    z: 'flow6',
    name: 'Nodo Idle',
    func: '// Este nodo no establece status explícito\n// Por lo tanto, permanecerá en estado "idle" por defecto\nmsg.payload = {\n  ...msg.payload,\n  processed: true,\n  node: "idle",\n  timestamp: new Date().toISOString()\n};\n\nreturn msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 350,
    wires: [['debug_idle']]
  },
  {
    id: 'debug_idle',
    type: 'debug',
    z: 'flow6',
    name: 'Debug Idle',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 350,
    wires: []
  }
]

// Flow 7: Flow con APIs públicas - GET JSON
const flow7 = {
  id: 'flow7',
  type: 'tab',
  label: 'APIs Públicas - GET JSON',
  disabled: false,
  info: 'Flow que descarga JSON de APIs públicas y procesa los datos',
  env: []
}

const flow7Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow7',
    name: 'Obtener Post',
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
    wires: [['http_jsonplaceholder']]
  },
  {
    id: 'http_jsonplaceholder',
    type: 'http request',
    z: 'flow7',
    name: 'GET JSONPlaceholder',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    paytoqs: 'ignore',
    ret: 'obj',
    usetls: true,
    tls: '',
    useAuth: false,
    authType: '',
    persist: false,
    useProxy: false,
    proxy: '',
    senderr: false,
    insecureHTTPParser: false,
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['json_parse']]
  },
  {
    id: 'json_parse',
    type: 'json',
    z: 'flow7',
    name: 'Parse JSON',
    property: 'payload',
    action: '',
    pretty: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: [['change_extract']]
  },
  {
    id: 'change_extract',
    type: 'change',
    z: 'flow7',
    name: 'Extraer Datos',
    rules: [
      { t: 'set', p: 'title', pt: 'msg', to: 'payload.title', tot: 'msg' },
      { t: 'set', p: 'body', pt: 'msg', to: 'payload.body', tot: 'msg' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100,
    wires: [['template_format']]
  },
  {
    id: 'template_format',
    type: 'template',
    z: 'flow7',
    name: 'Formatear',
    field: 'payload',
    fieldType: 'msg',
    format: 'handlebars',
    syntax: 'mustache',
    output: 'str',
    template: 'Título: {{title}}\n\nCuerpo: {{body}}',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 100,
    wires: [['debug_api']]
  },
  {
    id: 'debug_api',
    type: 'debug',
    z: 'flow7',
    name: 'Debug API',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 5,
    y: 100,
    wires: []
  },
  // Segundo ejemplo: API REST pública simple
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow7',
    name: 'Obtener Usuario',
    props: [{ p: 'payload', v: '1', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '1',
    payloadType: 'str',
    x: 100,
    y: 100 + VERTICAL_SPACING,
    wires: [['http_user']]
  },
  {
    id: 'http_user',
    type: 'http request',
    z: 'flow7',
    name: 'GET Usuario',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users/{{payload}}',
    paytoqs: 'ignore',
    ret: 'obj',
    usetls: true,
    tls: '',
    useAuth: false,
    authType: '',
    persist: false,
    useProxy: false,
    proxy: '',
    senderr: false,
    insecureHTTPParser: false,
    headers: [],
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING,
    wires: [['json_parse_user']]
  },
  {
    id: 'json_parse_user',
    type: 'json',
    z: 'flow7',
    name: 'Parse Usuario',
    property: 'payload',
    action: '',
    pretty: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING,
    wires: [['change_user']]
  },
  {
    id: 'change_user',
    type: 'change',
    z: 'flow7',
    name: 'Extraer Usuario',
    rules: [
      { t: 'set', p: 'name', pt: 'msg', to: 'payload.name', tot: 'msg' },
      { t: 'set', p: 'email', pt: 'msg', to: 'payload.email', tot: 'msg' },
      { t: 'set', p: 'city', pt: 'msg', to: 'payload.address.city', tot: 'msg' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100 + VERTICAL_SPACING,
    wires: [['debug_user']]
  },
  {
    id: 'debug_user',
    type: 'debug',
    z: 'flow7',
    name: 'Debug Usuario',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 100 + VERTICAL_SPACING,
    wires: []
  }
]

// Flow 8: Flow con APIs públicas - POST/PUT
const flow8 = {
  id: 'flow8',
  type: 'tab',
  label: 'APIs Públicas - POST/PUT',
  disabled: false,
  info: 'Flow que envía datos a APIs públicas usando POST y PUT',
  env: []
}

const flow8Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow8',
    name: 'Crear Post',
    props: [
      { p: 'payload', v: '{"title":"Mi Post","body":"Contenido del post","userId":1}', vt: 'json' }
    ],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"title":"Mi Post","body":"Contenido del post","userId":1}',
    payloadType: 'json',
    x: 100,
    y: 100,
    wires: [['json_stringify']]
  },
  {
    id: 'json_stringify',
    type: 'json',
    z: 'flow8',
    name: 'Stringify JSON',
    property: 'payload',
    action: 'obj',
    pretty: false,
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['http_post']]
  },
  {
    id: 'http_post',
    type: 'http request',
    z: 'flow8',
    name: 'POST JSONPlaceholder',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    paytoqs: 'ignore',
    ret: 'obj',
    usetls: true,
    tls: '',
    useAuth: false,
    authType: '',
    persist: false,
    useProxy: false,
    proxy: '',
    senderr: false,
    insecureHTTPParser: false,
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: [['json_parse_post']]
  },
  {
    id: 'json_parse_post',
    type: 'json',
    z: 'flow8',
    name: 'Parse Response',
    property: 'payload',
    action: '',
    pretty: true,
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100,
    wires: [['debug_post']]
  },
  {
    id: 'debug_post',
    type: 'debug',
    z: 'flow8',
    name: 'Debug POST',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 100,
    wires: []
  },
  // Ejemplo PUT
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow8',
    name: 'Actualizar Post',
    props: [
      { p: 'payload', v: '{"id":1,"title":"Post Actualizado","body":"Nuevo contenido","userId":1}', vt: 'json' }
    ],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"id":1,"title":"Post Actualizado","body":"Nuevo contenido","userId":1}',
    payloadType: 'json',
    x: 100,
    y: 100 + VERTICAL_SPACING,
    wires: [['json_stringify_put']]
  },
  {
    id: 'json_stringify_put',
    type: 'json',
    z: 'flow8',
    name: 'Stringify',
    property: 'payload',
    action: 'obj',
    pretty: false,
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING,
    wires: [['http_put']]
  },
  {
    id: 'http_put',
    type: 'http request',
    z: 'flow8',
    name: 'PUT JSONPlaceholder',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    paytoqs: 'ignore',
    ret: 'obj',
    usetls: true,
    tls: '',
    useAuth: false,
    authType: '',
    persist: false,
    useProxy: false,
    proxy: '',
    senderr: false,
    insecureHTTPParser: false,
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING,
    wires: [['debug_put']]
  },
  {
    id: 'debug_put',
    type: 'debug',
    z: 'flow8',
    name: 'Debug PUT',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100 + VERTICAL_SPACING,
    wires: []
  }
]

// Flow 9: Flow con Webhook y Transformers
const flow9 = {
  id: 'flow9',
  type: 'tab',
  label: 'Webhook y Transformers',
  disabled: false,
  info: 'Flow que demuestra webhooks HTTP y transformaciones de datos',
  env: []
}

const flow9Nodes = [
  {
    id: 'http_in',
    type: 'http in',
    z: 'flow9',
    name: 'Webhook POST',
    url: '/webhook/test',
    method: 'post',
    upload: false,
    swaggerDoc: '',
    x: 100,
    y: 100,
    wires: [['json_parse_webhook']]
  },
  {
    id: 'json_parse_webhook',
    type: 'json',
    z: 'flow9',
    name: 'Parse Webhook',
    property: 'payload',
    action: '',
    pretty: false,
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['change_transform']]
  },
  {
    id: 'change_transform',
    type: 'change',
    z: 'flow9',
    name: 'Transformar',
    rules: [
      { t: 'set', p: 'timestamp', pt: 'msg', to: '$now()', tot: 'jsonata' },
      { t: 'set', p: 'processed', pt: 'msg', to: 'true', tot: 'bool' },
      { t: 'set', p: 'original', pt: 'msg', to: 'payload', tot: 'msg' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: [['switch_route']]
  },
  {
    id: 'switch_route',
    type: 'switch',
    z: 'flow9',
    name: 'Router',
    property: 'payload.type',
    propertyType: 'msg',
    rules: [
      { t: 'eq', v: 'user', vt: 'str' },
      { t: 'eq', v: 'order', vt: 'str' },
      { t: 'else' }
    ],
    checkall: 'false',
    repair: false,
    outputs: 3,
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100,
    wires: [['template_user'], ['template_order'], ['template_default']]
  },
  {
    id: 'template_user',
    type: 'template',
    z: 'flow9',
    name: 'Template User',
    field: 'payload',
    fieldType: 'msg',
    format: 'handlebars',
    syntax: 'mustache',
    output: 'str',
    template: 'Usuario procesado: {{payload.name}}',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 60,
    wires: [['http_response']]
  },
  {
    id: 'template_order',
    type: 'template',
    z: 'flow9',
    name: 'Template Order',
    field: 'payload',
    fieldType: 'msg',
    format: 'handlebars',
    syntax: 'mustache',
    output: 'str',
    template: 'Orden procesada: {{payload.id}}',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 100,
    wires: [['http_response']]
  },
  {
    id: 'template_default',
    type: 'template',
    z: 'flow9',
    name: 'Template Default',
    field: 'payload',
    fieldType: 'msg',
    format: 'handlebars',
    syntax: 'mustache',
    output: 'str',
    template: 'Tipo desconocido: {{payload.type}}',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 140,
    wires: [['http_response']]
  },
  {
    id: 'http_response',
    type: 'http response',
    z: 'flow9',
    name: 'Response',
    statusCode: '200',
    headers: {
      'Content-Type': 'application/json'
    },
    x: 100 + HORIZONTAL_SPACING * 5,
    y: 100,
    wires: []
  },
  // Ejemplo con delay y join
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow9',
    name: 'Test Transform',
    props: [
      { p: 'payload', v: '{"type":"user","name":"John","age":30}', vt: 'json' }
    ],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"type":"user","name":"John","age":30}',
    payloadType: 'json',
    x: 100,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['delay_transform']]
  },
  {
    id: 'delay_transform',
    type: 'delay',
    z: 'flow9',
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
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['change_add']]
  },
  {
    id: 'change_add',
    type: 'change',
    z: 'flow9',
    name: 'Agregar Campo',
    rules: [
      { t: 'set', p: 'processedAt', pt: 'msg', to: '$now()', tot: 'jsonata' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['debug_transform']]
  },
  {
    id: 'debug_transform',
    type: 'debug',
    z: 'flow9',
    name: 'Debug Transform',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100 + VERTICAL_SPACING * 2,
    wires: []
  }
]

// Flow 10: Flow con Convert y múltiples transformaciones
const flow10 = {
  id: 'flow10',
  type: 'tab',
  label: 'Convert y Transformaciones',
  disabled: false,
  info: 'Flow que demuestra conversiones de tipos y transformaciones complejas',
  env: []
}

const flow10Nodes = [
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow10',
    name: 'String a Number',
    props: [{ p: 'payload', v: '123', vt: 'str' }],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '123',
    payloadType: 'str',
    x: 100,
    y: 100,
    wires: [['convert_number']]
  },
  {
    id: 'convert_number',
    type: 'change',
    z: 'flow10',
    name: 'Convert a Number',
    rules: [
      { t: 'set', p: 'payload', pt: 'msg', to: 'Number(payload)', tot: 'jsonata' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING,
    y: 100,
    wires: [['function_validate']]
  },
  {
    id: 'function_validate',
    type: 'function',
    z: 'flow10',
    name: 'Validar Number',
    func: 'if (typeof msg.payload === "number") {\n  node.status({fill:"green",shape:"dot",text:"Es número"});\n} else {\n  node.status({fill:"red",shape:"ring",text:"No es número"});\n}\nreturn msg;',
    outputs: 1,
    noerr: 0,
    timeout: 0,
    initialize: '',
    finalize: '',
    libs: [],
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100,
    wires: [['debug_convert']]
  },
  {
    id: 'debug_convert',
    type: 'debug',
    z: 'flow10',
    name: 'Debug Number',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100,
    wires: []
  },
  // Convertir objeto a string
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow10',
    name: 'Object a String',
    props: [
      { p: 'payload', v: '{"name":"Test","value":42}', vt: 'json' }
    ],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '{"name":"Test","value":42}',
    payloadType: 'json',
    x: 100,
    y: 100 + VERTICAL_SPACING,
    wires: [['json_to_string']]
  },
  {
    id: 'json_to_string',
    type: 'json',
    z: 'flow10',
    name: 'JSON a String',
    property: 'payload',
    action: 'obj',
    pretty: true,
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING,
    wires: [['change_format']]
  },
  {
    id: 'change_format',
    type: 'change',
    z: 'flow10',
    name: 'Formatear',
    rules: [
      { t: 'set', p: 'formatted', pt: 'msg', to: 'payload', tot: 'msg' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING,
    wires: [['debug_string']]
  },
  {
    id: 'debug_string',
    type: 'debug',
    z: 'flow10',
    name: 'Debug String',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'formatted',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100 + VERTICAL_SPACING,
    wires: []
  },
  // Ejemplo con split y join
  {
    id: generateId('inject'),
    type: 'inject',
    z: 'flow10',
    name: 'Array de Datos',
    props: [
      { p: 'payload', v: '["item1","item2","item3"]', vt: 'json' }
    ],
    repeat: '',
    cron: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '["item1","item2","item3"]',
    payloadType: 'json',
    x: 100,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['split_array']]
  },
  {
    id: 'split_array',
    type: 'split',
    z: 'flow10',
    name: 'Split Array',
    splits: '3',
    splitType: 'len',
    splitKey: 'payload',
    x: 100 + HORIZONTAL_SPACING,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['change_item']]
  },
  {
    id: 'change_item',
    type: 'change',
    z: 'flow10',
    name: 'Procesar Item',
    rules: [
      { t: 'set', p: 'item', pt: 'msg', to: 'payload', tot: 'msg' },
      { t: 'set', p: 'index', pt: 'msg', to: '$index()', tot: 'jsonata' }
    ],
    action: '',
    property: '',
    from: '',
    to: '',
    reg: false,
    x: 100 + HORIZONTAL_SPACING * 2,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['join_items']]
  },
  {
    id: 'join_items',
    type: 'join',
    z: 'flow10',
    name: 'Join Items',
    mode: 'auto',
    build: 'string',
    property: 'payload',
    propertyType: 'msg',
    key: 'topic',
    joiner: ', ',
    joinerType: 'str',
    accumulate: false,
    timeout: '',
    count: '3',
    reduceRight: false,
    reduceExp: '',
    reduceInit: '',
    reduceInitType: '',
    reduceFixup: '',
    x: 100 + HORIZONTAL_SPACING * 3,
    y: 100 + VERTICAL_SPACING * 2,
    wires: [['debug_join']]
  },
  {
    id: 'debug_join',
    type: 'debug',
    z: 'flow10',
    name: 'Debug Join',
    active: true,
    tosidebar: true,
    console: false,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 100 + HORIZONTAL_SPACING * 4,
    y: 100 + VERTICAL_SPACING * 2,
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
  ...flow5Nodes,
  flow6,
  ...flow6Nodes,
  flow7,
  ...flow7Nodes,
  flow8,
  ...flow8Nodes,
  flow9,
  ...flow9Nodes,
  flow10,
  ...flow10Nodes
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
      const ourFlowIds = new Set([flow1.id, flow2.id, flow3.id, flow4.id, flow5.id, flow6.id, flow7.id, flow8.id, flow9.id, flow10.id])
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
    console.log(`   - Flow 6: Runtime Feedback Demo (${flow6Nodes.length} nodos) - Muestra estados en tiempo real`)
    console.log(`   - Flow 7: APIs Públicas - GET JSON (${flow7Nodes.length} nodos) - Descarga y procesa JSON`)
    console.log(`   - Flow 8: APIs Públicas - POST/PUT (${flow8Nodes.length} nodos) - Envía datos a APIs`)
    console.log(`   - Flow 9: Webhook y Transformers (${flow9Nodes.length} nodos) - Webhooks HTTP y transformaciones`)
    console.log(`   - Flow 10: Convert y Transformaciones (${flow10Nodes.length} nodos) - Conversiones de tipos`)
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
      'Node-RED-Deployment-Type': 'full', // Desplegar automáticamente los flows
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
    console.log('\n✅ Flows de ejemplo creados y desplegados exitosamente!')
    console.log('📋 Resultado:', result)
    console.log('\n📊 Resumen:')
    console.log(`   - Total de flows creados: 10`)
    console.log(`   - Total de nodos creados: ${allFlows.filter(n => n.type !== 'tab' && n.type !== 'group').length}`)
    console.log(`   - Total de grupos creados: ${allFlows.filter(n => n.type === 'group').length}`)
    console.log('\n🔄 Recarga tu editor visual para ver los flows')
    console.log('💡 Usa el selector de flows en la barra superior para cambiar entre ellos')
    console.log('📦 Los grupos se mostrarán como contenedores visuales con fondo y bordes')
    console.log('🔽 Haz clic en el botón de colapsar/expandir en los grupos para ocultar/mostrar nodos')
    console.log('📍 Los nodos están bien distribuidos para evitar encimamiento')
    console.log('\n⚡ NUEVO: Runtime Feedback en Tiempo Real')
    console.log('   - Abre el flow "Runtime Feedback Demo" para ver estados en tiempo real')
    console.log('   - Los nodos mostrarán indicadores de color según su estado:')
    console.log('     • 🟢 Verde = Running (ejecutando)')
    console.log('     • 🔴 Rojo = Error')
    console.log('     • 🟡 Amarillo = Warning')
    console.log('     • ⚪ Sin indicador = Idle')
    console.log('   - Asegúrate de que Node-RED esté ejecutándose para ver los estados')
    console.log('   - El punto verde en la esquina superior derecha indica conexión WebSocket activa')
    console.log('   - 🖱️ Haz clic en un nodo y ve a la pestaña "Estado" para ver:')
    console.log('     • Estado de runtime actual')
    console.log('     • Conexiones de entrada/salida')
    console.log('     • Último payload procesado')
    console.log('     • Historial de logs de ejecución (últimos 50)')
    console.log('   - Las animaciones en los edges muestran el flujo de datos en tiempo real')
    console.log('   - El panel de logs de ejecución (botón inferior derecho) muestra todos los eventos')
    console.log('\n🌐 APIs Públicas y Nodos Básicos:')
    console.log('   - Flow 7: Descarga JSON de JSONPlaceholder (posts y usuarios)')
    console.log('   - Flow 8: Envía datos con POST y PUT a APIs públicas')
    console.log('   - ⚡ Los flows están DESPLEGADOS y LISTOS para usar')
    console.log('   - 🖱️ Haz clic en los nodos inject (botón azul) para ejecutar los flows')
    console.log('   - Flow 9: Webhook HTTP en /webhook/test - prueba con:')
    console.log('     curl -X POST http://localhost:1880/webhook/test -H "Content-Type: application/json" -d \'{"type":"user","name":"Test"}\'')
    console.log('   - Flow 10: Conversiones de tipos (string↔number, JSON↔string, split/join)')
    console.log('   - Todos los flows usan nodos básicos: HTTP, JSON, Change, Template, Switch, etc.')
  } catch (error) {
    console.error('❌ Error al crear flows:', error.message)
    if (error.message.includes('fetch')) {
      console.error('💡 Asegúrate de que Node-RED esté corriendo en', NODE_RED_URL)
    }
    process.exit(1)
  }
}

seedFlows()
