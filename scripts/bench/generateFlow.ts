/**
 * Generador de flows sintéticos para benchmarks de performance
 * 
 * Genera flows de Node-RED con diferentes tamaños (100/500/1000/2000 nodos)
 * con wires realistas (fan-out, chains, branches).
 * 
 * Uso:
 *   npm run bench:generate -- --nodes 1000 --output flows/bench-1000.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Para ES modules: obtener __dirname equivalente
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface FlowGeneratorOptions {
  nodeCount: 100 | 500 | 1000 | 2000
  fanOutRatio?: number // Ratio de nodos con múltiples salidas (0-1)
  chainLength?: number // Longitud promedio de cadenas
  branchDepth?: number // Profundidad de ramificaciones
  outputPath?: string // Ruta de salida del archivo JSON
}

interface NodeRedNode {
  id: string
  type: string
  z: string // Flow ID
  name: string
  x: number
  y: number
  wires: string[][]
  [key: string]: any
}

interface NodeRedFlow {
  id: string
  type: 'tab'
  label: string
  disabled: boolean
  info: string
  env: any[]
}

interface FlowData {
  flows: NodeRedFlow[]
  nodes: NodeRedNode[]
}

// Tipos de nodos disponibles con sus distribuciones
const NODE_TYPES = [
  { type: 'inject', weight: 0.3, name: 'Trigger' },
  { type: 'function', weight: 0.4, name: 'Process' },
  { type: 'debug', weight: 0.2, name: 'Debug' },
  { type: 'http request', weight: 0.05, name: 'HTTP' },
  { type: 'change', weight: 0.05, name: 'Change' },
] as const

// Constantes para espaciado
const NODE_WIDTH = 160
const NODE_HEIGHT = 80
const HORIZONTAL_SPACING = 250
const VERTICAL_SPACING = 120

/**
 * Genera un flow sintético con las opciones especificadas
 */
