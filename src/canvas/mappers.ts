/**
 * Funciones de mapeo de Node-RED a React Flow
 * 
 * Estas funciones transforman la estructura de datos de Node-RED
 * (nodos y wires) a la estructura de React Flow (nodes y edges).
 * 
 * IMPORTANTE: No mutamos los datos originales de Node-RED.
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge, MarkerType } from 'reactflow'
import type { NodeRedNode, NodeRedGroup, NodeRedSubflowDefinition } from '@/api/types'
import { mapperLogger } from '@/utils/logger'
import { getNodeType } from './nodes/nodeFactory'
import { isSubflowInstance, getSubflowDefinition } from '@/utils/subflowUtils'

/**
 * Convierte un nodo de Node-RED a un nodo de React Flow
 * 
 * Mapeo:
 * - id: se preserva exactamente
 * - position: {x: node.x, y: node.y}
 * - type: "baseNode" (custom node moderno)
 * - data: contiene label y metadata del nodo
 * 
 * @param nodeRedNode Nodo de Node-RED a convertir
 * @param subflowDefinitions Array de definiciones de subflows (opcional, para instancias de subflow)
 * @returns Nodo de React Flow
 */
export function mapNodeRedNodeToReactFlowNode(
  nodeRedNode: NodeRedNode,
  subflowDefinitions?: NodeRedSubflowDefinition[]
): ReactFlowNode {
  // Preservar el ID exactamente como viene de Node-RED
  const id = nodeRedNode.id
  
  // Log detallado para nodos inject (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && nodeRedNode.type === 'inject') {
    mapperLogger(`📥 [mapNodeRedNodeToReactFlowNode] Cargando nodo inject:`, {
      id: nodeRedNode.id,
      name: nodeRedNode.name || nodeRedNode.label,
      type: nodeRedNode.type,
      z: nodeRedNode.z,
      disabled: nodeRedNode.disabled,
    })
  }

  // Mapear posición
  const position = {
    x: nodeRedNode.x || 0,
    y: nodeRedNode.y || 0,
  }

  // Usar el factory para determinar el tipo de nodo React Flow
  // Si hay un componente específico, usar el tipo correspondiente
  // Si no, usar "baseNode" como fallback
  const type = getNodeType(nodeRedNode.type)

  // Mapeo de nombres amigables por defecto para tipos específicos
  const friendlyNameMap: Record<string, string> = {
    'agent-core': 'Agent Core',
    'model.azure.openai': 'Azure OpenAI',
  }

  // Label: usar name si existe, sino usar nombre amigable del mapeo, sino usar type
  const label = nodeRedNode.name || friendlyNameMap[nodeRedNode.type] || nodeRedNode.type || 'node'

  // Calcular número de puertos de salida basado en wires
  const outputPortsCount = nodeRedNode.wires ? nodeRedNode.wires.length : 1

  // Si es una instancia de subflow, obtener la definición
  let subflowDefinition: NodeRedSubflowDefinition | undefined
  if (isSubflowInstance(nodeRedNode) && subflowDefinitions) {
    const def = getSubflowDefinition(nodeRedNode, subflowDefinitions)
    subflowDefinition = def || undefined
  }

  // Data contiene información del nodo original
  // IMPORTANTE: Preservar TODO el objeto original de Node-RED para poder
  // reconstruirlo completamente al guardar
  const data = {
    label,
    // Preservar el tipo original de Node-RED para referencia futura
    nodeRedType: nodeRedNode.type,
    // Preservar el z (flow ID) para referencia
    flowId: nodeRedNode.z,
    // Número de puertos de salida (para renderizar handles dinámicamente)
    outputPortsCount,
    // Preservar TODO el nodo original de Node-RED (incluyendo todas las propiedades)
    // Esto es crítico para preservar propiedades desconocidas, configuración, etc.
    nodeRedNode: { ...nodeRedNode },
    // Agregar definición de subflow si está disponible
    ...(subflowDefinition && { subflowDefinition }),
  }

  return {
    id,
    type,
    position,
    data,
  }
}

/**
 * Convierte los wires de un nodo de Node-RED a edges de React Flow
 * 
 * Estructura de wires en Node-RED:
 * - wires es un array de arrays: [[target1, target2], [target3]]
 * - Cada índice del array externo representa un puerto de salida (0, 1, 2...)
 * - Cada array interno contiene IDs de nodos destino conectados a ese puerto
 * 
 * Mapeo a React Flow edges:
 * - Para cada puerto de salida i en wires
 *   - Para cada targetId en wires[i]
 *     - Crear edge con sourceHandle: `output-${i}` y targetHandle: "input" o "input-0", "input-1" para subflows
 * 
 * @param sourceNodeId ID del nodo fuente (el que tiene los wires)
 * @param wires Array de arrays de IDs de nodos destino
 * @param subflowDefinitions Definiciones de subflows (opcional, para detectar puertos de entrada)
 * @param targetNodeMap Map de nodeId -> ReactFlowNode (opcional, para detectar si el target es subflow)
 * @param subflowInputPortCounters Map para rastrear qué puerto de entrada usar para cada subflow
 * @returns Array de edges de React Flow
 */
