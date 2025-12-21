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

  // Label: usar name si existe, sino usar type
  const label = nodeRedNode.name || nodeRedNode.type || 'node'

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
 *     - Crear edge con sourceHandle: `output-${i}` y targetHandle: "input"
 * 
 * @param sourceNodeId ID del nodo fuente (el que tiene los wires)
 * @param wires Array de arrays de IDs de nodos destino
 * @returns Array de edges de React Flow
 */
export function mapNodeRedWiresToReactFlowEdges(
  sourceNodeId: string,
  wires: string[][] | undefined
): ReactFlowEdge[] {
  if (!wires || wires.length === 0) {
    return []
  }

  const edges: ReactFlowEdge[] = []
  let edgeCounter = 0

  // Iterar sobre cada puerto de salida
  wires.forEach((targetIds, outputPortIndex) => {
    if (!targetIds || targetIds.length === 0) {
      return
    }

    // Para cada nodo destino en este puerto de salida
    targetIds.forEach((targetId) => {
      // Crear un edge único
      const edgeId = `${sourceNodeId}-${outputPortIndex}-${targetId}-${edgeCounter++}`

      const edge: ReactFlowEdge = {
        id: edgeId,
        source: sourceNodeId,
        target: targetId,
        // sourceHandle identifica el puerto de salida
        sourceHandle: `output-${outputPortIndex}`,
        // targetHandle identifica el puerto de entrada (por ahora asumimos "input")
        // En el futuro se puede mejorar para manejar múltiples puertos de entrada
        targetHandle: 'input',
        // Tipo de edge: usar smoothstep para curvas suaves estilo Flowise/n8n
        type: 'smoothstep',
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
  return nodes
    .filter((node): node is NodeRedGroup => node.type === 'group')
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
    flowNodes = subflowDefinition.flow || []
    // Los nodos internos de subflows no tienen z, así que no necesitamos filtrar por z
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
    tipos: [...new Set(flowNodes.map(n => n.type))]
  })

  // Extraer grupos del flow
  const groups = extractGroups(flowNodes)
  mapperLogger('📦 Grupos encontrados:', { count: groups.length })

  // Filtrar nodos que NO son grupos
  const nonGroupNodes = flowNodes.filter((node) => node.type !== 'group')
  
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
        group,
        nodesCount: nodesInGroup,
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
    const reactFlowNode = mapNodeRedNodeToReactFlowNode(nodeRedNode, subflowDefinitions)
    
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

  // Convertir todos los wires a edges
  const allEdges: ReactFlowEdge[] = []
  flowNodes.forEach((node) => {
    if (node.wires && node.wires.length > 0) {
      const edges = mapNodeRedWiresToReactFlowEdges(node.id, node.wires)
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
  const originalSubflows = new Map<string, NodeRedSubflowDefinition>()
  if (allNodeRedNodes) {
    allNodeRedNodes.forEach(node => {
      if (node.type === 'subflow') {
        originalSubflows.set(node.id, node as NodeRedSubflowDefinition)
      }
    })
  }

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

  nodes.forEach((node) => {
    const originalNodeRedNode = node.data.nodeRedNode || {}
    const nodeZ = originalNodeRedNode.z
    
    // Si el nodo pertenece a un subflow (z es un ID de subflow), es un nodo interno
    if (nodeZ && originalSubflows.has(nodeZ)) {
      if (!subflowInternalNodes.has(nodeZ)) {
        subflowInternalNodes.set(nodeZ, [])
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
          wires[i] = sourceEdges.get(i) || []
        }
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
        ...(wires.length > 0 && { wires }),
      }
      
      subflowInternalNodes.get(nodeZ)!.push(internalNode)
    } else {
      normalNodes.push(node)
    }
  })

  // Convertir cada nodo normal de React Flow a Node-RED
  const nodeRedNodes: NodeRedNode[] = normalNodes.map((node) => {
    // Si es un grupo, manejar de forma especial
    if (node.type === 'group' && node.data.group) {
      const group = node.data.group as NodeRedGroup
      
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
        wires[i] = sourceEdges.get(i) || []
      }
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
    // 
    // IMPORTANTE: No sobrescribir propiedades que no han cambiado
    // Solo sobrescribir las propiedades que React Flow gestiona (id, type, x, y, z, name, wires, links)
    const nodeRedNode: NodeRedNode = {
      // Primero, copiar TODAS las propiedades del nodo original
      ...originalNodeRedNode,
      
      // Luego, sobrescribir SOLO las propiedades que React Flow gestiona
      id: preservedId,
      type: node.data.nodeRedType || originalNodeRedNode.type || 'unknown',
      x: node.position.x,
      y: node.position.y,
      z: flowId, // CRÍTICO: El z debe ser el flowId actual, no el original
      
      // Propiedades que pueden haber cambiado (solo si tienen valor)
      // IMPORTANTE: Preservar name original si nodeName está vacío
      ...(nodeName !== undefined && nodeName !== '' ? { name: nodeName } : (originalNodeRedNode.name !== undefined ? { name: originalNodeRedNode.name } : {})),
      ...(wires.length > 0 && { wires }),
      ...(isLinkNode && preservedLinks !== undefined && { links: preservedLinks }),
    }
    
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
    
    // #region agent log - Verificar nodos inject transformados
    if (nodeRedNode.type === 'inject') {
      // Log detallado del nodo antes y después de transformar
      const originalProps = originalNodeRedNode.props ? JSON.stringify(originalNodeRedNode.props) : 'undefined'
      const transformedProps = nodeRedNode.props ? JSON.stringify(nodeRedNode.props) : 'undefined'
      const originalPayloadType = originalNodeRedNode.payloadType || 'undefined'
      const transformedPayloadType = nodeRedNode.payloadType || 'undefined'
      
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mappers.ts:transformReactFlowToNodeRed',message:'Nodo inject transformado - COMPARACIÓN DETALLADA',data:{
        nodeId:nodeRedNode.id,
        originalNode:{
          id:originalNodeRedNode.id,
          type:originalNodeRedNode.type,
          z:originalNodeRedNode.z,
          props:originalProps,
          payloadType:originalPayloadType,
          repeat:originalNodeRedNode.repeat,
          cron:originalNodeRedNode.cron,
          crontab:originalNodeRedNode.crontab,
          once:originalNodeRedNode.once,
          onceDelay:originalNodeRedNode.onceDelay,
          topic:originalNodeRedNode.topic,
          payload:originalNodeRedNode.payload,
          keys:Object.keys(originalNodeRedNode),
        },
        transformedNode:{
          id:nodeRedNode.id,
          type:nodeRedNode.type,
          z:nodeRedNode.z,
          props:transformedProps,
          payloadType:transformedPayloadType,
          repeat:nodeRedNode.repeat,
          cron:nodeRedNode.cron,
          crontab:nodeRedNode.crontab,
          once:nodeRedNode.once,
          onceDelay:nodeRedNode.onceDelay,
          topic:nodeRedNode.topic,
          payload:nodeRedNode.payload,
          keys:Object.keys(nodeRedNode),
        },
        propsChanged:originalProps!==transformedProps,
        payloadTypeChanged:originalPayloadType!==transformedPayloadType,
      },timestamp:Date.now(),sessionId:'debug-session',runId:'mapper-fix',hypothesisId:'H'})}).catch(()=>{});
    }
    // #endregion


    return nodeRedNode
  })


  // Procesar subflows: agregar nodos internos a la propiedad 'flow'
  const processedSubflows = new Set<string>()
  const finalNodes: NodeRedNode[] = []
  
  nodeRedNodes.forEach((node) => {
    // Si es un subflow, agregar sus nodos internos
    if (node.type === 'subflow') {
      const subflowId = node.id
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

  mapperLogger('✅ Transformación a Node-RED completada:', {
    nodesCount: finalNodes.length,
    edgesCount: edges.length,
    subflowsProcessed: processedSubflows.size,
    subflowInternalNodes: Array.from(subflowInternalNodes.values()).reduce((sum, arr) => sum + arr.length, 0),
  })

  return finalNodes
}