export function generateFlow(options: FlowGeneratorOptions): FlowData {
  const {
    nodeCount,
    fanOutRatio = 0.2, // 20% de nodos con fan-out
    chainLength = 5, // Cadenas de 5 nodos promedio
    branchDepth = 3, // Ramificaciones de 3 niveles
  } = options

  const flowId = 'bench-flow'
  const flow: NodeRedFlow = {
    id: flowId,
    type: 'tab',
    label: `Benchmark Flow (${nodeCount} nodes)`,
    disabled: false,
    info: `Flow sintético generado para benchmarks de performance con ${nodeCount} nodos`,
    env: [],
  }

  // Calcular dimensiones del grid
  const gridSize = Math.ceil(Math.sqrt(nodeCount))
  const nodes: NodeRedNode[] = []
  const nodePositions: Map<number, { x: number; y: number }> = new Map()

  // 1. Crear nodos en grid
  let nodeIndex = 0
  for (let row = 0; row < gridSize && nodeIndex < nodeCount; row++) {
    for (let col = 0; col < gridSize && nodeIndex < nodeCount; col++) {
      const nodeType = selectNodeType()
      const nodeId = `node-${nodeIndex}`
      
      const x = 100 + col * HORIZONTAL_SPACING
      const y = 100 + row * VERTICAL_SPACING
      
      nodePositions.set(nodeIndex, { x, y })
      
      const node: NodeRedNode = {
        id: nodeId,
        type: nodeType.type,
        z: flowId,
        name: `${nodeType.name} ${nodeIndex}`,
        x,
        y,
        wires: [],
        ...getNodeConfig(nodeType.type, nodeIndex),
      }
      
      nodes.push(node)
      nodeIndex++
    }
  }

  // 2. Crear wires realistas
  const fanOutNodes = Math.floor(nodeCount * fanOutRatio)
  const chainNodes = Math.floor(nodeCount * 0.4) // 40% en cadenas
  const branchNodes = Math.floor(nodeCount * 0.3) // 30% en ramificaciones
  const remainingNodes = nodeCount - fanOutNodes - chainNodes - branchNodes

  let processedNodes = 0

  // Crear cadenas lineales
  while (processedNodes < chainNodes && processedNodes < nodeCount - 1) {
    const chainStart = processedNodes
    const actualChainLength = Math.min(chainLength, nodeCount - processedNodes - 1)
    
    for (let i = 0; i < actualChainLength && processedNodes < nodeCount - 1; i++) {
      const sourceIdx = processedNodes
      const targetIdx = processedNodes + 1
      
      if (sourceIdx < nodes.length && targetIdx < nodes.length) {
        const sourceNode = nodes[sourceIdx]
        const targetNode = nodes[targetIdx]
        
        if (!sourceNode.wires[0]) {
          sourceNode.wires[0] = []
        }
        sourceNode.wires[0].push(targetNode.id)
      }
      
      processedNodes++
    }
    processedNodes++ // Saltar al siguiente grupo
  }

  // Crear fan-out (nodos que conectan a múltiples destinos)
  let fanOutProcessed = 0
  while (fanOutProcessed < fanOutNodes && processedNodes < nodeCount - 1) {
    const sourceIdx = processedNodes
    const fanOutCount = Math.floor(Math.random() * 3) + 2 // 2-4 conexiones
    
    if (sourceIdx < nodes.length) {
      const sourceNode = nodes[sourceIdx]
      sourceNode.wires[0] = []
      
      for (let i = 0; i < fanOutCount && processedNodes + i + 1 < nodeCount; i++) {
        const targetIdx = processedNodes + i + 1
        if (targetIdx < nodes.length) {
          sourceNode.wires[0].push(nodes[targetIdx].id)
        }
      }
    }
    
    processedNodes += fanOutCount + 1
    fanOutProcessed++
  }

  // Crear ramificaciones (branches)
  let branchProcessed = 0
  while (branchProcessed < branchNodes && processedNodes < nodeCount - 1) {
    const branchStart = processedNodes
    const actualDepth = Math.min(branchDepth, Math.floor((nodeCount - processedNodes) / 2))
    
    // Crear estructura de árbol
    createBranch(nodes, branchStart, actualDepth, nodeCount)
    
    processedNodes += Math.pow(2, actualDepth) - 1
    branchProcessed++
  }

  // Conectar nodos restantes aleatoriamente
  while (processedNodes < nodeCount - 1) {
    const sourceIdx = processedNodes
    const targetIdx = Math.min(processedNodes + 1, nodeCount - 1)
    
    if (sourceIdx < nodes.length && targetIdx < nodes.length) {
      const sourceNode = nodes[sourceIdx]
      if (!sourceNode.wires[0]) {
        sourceNode.wires[0] = []
      }
      sourceNode.wires[0].push(nodes[targetIdx].id)
    }
    
    processedNodes++
  }

  return {
    flows: [flow],
    nodes,
  }
}

/**
 * Selecciona un tipo de nodo basado en las distribuciones de peso
 */
function selectNodeType(): typeof NODE_TYPES[number] {
  const rand = Math.random()
  let cumulative = 0
  
  for (const nodeType of NODE_TYPES) {
    cumulative += nodeType.weight
    if (rand <= cumulative) {
      return nodeType
    }
  }
  
  return NODE_TYPES[0] // Fallback
}

/**
 * Obtiene la configuración específica para un tipo de nodo
 */