export function mapNodeRedWiresToReactFlowEdges(
  sourceNodeId: string,
  wires: string[][] | undefined,
  subflowDefinitions?: NodeRedSubflowDefinition[],
  targetNodeMap?: Map<string, ReactFlowNode>,
  subflowInputPortCounters?: Map<string, number>
): ReactFlowEdge[] {
  if (!wires || wires.length === 0) {
    return []
  }

  const edges: ReactFlowEdge[] = []
  let edgeCounter = 0

  // Crear map de subflow definitions por ID si no existe
  const subflowDefMap = new Map<string, NodeRedSubflowDefinition>()
  if (subflowDefinitions) {
    subflowDefinitions.forEach(def => {
      subflowDefMap.set(def.id, def)
    })
  }

  // Inicializar contadores si no existen
  // Usamos un contador por subflow para asignar puertos en orden
  const portCounters = subflowInputPortCounters || new Map<string, number>()

  // Iterar sobre cada puerto de salida
  wires.forEach((targetIds, outputPortIndex) => {
    if (!targetIds || targetIds.length === 0) {
      return
    }

    // Para cada nodo destino en este puerto de salida
    targetIds.forEach((targetId) => {
      // Crear un edge único
      const edgeId = `${sourceNodeId}-${outputPortIndex}-${targetId}-${edgeCounter++}`

      // Determinar targetHandle basado en si el target es un subflow o un nodo bidireccional
      let targetHandle = 'input' // Default para nodos normales
      let edgeType = 'smoothstep' // Default edge type
      
      // Verificar si el target es un nodo bidireccional (como Azure OpenAI Model)
      const targetNode = targetNodeMap?.get(targetId)
      const sourceNode = targetNodeMap?.get(sourceNodeId)
      const isBidirectionalTarget = targetNode?.data?.nodeRedType === 'model.azure.openai'
      const isBidirectionalSource = sourceNode?.data?.nodeRedType === 'model.azure.openai'
      
      if (isBidirectionalTarget) {
        // Para Azure OpenAI Model, usar "input" como targetHandle
        targetHandle = 'input'
        edgeType = 'bidirectional'
      }
      
      if (isBidirectionalSource) {
        // Si el source es Azure OpenAI Model, usar "output-0" como sourceHandle
        edgeType = 'bidirectional'
      }
      
      // Verificar si el target es un subflow
      const isSubflow = targetNode?.data?.subflowDefinition || 
                       (targetNode?.data?.nodeRedType && 
                        typeof targetNode.data.nodeRedType === 'string' && 
                        targetNode.data.nodeRedType.startsWith('subflow:'))
      
      if (isSubflow && !isBidirectionalTarget) {
        // Obtener la definición del subflow
        const subflowDef = targetNode?.data?.subflowDefinition
        const subflowType = targetNode?.data?.nodeRedType as string
        const subflowId = subflowType?.startsWith('subflow:') 
          ? subflowType.replace('subflow:', '')
          : subflowDef?.id
        
        let subflowDefinition: NodeRedSubflowDefinition | undefined = subflowDef
        if (!subflowDefinition && subflowId) {
          subflowDefinition = subflowDefMap.get(subflowId)
        }
        
        if (subflowDefinition && subflowDefinition.in && subflowDefinition.in.length > 1) {
          // Subflow con múltiples puertos de entrada
          // Usar un contador por subflow para asignar puertos en orden
          // Esto asigna puertos secuencialmente: el primer edge al subflow usa input-0, el segundo input-1, etc.
          const currentPort = portCounters.get(targetId) || 0
          
          // Asegurar que no excedamos el número de puertos disponibles
          const maxPort = subflowDefinition.in.length - 1
          const assignedPort = Math.min(currentPort, maxPort)
          targetHandle = `input-${assignedPort}`
          
          // Incrementar contador para el siguiente edge a este subflow
          portCounters.set(targetId, currentPort + 1)
        } else {
          // Subflow con un solo puerto o no se pudo determinar
          targetHandle = 'input'
        }
      }

      // Determinar sourceHandle - si el source es bidireccional, usar "output-0"
      const sourceHandle = isBidirectionalSource ? 'output-0' : `output-${outputPortIndex}`
      
      const edge: ReactFlowEdge = {
        id: edgeId,
        source: sourceNodeId,
        target: targetId,
        // sourceHandle identifica el puerto de salida
        sourceHandle,
        // targetHandle identifica el puerto de entrada
        // Para subflows con múltiples puertos: "input-0", "input-1", etc.
        // Para nodos normales o subflows con un puerto: "input"
        // Para nodos bidireccionales: "bidirectional"
        targetHandle,
        // Tipo de edge: usar smoothstep para curvas suaves estilo Flowise/n8n
        // O bidirectional para nodos LLM
        type: edgeType,
        // Estilos modernos
        style: {
          strokeWidth: 2,
          stroke: 'var(--color-edge-default)',
        },
        markerEnd: {
          type: 'arrowclosed' as MarkerType,
          color: 'var(--color-edge-default)',
        },
      }

      edges.push(edge)
    })
  })

  return edges
}

/**
 * Filtra nodos por flow ID (z)
 * 
 * @param nodes Array de nodos de Node-RED
 * @param flowId ID del flow (z) a filtrar
 * @returns Array de nodos que pertenecen al flow especificado
 */
export function filterNodesByFlow(
  nodes: NodeRedNode[],
  flowId: string
): NodeRedNode[] {
  return nodes.filter((node) => {
    // Los nodos de tipo "tab" tienen su propio id como z
    // Los nodos normales tienen z que apunta al flow
    return node.z === flowId || (node.type === 'tab' && node.id === flowId)
  })
}

/**
 * Extrae grupos de un array de nodos de Node-RED
 * 
 * @param nodes Array de nodos de Node-RED
 * @returns Array de grupos (nodos con type === "group")
 */
export function extractGroups(nodes: NodeRedNode[]): NodeRedGroup[] {
  // Detectar grupos de forma robusta:
  // 1. type === 'group' (forma estándar)
  // 2. ID empieza con 'group-' (grupos creados por el editor, incluso si Node-RED alteró el type)
  // 3. Tiene propiedades w y h (características de grupos)
  const isGroupNode = (node: NodeRedNode): boolean => {
    // Forma estándar
    if (node.type === 'group') return true
    
    // Fallback 1: ID empieza con 'group-' (convención del editor)
    if (node.id?.startsWith('group-')) {
      mapperLogger('⚠️ Grupo detectado por ID (no por type):', { id: node.id, type: node.type })
      return true
    }
    
    // Fallback 2: tiene w y h pero no es un nodo normal (los nodos normales no tienen w/h)
    if (typeof node.w === 'number' && typeof node.h === 'number' && !node.wires) {
      mapperLogger('⚠️ Grupo detectado por estructura w/h (no por type):', { id: node.id, type: node.type })
      return true
    }
    
    return false
  }
  
  return nodes
    .filter((node): node is NodeRedGroup => isGroupNode(node))
    .map((node) => ({
      ...node,
      type: 'group' as const,
      w: node.w || 200, // Default width si no está definido
      h: node.h || 200, // Default height si no está definido
    }))
}

/**
 * Filtra nodos que pertenecen a un grupo específico
 * 
 * @param nodes Array de nodos de Node-RED
 * @param groupId ID del grupo
 * @returns Array de nodos que tienen g === groupId
 */
export function filterNodesByGroup(
  nodes: NodeRedNode[],
  groupId: string
): NodeRedNode[] {
  return nodes.filter((node) => node.g === groupId)
}

/**
 * Transforma un flow completo de Node-RED a nodos y edges de React Flow
 * 
 * Proceso:
 * 1. Filtrar nodos que pertenecen al flow (excluyendo el nodo "tab" mismo)
 * 2. Extraer grupos del flow
 * 3. Filtrar nodos que NO son grupos (los grupos se manejan por separado)
 * 4. Convertir cada nodo a React Flow node
 * 5. Convertir todos los wires a React Flow edges
 * 6. Filtrar edges para asegurar que ambos nodos (source y target) existen
 * 
 * @param allNodes Array completo de nodos de Node-RED (de todos los flows)
 * @param flowId ID del flow a transformar
 * @returns Objeto con nodes, edges y groups de React Flow
 */
export function transformNodeRedFlow(
  allNodes: NodeRedNode[],
  flowId: string
): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[]; groups: NodeRedGroup[] } {
  mapperLogger('🔄 Transformando flow:', flowId)
  
  // Extraer definiciones de subflows de todos los nodos
  const subflowDefinitions = allNodes.filter(
    (node): node is NodeRedSubflowDefinition => node.type === 'subflow'
  )
  mapperLogger('📦 Definiciones de subflows encontradas:', { count: subflowDefinitions.length })
  
  // Verificar si el flowId es un subflow
  const subflowDefinition = subflowDefinitions.find(sf => sf.id === flowId)
  
  let flowNodes: NodeRedNode[]
  
  if (subflowDefinition) {
    // Si es un subflow, usar los nodos internos del subflow (flow[])
    mapperLogger('📦 Transformando subflow, usando nodos internos')
    const internalNodes = subflowDefinition.flow || []
    
    // CRÍTICO: También incluir grupos del array principal que tienen z = subflowId
    // Los grupos de subflows se guardan en el array principal (no en subflow.flow[])
    // porque Node-RED no reconoce grupos dentro de subflow.flow[]
    const groupsFromMainArray = allNodes.filter(n => 
      n.z === flowId && (n.type === 'group' || n.id?.startsWith('group-'))
    )
    
    mapperLogger('📦 Grupos encontrados en array principal para subflow:', {
      subflowId: flowId,
      count: groupsFromMainArray.length,
      ids: groupsFromMainArray.map(g => g.id),
    })
    
    flowNodes = [...internalNodes, ...groupsFromMainArray]
  } else {
    // Si es un tab (flow normal), filtrar nodos que pertenecen a este flow
    // Excluimos el nodo "tab" mismo ya que no se renderiza
    // También excluimos nodos internos de subflows (tienen z = subflowId)
    const subflowIds = new Set(subflowDefinitions.map(sf => sf.id))
    flowNodes = filterNodesByFlow(allNodes, flowId).filter(
      (node) => {
        // Excluir tabs
        if (node.type === 'tab') return false
        // Excluir nodos internos de subflows (tienen z = subflowId)
        if (node.z && subflowIds.has(node.z)) return false
        return true
      }
    )
  }
  mapperLogger('📋 Nodos del flow filtrados:', { 
    total: allNodes.length, 
    enFlow: flowNodes.length,
    tipos: [...new Set(flowNodes.map(n => n.type))],
    // Log detallado para diagnosticar grupos
    nodosConW: flowNodes.filter(n => typeof n.w === 'number').map(n => ({ id: n.id, type: n.type, w: n.w, h: n.h })),
    nodosConIdGroup: flowNodes.filter(n => n.id?.startsWith('group-')).map(n => ({ id: n.id, type: n.type })),
  })

  // Extraer grupos del flow
  const groups = extractGroups(flowNodes)
  mapperLogger('📦 Grupos encontrados:', { count: groups.length, ids: groups.map(g => g.id) })

  // Filtrar nodos que NO son grupos (usando los IDs de grupos detectados)
  const groupIds = new Set(groups.map(g => g.id))
  const nonGroupNodes = flowNodes.filter((node) => !groupIds.has(node.id))
  
  // Convertir grupos a nodos React Flow
  const groupNodes: ReactFlowNode[] = groups.map((group) => {
    // Contar nodos dentro del grupo
    const nodesInGroup = nonGroupNodes.filter((node) => node.g === group.id).length
    
    return {
      id: group.id,
      type: 'group',
      position: {
        x: group.x || 0,
        y: group.y || 0,
      },
      data: {
        // CRÍTICO: Incluir nodeRedType y nodeRedNode para consistencia con la serialización
        // Esto asegura que al guardar de nuevo, el grupo se serialice correctamente como 'group'
        // y no como 'unknown'
        nodeRedType: 'group',
        nodeRedNode: group,
        group,
        nodesCount: nodesInGroup,
        label: group.name || group.label || 'Grupo',
        flowId: flowId,
        outputPortsCount: 0,
      },
      style: {
        width: group.w || 300,
        height: group.h || 200,
      },
    }
  })
  
  // Convertir nodos de Node-RED a React Flow nodes (excluyendo grupos)
  // Pasar subflowDefinitions para que las instancias puedan obtener su definición
  const nodes = nonGroupNodes.map((nodeRedNode) => {
    // CRÍTICO: Si estamos renderizando un subflow (flowId es un subflow),
    // los nodos internos vienen de subflow.flow[] y no tienen z.
    // Necesitamos establecer z = flowId para que luego se puedan identificar correctamente al guardar.
    const nodeWithZ = subflowDefinition && !nodeRedNode.z
      ? { ...nodeRedNode, z: flowId }
      : nodeRedNode
    const reactFlowNode = mapNodeRedNodeToReactFlowNode(nodeWithZ, subflowDefinitions)
    
    // Si el nodo pertenece a un grupo, establecer parentId
    if (nodeRedNode.g) {
      reactFlowNode.parentId = nodeRedNode.g
    }
    
    return reactFlowNode
  })
  
  // Combinar nodos normales con nodos de grupo
  const allReactFlowNodes = [...groupNodes, ...nodes]
  mapperLogger('✨ Nodos convertidos a React Flow:', { count: allReactFlowNodes.length })

  // Crear un Set de IDs de nodos para validación rápida (incluyendo grupos)
  const nodeIds = new Set(allReactFlowNodes.map((node) => node.id))

  // Crear un Map de nodeId -> ReactFlowNode para búsqueda rápida
  const targetNodeMap = new Map<string, ReactFlowNode>()
  allReactFlowNodes.forEach(node => {
    targetNodeMap.set(node.id, node)
  })

  // Map para rastrear puertos de entrada de subflows
  // Esto nos permite asignar targetHandle correctos (input-0, input-1, etc.)
  const subflowInputPortCounters = new Map<string, number>()

  // Convertir todos los wires a edges
  const allEdges: ReactFlowEdge[] = []
  flowNodes.forEach((node) => {
    if (node.wires && node.wires.length > 0) {
      const edges = mapNodeRedWiresToReactFlowEdges(
        node.id, 
        node.wires,
        subflowDefinitions,
        targetNodeMap,
        subflowInputPortCounters
      )
      allEdges.push(...edges)
    }
  })
  mapperLogger('🔗 Edges creados desde wires:', { count: allEdges.length })

  // Filtrar edges para asegurar que tanto source como target existen
  // Esto es importante porque pueden haber referencias a nodos de otros flows
  // o nodos que no se renderizan (como config nodes)
  const validEdges = allEdges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
  
  const invalidCount = allEdges.length - validEdges.length
  if (invalidCount > 0) {
    mapperLogger('⚠️ Edges inválidos filtrados:', { invalidCount })
  }

  const summary = {
    flowId,
    nodesCount: allReactFlowNodes.length,
    edgesCount: validEdges.length,
    groupsCount: groups.length,
    nodeTypes: [...new Set(allReactFlowNodes.filter(n => n.type !== 'group').map(n => n.data.nodeRedType))],
  }
  
  mapperLogger('✅ Transformación completada:', summary)
  
  // Log detallado si hay grupos
  if (groups.length > 0) {
    mapperLogger('📦 Grupos encontrados:', groups.map(g => ({
      id: g.id,
      name: g.name || g.label,
      position: `${g.x},${g.y}`,
      size: `${g.w}x${g.h}`,
      nodesInGroup: filterNodesByGroup(nonGroupNodes, g.id).length,
    })))
  }
  
  // Log detallado si hay nodos
  if (allReactFlowNodes.length > 0) {
    mapperLogger('📦 Nodos transformados:', allReactFlowNodes.map(n => ({
      id: n.id,
      type: n.type === 'group' ? 'group' : n.data.nodeRedType,
      label: n.type === 'group' ? n.data.group.name : n.data.label,
      position: `${n.position.x},${n.position.y}`,
      group: n.data.nodeRedNode?.g || 'none',
    })))
  }
  
  // Log detallado si hay edges
  if (validEdges.length > 0) {
    mapperLogger('🔗 Edges creados:', validEdges.map(e => ({
      from: e.source,
      to: e.target,
      port: e.sourceHandle,
    })))
  }

  return {
    nodes: allReactFlowNodes,
    edges: validEdges,
    groups,
  }
}