function getNodeConfig(type: string, index: number): any {
  switch (type) {
    case 'inject':
      return {
        props: [{ p: 'payload', v: `Test ${index}`, vt: 'str' }],
        repeat: '',
        cron: '',
        once: false,
        onceDelay: 0.1,
        topic: '',
        payload: `Test ${index}`,
        payloadType: 'str',
      }
    
    case 'function':
      return {
        func: `msg.payload = "Processed: " + msg.payload;\nreturn msg;`,
        outputs: 1,
        noerr: 0,
        timeout: 0,
        initialize: '',
        finalize: '',
        libs: [],
      }
    
    case 'debug':
      return {
        active: true,
        tosidebar: true,
        console: false,
        tostatus: false,
        complete: 'payload',
        targetType: 'msg',
        statusVal: '',
        statusType: 'auto',
      }
    
    case 'http request':
      return {
        method: 'GET',
        url: `https://api.example.com/data/${index}`,
        paytoqs: 'ignore',
        tls: '',
        persist: false,
        proxy: '',
        authType: '',
        senderr: false,
      }
    
    case 'change':
      return {
        rules: [
          { t: 'set', p: 'payload', pt: 'msg', to: 'test', tot: 'str' },
        ],
        action: '',
        property: '',
        from: '',
        to: '',
        reg: false,
      }
    
    default:
      return {}
  }
}

/**
 * Crea una estructura de ramificación (árbol binario)
 */
function createBranch(
  nodes: NodeRedNode[],
  startIdx: number,
  depth: number,
  maxNodes: number
): void {
  if (depth <= 0 || startIdx >= nodes.length || startIdx >= maxNodes - 1) {
    return
  }

  const sourceNode = nodes[startIdx]
  if (!sourceNode.wires[0]) {
    sourceNode.wires[0] = []
  }

  // Conectar a dos nodos hijos
  const leftChild = startIdx + 1
  const rightChild = startIdx + Math.pow(2, depth - 1)

  if (leftChild < nodes.length && leftChild < maxNodes) {
    sourceNode.wires[0].push(nodes[leftChild].id)
    createBranch(nodes, leftChild, depth - 1, maxNodes)
  }

  if (rightChild < nodes.length && rightChild < maxNodes) {
    sourceNode.wires[0].push(nodes[rightChild].id)
    createBranch(nodes, rightChild, depth - 1, maxNodes)
  }
}

/**
 * Función principal para ejecutar desde línea de comandos
 * Compatible con ES modules
 */
// Verificar si este módulo es el punto de entrada
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
                     process.argv[1]?.endsWith('generateFlow.ts') ||
                     process.argv[1]?.includes('generateFlow')

if (isMainModule) {
  const args = process.argv.slice(2)
  
  // Parsear argumentos (soporta --nodes=100 y --nodes 100)
  let nodeCount = 100
  let outputPath = 'flows/bench.json'
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--nodes')) {
      if (arg.includes('=')) {
        nodeCount = parseInt(arg.split('=')[1] || '100', 10)
      } else if (i + 1 < args.length) {
        nodeCount = parseInt(args[i + 1] || '100', 10)
        i++ // Saltar el siguiente argumento
      }
    } else if (arg.startsWith('--output')) {
      if (arg.includes('=')) {
        outputPath = arg.split('=')[1] || 'flows/bench.json'
      } else if (i + 1 < args.length) {
        outputPath = args[i + 1] || 'flows/bench.json'
        i++ // Saltar el siguiente argumento
      }
    }
  }
  
  if (![100, 500, 1000, 2000].includes(nodeCount)) {
    console.error('Error: nodeCount debe ser 100, 500, 1000 o 2000')
    process.exit(1)
  }
  
  const flowData = generateFlow({ nodeCount })
  const json = JSON.stringify(flowData, null, 2)
  
  // Crear directorio si no existe
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  fs.writeFileSync(outputPath, json, 'utf-8')
  console.log(`✅ Flow generado: ${nodeCount} nodos`)
  console.log(`📁 Guardado en: ${outputPath}`)
  console.log(`📊 Estadísticas:`)
  console.log(`   - Nodos: ${flowData.nodes.length}`)
  const totalEdges = flowData.nodes.reduce((sum, n) => sum + (n.wires?.reduce((s, w) => s + w.length, 0) || 0), 0)
  console.log(`   - Edges: ${totalEdges}`)
}