/**
 * Obtiene todos los flows (tabs) de un array de nodos de Node-RED
 * 
 * @param nodes Array completo de nodos de Node-RED
 * @returns Array de flows (nodos de tipo "tab" o "subflow") sin duplicados
 */
export function extractFlows(nodes: NodeRedNode[]): NodeRedNode[] {
  // Incluir tanto tabs (flows) como subflows en la lista
  // Similar a n8n donde todos los flows pueden ser tratados como subflows
  // Usar un Map para asegurar que no haya duplicados por ID
  const flowsMap = new Map<string, NodeRedNode>()
  
  nodes.forEach((node) => {
    if ((node.type === 'tab' || node.type === 'subflow') && node.id) {
      // Solo agregar si no existe ya un flow con este ID
      if (!flowsMap.has(node.id)) {
        flowsMap.set(node.id, node)
      }
    }
  })
  
  return Array.from(flowsMap.values())
}

// COMENTADO: deepMerge no se usa actualmente - eliminado para evitar errores de compilación
// /**
//  * Merge profundo de objetos para preservar propiedades anidadas
//  * 
//  * Combina dos objetos preservando todas las propiedades del original,
//  * pero sobrescribiendo con las del nuevo cuando sea necesario.
//  * 
//  * @param original Objeto original con todas las propiedades
//  * @param updates Objeto con actualizaciones
//  * @returns Objeto combinado
//  */
// function deepMerge<T extends Record<string, any>>(original: T, updates: Partial<T>): T {
//   const result = { ...original }
//   
//   for (const key in updates) {
//     if (updates.hasOwnProperty(key)) {
//       const originalValue = original[key]
//       const updateValue = updates[key]
//       
//       // Si ambos son objetos y no son arrays, hacer merge profundo
//       if (
//         originalValue &&
//         typeof originalValue === 'object' &&
//         !Array.isArray(originalValue) &&
//         updateValue &&
//         typeof updateValue === 'object' &&
//         !Array.isArray(updateValue)
//       ) {
//         result[key] = deepMerge(originalValue, updateValue)
//       } else {
//         // Si el valor original existe y el update es undefined, preservar el original
//         // Si el update tiene un valor, usarlo
//         if (updateValue !== undefined) {
//           result[key] = updateValue as T[Extract<keyof T, string>]
//         }
//       }
//     }
//   }
//   
//   return result
// }

/**
 * Transforma nodos y edges de React Flow a formato Node-RED
 * 
 * Esta es la función inversa de transformNodeRedFlow.
 * Convierte nodos y edges de React Flow de vuelta al formato que Node-RED espera.
 * 
 * IMPORTANTE: Preserva TODAS las propiedades originales del nodo Node-RED,
 * incluyendo propiedades desconocidas y anidadas, usando merge profundo.
 * 
 * @param nodes Array de nodos de React Flow
 * @param edges Array de edges de React Flow
 * @param flowId ID del flow al que pertenecen los nodos
 * @returns Array de nodos en formato Node-RED
 */
export function transformReactFlowToNodeRed(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  flowId: string,
  allNodeRedNodes?: NodeRedNode[] // Todos los nodos de Node-RED (para obtener subflows originales)
): NodeRedNode[] {
  mapperLogger('🔄 Transformando React Flow a Node-RED para flow:', flowId)

  // Obtener subflows originales desde allNodeRedNodes si están disponibles
  // CRÍTICO: Solo incluir DEFINICIONES de subflow (type === 'subflow' Y sin x, y, z)
  // Las INSTANCIAS de subflow tienen type === 'subflow:ID' y SÍ tienen x, y, z
  const originalSubflows = new Map<string, NodeRedSubflowDefinition>()
  if (allNodeRedNodes) {
    allNodeRedNodes.forEach(node => {
      // Solo agregar definiciones de subflow, no instancias
      // Definición: type === 'subflow' Y sin x, y, z
      if (node.type === 'subflow' && !node.x && !node.y && !node.z) {
        originalSubflows.set(node.id, node as NodeRedSubflowDefinition)
      }
    })
  }
  
  // CRÍTICO: Si el flowId es un subflow (estamos editando un subflow), agregarlo a originalSubflows
  // Esto asegura que los nodos internos se identifiquen correctamente
  // IMPORTANTE: NO crear entrada temporal para tabs - solo para subflows reales
  if (flowId && !originalSubflows.has(flowId)) {
    // Buscar el subflow en allNodeRedNodes - DEBE ser type === 'subflow' Y NO tener x, y, z (definición, no instancia)
    const subflowInAllNodes = allNodeRedNodes?.find(n => 
      n.id === flowId && 
      n.type === 'subflow' && 
      !n.x && !n.y && !n.z  // Solo definiciones de subflow, no instancias
    )
    if (subflowInAllNodes) {
      originalSubflows.set(flowId, subflowInAllNodes as NodeRedSubflowDefinition)
    }
    // NO crear entrada temporal - si no es un subflow real, no debe estar en originalSubflows
    // Esto previene que los nodos de un tab normal se traten como "nodos internos de subflow"
  }

  // #region agent log
  // H2: Verificar edges antes de reconstruir wires
  fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mappers.ts:transformReactFlowToNodeRed:init',message:'Inicio de transformación',data:{flowId,nodesCount:nodes.length,edgesCount:edges.length,nodeIds:nodes.map(n=>n.id),edgeSample:edges.slice(0,5).map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:e.sourceHandle,targetHandle:e.targetHandle}))},timestamp:Date.now(),sessionId:'debug-session',runId:'save-debug',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Agrupar edges por nodo fuente para reconstruir wires
  const edgesBySource = new Map<string, Map<number, string[]>>()

  edges.forEach((edge) => {
    const sourceId = edge.source
    // Extraer índice del puerto de salida desde sourceHandle (ej: "output-0" -> 0)
    const outputPortIndex = edge.sourceHandle
      ? parseInt(edge.sourceHandle.replace('output-', ''), 10) || 0
      : 0

    if (!edgesBySource.has(sourceId)) {
      edgesBySource.set(sourceId, new Map())
    }

    const sourceEdges = edgesBySource.get(sourceId)!
    if (!sourceEdges.has(outputPortIndex)) {
      sourceEdges.set(outputPortIndex, [])
    }

    sourceEdges.get(outputPortIndex)!.push(edge.target)
  })

  // Separar nodos normales de nodos internos de subflows
  const normalNodes: ReactFlowNode[] = []
  const subflowInternalNodes = new Map<string, NodeRedNode[]>() // subflowId -> nodos internos

  // CRÍTICO: Crear un Set inicial de IDs de nodos válidos para validar wires
  // Esto incluye todos los nodos del canvas y nodos de otros flows
  const validNodeIds = new Set<string>()
  nodes.forEach(n => validNodeIds.add(n.id))
  // También incluir nodos de otros flows que se preservarán
  if (allNodeRedNodes) {
    allNodeRedNodes.forEach(n => {
      if (n.type !== 'tab' && n.type !== 'subflow' && n.z !== flowId) {
        validNodeIds.add(n.id)
      }
    })
  }

  // Log para debug
  mapperLogger('🔍 Identificando nodos internos:', {
    flowId,
    originalSubflowsCount: originalSubflows.size,
    originalSubflowIds: Array.from(originalSubflows.keys()),
    nodesCount: nodes.length,
  })

  nodes.forEach((node) => {
    const originalNodeRedNode = node.data.nodeRedNode || {}
    const nodeZ = originalNodeRedNode.z
    const flowIdFromData = node.data.flowId // También verificar flowId desde data
    
    // Si el nodo pertenece a un subflow (z es un ID de subflow), es un nodo interno
    // CRÍTICO: También verificar si flowId es un subflow (estamos editando un subflow)
    // Si nodeZ === flowId, entonces estamos editando un subflow y estos son nodos internos
    // IMPORTANTE: Si flowId es un subflow y el nodo no tiene z pero está en el canvas del subflow,
    // también es un nodo interno (viene de subflow.flow[] que no tiene z)
    const isEditingSubflow = originalSubflows.has(flowId) || (flowId && allNodeRedNodes?.some(n => n.id === flowId && n.type === 'subflow'))
    // Usar nodeZ o flowIdFromData para determinar el z del nodo
    const effectiveZ = nodeZ || flowIdFromData
    // Un nodo es interno de un subflow si:
    // 1. Su z apunta a un subflow que existe en originalSubflows (NO si z === flowId cuando flowId es un tab)
    // 2. O estamos editando un subflow (isEditingSubflow=true) y el nodo no tiene z o su z es el subflow actual
    const isInternalNode = (effectiveZ && originalSubflows.has(effectiveZ)) || 
                          (isEditingSubflow && (!effectiveZ || effectiveZ === flowId))
    
    if (isInternalNode) {
      // Usar effectiveZ como subflowId, o flowId si effectiveZ no está definido
      const targetSubflowId = effectiveZ || flowId
      if (!subflowInternalNodes.has(targetSubflowId)) {
        subflowInternalNodes.set(targetSubflowId, [])
      }

      // CRÍTICO: Si es un grupo dentro de un subflow, NO lo guardamos en subflow.flow[]
      // porque Node-RED no reconoce grupos dentro de subflow.flow[] y los convierte a 'unknown'.
      // En su lugar, lo tratamos como un nodo normal que irá al array principal con z = subflowId.
      // Detectar grupos por: node.type === 'group' O node.data.nodeRedType === 'group'
      const isGroupNode = node.type === 'group' || node.data?.nodeRedType === 'group'
      
      if (isGroupNode) {
        // NO añadir a subflowInternalNodes - los grupos irán al array principal
        // Esto se maneja más abajo en normalNodes
        mapperLogger('📦 Grupo en subflow detectado, se guardará en array principal:', {
          groupId: node.id,
          subflowId: targetSubflowId,
        })
        normalNodes.push(node)
        return
      }

      // Convertir el nodo interno usando la misma lógica que los nodos normales
      // pero sin z (ya que está dentro del subflow)
      const originalNodeRedNode = node.data.nodeRedNode || {}
      const nodeName = originalNodeRedNode.name !== undefined && originalNodeRedNode.name !== ''
        ? originalNodeRedNode.name
        : (node.data.label || undefined)
      
      // Reconstruir wires desde edges (solo edges internos del subflow)
      const wires: string[][] = []
      const sourceEdges = edgesBySource.get(node.id)
      if (sourceEdges) {
        const maxPort = Math.max(...Array.from(sourceEdges.keys()), -1)
        for (let i = 0; i <= maxPort; i++) {
          const edgeTargets = sourceEdges.get(i) || []
          // CRÍTICO: Filtrar solo targets que existen en validNodeIds (incluyendo nodos internos del subflow)
          wires[i] = edgeTargets.filter(targetId => validNodeIds.has(targetId))
        }
      }
      
      // CRÍTICO: También validar wires originales del nodo interno si existen
      if (originalNodeRedNode.wires && Array.isArray(originalNodeRedNode.wires)) {
        const originalWires = originalNodeRedNode.wires as string[][]
        originalWires.forEach((portWires, portIndex) => {
          if (Array.isArray(portWires)) {
            const validOriginalWires = portWires.filter(targetId => 
              typeof targetId === 'string' && validNodeIds.has(targetId)
            )
            if (validOriginalWires.length > 0) {
              if (!wires[portIndex]) {
                wires[portIndex] = []
              }
              const combinedWires = [...new Set([...wires[portIndex], ...validOriginalWires])]
              wires[portIndex] = combinedWires
            }
          }
        })
      }
      
      // CRÍTICO: Preservar el ID original de Node-RED si existe
      const preservedInternalId = originalNodeRedNode.id || node.id
      
      const internalNode: NodeRedNode = {
        ...originalNodeRedNode,
        id: preservedInternalId,
        type: node.data.nodeRedType || originalNodeRedNode.type || 'unknown',
        x: node.position.x,
        y: node.position.y,
        // NO incluir z - los nodos internos no tienen z
        ...(nodeName && { name: nodeName }),
        // CRÍTICO: Siempre sobrescribir wires, incluso si está vacío, para eliminar referencias a nodos inexistentes
        wires, // Siempre usar los wires validados, incluso si es un array vacío
      }
      
      // targetSubflowId ya está definido arriba
      subflowInternalNodes.get(targetSubflowId)!.push(internalNode)
      
      mapperLogger('📦 Nodo interno identificado:', {
        nodeId: internalNode.id,
        nodeType: internalNode.type,
        subflowId: targetSubflowId,
        hasWires: !!internalNode.wires,
      })
    } else {
      normalNodes.push(node)
    }
  })
  
  mapperLogger('📊 Resumen de nodos internos:', {
    subflowInternalNodesCount: Array.from(subflowInternalNodes.values()).reduce((sum, arr) => sum + arr.length, 0),
    bySubflow: Object.fromEntries(
      Array.from(subflowInternalNodes.entries()).map(([id, nodes]) => [id, nodes.length])
    ),
  })

  // CRÍTICO: Actualizar validNodeIds con los nodos internos procesados
  // Esto asegura que los wires de nodos normales puedan validarse correctamente
  Array.from(subflowInternalNodes.values()).forEach(internalNodes => {
    internalNodes.forEach(internalNode => {
      validNodeIds.add(internalNode.id)
    })
  })

  // Convertir cada nodo normal de React Flow a Node-RED
  const nodeRedNodes: NodeRedNode[] = normalNodes.map((node) => {
    // Si es un grupo, manejar de forma especial
    // Detectar grupos por: node.type === 'group' O node.data.nodeRedType === 'group'
    const isGroupNode = node.type === 'group' || node.data?.nodeRedType === 'group'
    const groupData = node.data?.group || (node.data?.nodeRedNode?.type === 'group' ? node.data.nodeRedNode : null)
    
    if (isGroupNode && groupData) {
      const group = groupData as NodeRedGroup
      
      // Los grupos NO tienen wires, solo se preservan como nodos especiales
      return {
        id: group.id,
        type: 'group',
        name: group.name || group.label,
        x: node.position.x,
        y: node.position.y,
        z: flowId,
        w: group.w || 400,
        h: group.h || 300,
        ...(group.color && { color: group.color }),
        ...(group.label && { label: group.label }),
      } as NodeRedNode
    }
    
    // Obtener datos originales del nodo si están preservados
    const originalNodeRedNode = node.data.nodeRedNode || {}

    // Reconstruir wires desde edges
    const wires: string[][] = []
    const sourceEdges = edgesBySource.get(node.id)
    if (sourceEdges) {
      // Obtener el número máximo de puertos de salida
      const maxPort = Math.max(...Array.from(sourceEdges.keys()), -1)
      for (let i = 0; i <= maxPort; i++) {
        const edgeTargets = sourceEdges.get(i) || []
        // CRÍTICO: Filtrar solo targets que existen en validNodeIds
        const validTargets = edgeTargets.filter(targetId => validNodeIds.has(targetId))
        const invalidTargets = edgeTargets.filter(targetId => !validNodeIds.has(targetId))
        if (invalidTargets.length > 0) {
          console.warn(`[transformReactFlowToNodeRed] Filtrando wires inválidos del nodo ${node.id} puerto ${i}:`, invalidTargets)
        }
        wires[i] = validTargets
      }
    }
    
    // CRÍTICO: Si el nodo original tenía wires preservados, también validarlos
    // Esto es necesario porque algunos nodos pueden tener wires que no están en los edges de React Flow
    // (por ejemplo, si se eliminó un nodo pero el originalNodeRedNode todavía tiene los wires)
    if (originalNodeRedNode.wires && Array.isArray(originalNodeRedNode.wires)) {
      const originalWires = originalNodeRedNode.wires as string[][]
      // Validar y limpiar wires originales
      originalWires.forEach((portWires, portIndex) => {
        if (Array.isArray(portWires)) {
          const validOriginalWires = portWires.filter(targetId => 
            typeof targetId === 'string' && validNodeIds.has(targetId)
          )
          const invalidOriginalWires = portWires.filter(targetId => 
            typeof targetId === 'string' && !validNodeIds.has(targetId)
          )
          if (invalidOriginalWires.length > 0) {
            console.warn(`[transformReactFlowToNodeRed] Filtrando wires originales inválidos del nodo ${node.id} puerto ${portIndex}:`, invalidOriginalWires)
          }
          // Si hay wires válidos del original que no están en los wires reconstruidos, agregarlos
          if (validOriginalWires.length > 0) {
            if (!wires[portIndex]) {
              wires[portIndex] = []
            }
            // Combinar wires de edges y wires originales válidos, eliminando duplicados
            const combinedWires = [...new Set([...wires[portIndex], ...validOriginalWires])]
            wires[portIndex] = combinedWires
          }
        }
      })
    }

    // Propiedades que se actualizan desde React Flow
    // Usar nodeRedNode.name si está disponible (puede haber sido editado), sino usar label
    // El name puede haber sido editado en el panel de propiedades, así que priorizamos nodeRedNode.name
    const nodeName = originalNodeRedNode.name !== undefined && originalNodeRedNode.name !== ''
      ? originalNodeRedNode.name
      : (node.data.label || undefined)
    
    // Para nodos link, preservar la propiedad 'links' que contiene las conexiones de link
    // Los nodos link no usan wires para conectarse entre sí, sino la propiedad 'links'
    const isLinkNode = originalNodeRedNode.type === 'link in' || 
                       originalNodeRedNode.type === 'link out' || 
                       originalNodeRedNode.type === 'link call'
    const preservedLinks = isLinkNode ? originalNodeRedNode.links : undefined
    
    // Simplificado: usar el ID directamente desde React Flow
    // Si hay un ID original, usarlo; si no, usar el ID de React Flow
    // La API corregirá cualquier problema al recargar
    const preservedId = originalNodeRedNode.id || node.id
    
    // CRÍTICO: Preservar TODAS las propiedades del nodo original
    // Esto es esencial para que los nodos funcionen correctamente después de guardar
    // Especialmente importante para nodos inject que necesitan props, payloadType, cron, etc.
    // También importante para nodos personalizados como model.azure.openai que necesitan endpoint, apiKey, etc.
    // 
    // IMPORTANTE: No sobrescribir propiedades que no han cambiado
    // Solo sobrescribir las propiedades que React Flow gestiona (id, type, x, y, z, name, wires, links)
    // 
    // CRÍTICO: Para nodos personalizados, preservar TODAS las propiedades de configuración
    // que vienen de node.data.nodeRedNode (que se actualiza desde los custom editors)
    // IMPORTANTE: Las credenciales (como apiKey) NO deben incluirse en el nodeRedNode
    // porque se almacenan por separado en el sistema de credenciales de Node-RED
    const updatedNodeData = node.data.nodeRedNode && typeof node.data.nodeRedNode === 'object' 
      ? { ...node.data.nodeRedNode } 
      : {}
    
    // Filtrar credenciales del nodeRedNode (se guardan por separado)
    // Para model.azure.openai, apiKey es una credencial
    const isAzureOpenAINode = node.data.nodeRedType === 'model.azure.openai'
    if (isAzureOpenAINode && 'apiKey' in updatedNodeData) {
      delete updatedNodeData.apiKey
    }
    
    const nodeRedNode: NodeRedNode = {
      // Primero, copiar TODAS las propiedades del nodo original
      ...originalNodeRedNode,
      
      // CRÍTICO: Si node.data.nodeRedNode tiene propiedades actualizadas (desde custom editors),
      // estas deben tener prioridad sobre originalNodeRedNode para preservar cambios del usuario
      // Esto es especialmente importante para propiedades como endpoint, deployment, etc.
      // NOTA: apiKey se filtra arriba porque es una credencial
      ...updatedNodeData,
      
      // Luego, sobrescribir SOLO las propiedades que React Flow gestiona
      id: preservedId,
      type: node.data.nodeRedType || originalNodeRedNode.type || 'unknown',
      x: node.position.x,
      y: node.position.y,
      z: flowId, // CRÍTICO: El z debe ser el flowId actual, no el original
      
      // Propiedades que pueden haber cambiado (solo si tienen valor)
      // IMPORTANTE: Preservar name original si nodeName está vacío
      ...(nodeName !== undefined && nodeName !== '' ? { name: nodeName } : (originalNodeRedNode.name !== undefined ? { name: originalNodeRedNode.name } : {})),
      // CRÍTICO: Siempre sobrescribir wires, incluso si está vacío, para eliminar referencias a nodos inexistentes
      wires, // Siempre usar los wires validados, incluso si es un array vacío
      ...(isLinkNode && preservedLinks !== undefined && { links: preservedLinks }),
    }
    
    // #region agent log
    // H1, H4: Verificar preservación de propiedades críticas
    const criticalProps = ['func', 'props', 'payloadType', 'payload', 'topic', 'repeat', 'crontab', 'once', 'onceDelay', 'outputs', 'noerr', 'initialize', 'finalize', 'libs']
    const missingCritical = criticalProps.filter(p => originalNodeRedNode[p] !== undefined && nodeRedNode[p] === undefined)
    const changedCritical = criticalProps.filter(p => originalNodeRedNode[p] !== undefined && nodeRedNode[p] !== undefined && JSON.stringify(originalNodeRedNode[p]) !== JSON.stringify(nodeRedNode[p]))
    if (missingCritical.length > 0 || changedCritical.length > 0 || node.data.nodeRedType === 'function' || node.data.nodeRedType === 'inject') {
      fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mappers.ts:transformNode',message:'Verificación de propiedades críticas',data:{nodeId:preservedId,nodeType:node.data.nodeRedType,missingCritical,changedCritical,originalProps:Object.keys(originalNodeRedNode).filter(k=>criticalProps.includes(k)),transformedProps:Object.keys(nodeRedNode).filter(k=>criticalProps.includes(k)),originalFunc:originalNodeRedNode.func?.substring?.(0,50),transformedFunc:nodeRedNode.func?.substring?.(0,50),originalWires:originalNodeRedNode.wires,transformedWires:nodeRedNode.wires,hasNodeRedNode:!!node.data.nodeRedNode},timestamp:Date.now(),sessionId:'debug-session',runId:'save-debug',hypothesisId:'H1,H4'})}).catch(()=>{});
    }
    // #endregion
    
    // CRÍTICO: Para nodos inject, asegurar que todas las propiedades necesarias estén presentes
    // Si el nodo original tenía estas propiedades, preservarlas exactamente como estaban
    if (nodeRedNode.type === 'inject') {
      // Asegurar que props, payloadType, repeat, cron, once, onceDelay, topic, payload estén presentes
      // Si no están en el nodo transformado, usar los valores del original
      if (!nodeRedNode.props && originalNodeRedNode.props) {
        nodeRedNode.props = originalNodeRedNode.props
      }
      if (nodeRedNode.payloadType === undefined && originalNodeRedNode.payloadType !== undefined) {
        nodeRedNode.payloadType = originalNodeRedNode.payloadType
      }
      if (nodeRedNode.repeat === undefined && originalNodeRedNode.repeat !== undefined) {
        nodeRedNode.repeat = originalNodeRedNode.repeat
      }
      if (nodeRedNode.cron === undefined && originalNodeRedNode.cron !== undefined) {
        nodeRedNode.cron = originalNodeRedNode.cron
      }
      if (nodeRedNode.crontab === undefined && originalNodeRedNode.crontab !== undefined) {
        nodeRedNode.crontab = originalNodeRedNode.crontab
      }
      if (nodeRedNode.once === undefined && originalNodeRedNode.once !== undefined) {
        nodeRedNode.once = originalNodeRedNode.once
      }
      if (nodeRedNode.onceDelay === undefined && originalNodeRedNode.onceDelay !== undefined) {
        nodeRedNode.onceDelay = originalNodeRedNode.onceDelay
      }
      if (nodeRedNode.topic === undefined && originalNodeRedNode.topic !== undefined) {
        nodeRedNode.topic = originalNodeRedNode.topic
      }
      if (nodeRedNode.payload === undefined && originalNodeRedNode.payload !== undefined) {
        nodeRedNode.payload = originalNodeRedNode.payload
      }
    }
    


    return nodeRedNode
  })


  // Procesar subflows: agregar nodos internos a la propiedad 'flow'
  // CRÍTICO: Node-RED necesita que los nodos internos estén:
  // 1. En subflow.flow[] (sin z) - para compatibilidad con módulos
  // 2. En el array principal con z = subflowId - para que estén en node_map cuando Node-RED procesa el subflow
  const processedSubflows = new Set<string>()
  const finalNodes: NodeRedNode[] = []
  const internalNodesToAdd: NodeRedNode[] = [] // Nodos internos que se agregarán al array principal
  
  // CRÍTICO: Si estamos editando un subflow (flowId es un subflow), crear la definición del subflow
  // porque los nodos React Flow solo incluyen los nodos internos, no la definición del subflow
  if (flowId && originalSubflows.has(flowId)) {
    const subflowId = flowId
    const internalNodes = subflowInternalNodes.get(subflowId) || []
    const originalSubflow = originalSubflows.get(subflowId)!
    
    // Crear la definición del subflow con los nodos internos actualizados
    // CRÍTICO: Preservar TODAS las propiedades del subflow original (in, out, name, category, etc.)
    const subflow: NodeRedSubflowDefinition = {
      ...originalSubflow, // Preservar TODAS las propiedades originales (in, out, name, category, color, icon, env, etc.)
      id: subflowId,
      type: 'subflow',
      flow: internalNodes.length > 0 ? internalNodes : (originalSubflow.flow || []),
    } as NodeRedSubflowDefinition
    
    // CRÍTICO: Limpiar y validar wires en in/out para evitar errores en Node-RED
    // Node-RED falla si hay elementos undefined en los arrays de wires
    const internalNodeIds = new Set((subflow.flow || []).map(n => n.id))
    
    if (subflow.in && Array.isArray(subflow.in)) {
      subflow.in = subflow.in.map((inPort: any) => {
        const validWires = inPort.wires 
          ? inPort.wires
              .filter((w: any) => w != null && w !== undefined && typeof w === 'object')
              .filter((w: any) => w.id != null && w.id !== undefined && typeof w.id === 'string' && w.id.trim() !== '')
              .filter((w: any) => internalNodeIds.has(w.id))
              .map((w: any) => ({ id: w.id }))
          : []
        return {
          ...inPort,
          wires: validWires.length > 0 ? validWires : []
        }
      }).filter((p: any) => p != null && p !== undefined)
    }
    
    if (subflow.out && Array.isArray(subflow.out)) {
      subflow.out = subflow.out.map((outPort: any) => {
        const validWires = outPort.wires
          ? outPort.wires
              .filter((w: any) => w != null && w !== undefined && typeof w === 'object')
              .filter((w: any) => w.id != null && w.id !== undefined && typeof w.id === 'string' && w.id.trim() !== '')
              .filter((w: any) => internalNodeIds.has(w.id))
              .map((w: any) => ({ 
                id: w.id,
                ...(w.port !== undefined && { port: w.port })
              }))
          : []
        return {
          ...outPort,
          wires: validWires.length > 0 ? validWires : []
        }
      }).filter((p: any) => p != null && p !== undefined)
    }
    
    // CRÍTICO: También agregar los nodos internos como nodos separados con z = subflowId
    // Esto es necesario para que Node-RED pueda encontrarlos en node_map cuando procesa el subflow
    if (internalNodes.length > 0) {
      internalNodes.forEach(internalNode => {
        // Crear una copia del nodo interno con z = subflowId para el array principal
        const internalNodeWithZ: NodeRedNode = {
          ...internalNode, // Preservar TODAS las propiedades (wires, func, outputs, etc.)
          z: subflowId, // CRÍTICO: Los nodos internos en el array principal DEBEN tener z = subflowId
          x: internalNode.x ?? 0, // Asegurar que tenga x
          y: internalNode.y ?? 0, // Asegurar que tenga y
        } as NodeRedNode
        
        internalNodesToAdd.push(internalNodeWithZ)
      })
    }
    
    finalNodes.push(subflow)
    processedSubflows.add(subflowId)
    
    mapperLogger('📦 Subflow creado desde originalSubflow:', {
      subflowId,
      internalNodesCount: internalNodes.length,
      hasIn: !!subflow.in,
      inLength: subflow.in?.length || 0,
      hasOut: !!subflow.out,
      outLength: subflow.out?.length || 0,
      flowLength: subflow.flow?.length || 0,
      // Log detallado de nodos internos para diagnosticar grupos
      flowNodes: (subflow.flow || []).map(n => ({ id: n.id, type: n.type, hasW: typeof n.w === 'number' })),
    })
  }
  
  nodeRedNodes.forEach((node) => {
    // Si es un subflow, agregar sus nodos internos
    if (node.type === 'subflow') {
      const subflowId = node.id
      
      // Si ya procesamos este subflow (porque flowId === subflowId), saltarlo
      if (processedSubflows.has(subflowId)) {
        return
      }
      
      const internalNodes = subflowInternalNodes.get(subflowId) || []
      
      // Obtener el subflow original para preservar su estructura
      const originalSubflow = originalSubflows.get(subflowId)
      
      // Crear el subflow con sus nodos internos en la propiedad 'flow'
      const subflow: NodeRedSubflowDefinition = {
        ...(originalSubflow || {}),
        ...node,
        type: 'subflow',
        flow: internalNodes.length > 0 ? internalNodes : (originalSubflow?.flow || []),
      } as NodeRedSubflowDefinition
      
      // CRÍTICO: Limpiar y validar wires en in/out para evitar errores en Node-RED
      // Node-RED falla si hay elementos undefined en los arrays de wires
      const internalNodeIdsForSubflow = new Set((subflow.flow || []).map(n => n.id))
      
      if (subflow.in && Array.isArray(subflow.in)) {
        subflow.in = subflow.in.map((inPort: any) => {
          const validWires = inPort.wires 
            ? inPort.wires
                .filter((w: any) => w != null && w !== undefined && typeof w === 'object')
                .filter((w: any) => w.id != null && w.id !== undefined && typeof w.id === 'string' && w.id.trim() !== '')
                .filter((w: any) => internalNodeIdsForSubflow.has(w.id))
                .map((w: any) => ({ id: w.id }))
            : []
          return {
            ...inPort,
            wires: validWires.length > 0 ? validWires : []
          }
        }).filter((p: any) => p != null && p !== undefined)
      }
      
      if (subflow.out && Array.isArray(subflow.out)) {
        subflow.out = subflow.out.map((outPort: any) => {
          const validWires = outPort.wires
            ? outPort.wires
                .filter((w: any) => w != null && w !== undefined && typeof w === 'object')
                .filter((w: any) => w.id != null && w.id !== undefined && typeof w.id === 'string' && w.id.trim() !== '')
                .filter((w: any) => internalNodeIdsForSubflow.has(w.id))
                .map((w: any) => ({ 
                  id: w.id,
                  ...(w.port !== undefined && { port: w.port })
                }))
            : []
          return {
            ...outPort,
            wires: validWires.length > 0 ? validWires : []
          }
        }).filter((p: any) => p != null && p !== undefined)
      }
      
      // CRÍTICO: También agregar los nodos internos como nodos separados con z = subflowId
      // Esto es necesario para que Node-RED pueda encontrarlos en node_map cuando procesa el subflow
      if (internalNodes.length > 0) {
        internalNodes.forEach(internalNode => {
          // Crear una copia del nodo interno con z = subflowId para el array principal
          const internalNodeWithZ: NodeRedNode = {
            ...internalNode, // Preservar TODAS las propiedades (wires, func, outputs, etc.)
            z: subflowId, // CRÍTICO: Los nodos internos en el array principal DEBEN tener z = subflowId
            x: internalNode.x ?? 0, // Asegurar que tenga x
            y: internalNode.y ?? 0, // Asegurar que tenga y
          } as NodeRedNode
          
          internalNodesToAdd.push(internalNodeWithZ)
        })
      }
      
      finalNodes.push(subflow)
      processedSubflows.add(subflowId)
    } else {
      finalNodes.push(node)
    }
  })
  
  // Agregar subflows que no estaban en el canvas pero existen en allNodeRedNodes
  // IMPORTANTE: Los nodos internos de subflows (con z = subflowId) NO deben incluirse como nodos separados
  // Solo deben estar en subflow.flow
  if (allNodeRedNodes) {
    allNodeRedNodes.forEach(node => {
      if (node.type === 'subflow' && !processedSubflows.has(node.id)) {
        // Preservar el subflow original con sus nodos internos en subflow.flow
        // Asegurar que el subflow tenga la propiedad 'flow' con sus nodos internos
        const subflow = node as NodeRedSubflowDefinition
        if (!subflow.flow) {
          // Si el subflow no tiene 'flow', buscar nodos internos en allNodeRedNodes
          const internalNodes = allNodeRedNodes.filter(
            n => n.z === subflow.id && n.type !== 'subflow'
          )
          if (internalNodes.length > 0) {
            // Crear una copia del subflow con los nodos internos en 'flow'
            const subflowWithFlow: NodeRedSubflowDefinition = {
              ...subflow,
              flow: internalNodes.map(n => {
                // Los nodos internos NO deben tener z
                const { z, ...nodeWithoutZ } = n
                return nodeWithoutZ as NodeRedNode
              }),
            }
            finalNodes.push(subflowWithFlow)
          } else {
            finalNodes.push(subflow)
          }
        } else {
          finalNodes.push(subflow)
        }
      }
      // NO incluir nodos que tienen z = subflowId (son nodos internos)
      // Estos ya están en subflow.flow
    })
  }

  // CRÍTICO: Agregar nodos internos al array principal ANTES de las definiciones de subflow
  // El orden es importante: tabs → internalNodes → subflowDefinitions → otros nodos
  // Esto asegura que los nodos internos estén en node_map antes de que Node-RED procese el subflow
  const tabs = finalNodes.filter(n => n.type === 'tab')
  const subflowDefs = finalNodes.filter(n => n.type === 'subflow')
  const otherNodes = finalNodes.filter(n => n.type !== 'tab' && n.type !== 'subflow')
  
  // Orden final: tabs → internalNodes → subflowDefinitions → otros nodos
  const orderedFinalNodes = [...tabs, ...internalNodesToAdd, ...subflowDefs, ...otherNodes]
  
  mapperLogger('✅ Transformación a Node-RED completada:', {
    nodesCount: orderedFinalNodes.length,
    edgesCount: edges.length,
    subflowsProcessed: processedSubflows.size,
    subflowInternalNodes: Array.from(subflowInternalNodes.values()).reduce((sum, arr) => sum + arr.length, 0),
    internalNodesInArray: internalNodesToAdd.length,
  })

  // #region agent log
  // H1-H5: Verificar resultado final de la transformación
  const functionNodes = orderedFinalNodes.filter(n => n.type === 'function')
  const injectNodes = orderedFinalNodes.filter(n => n.type === 'inject')
  const nodesWithoutWires = orderedFinalNodes.filter(n => n.type !== 'tab' && n.type !== 'subflow' && n.type !== 'group' && !n.wires)
  fetch('http://127.0.0.1:7243/ingest/df038860-10fe-4679-936e-7d54adcd2561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mappers.ts:transformReactFlowToNodeRed:final',message:'Resultado final de transformación',data:{flowId,totalNodes:orderedFinalNodes.length,functionNodes:functionNodes.map(n=>({id:n.id,hasFunc:!!n.func,funcLength:n.func?.length||0,outputs:n.outputs,wires:n.wires})),injectNodes:injectNodes.map(n=>({id:n.id,hasProps:!!n.props,payloadType:n.payloadType,payload:typeof n.payload,wires:n.wires})),nodesWithoutWires:nodesWithoutWires.map(n=>({id:n.id,type:n.type})),subflowsProcessed:processedSubflows.size,internalNodesInArray:internalNodesToAdd.length},timestamp:Date.now(),sessionId:'debug-session',runId:'save-debug',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
  // #endregion

  return orderedFinalNodes
}
