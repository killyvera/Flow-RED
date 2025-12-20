/**
 * Funciones de mapeo de Node-RED a React Flow
 * 
 * Estas funciones transforman la estructura de datos de Node-RED
 * (nodos y wires) a la estructura de React Flow (nodes y edges).
 * 
 * IMPORTANTE: No mutamos los datos originales de Node-RED.
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow'
import type { NodeRedNode, NodeRedGroup } from '@/api/types'
import { mapperLogger } from '@/utils/logger'
import { getNodeType } from './nodes/nodeFactory'

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
 * @returns Nodo de React Flow
 */
export function mapNodeRedNodeToReactFlowNode(
  nodeRedNode: NodeRedNode
): ReactFlowNode {
  // Preservar el ID exactamente como viene de Node-RED
  const id = nodeRedNode.id

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
          type: 'arrowclosed',
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
  
  // Filtrar nodos que pertenecen a este flow
  // Excluimos el nodo "tab" mismo ya que no se renderiza
  const flowNodes = filterNodesByFlow(allNodes, flowId).filter(
    (node) => node.type !== 'tab'
  )
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
  const nodes = nonGroupNodes.map((nodeRedNode) => {
    const reactFlowNode = mapNodeRedNodeToReactFlowNode(nodeRedNode)
    
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
 * @returns Array de flows (nodos de tipo "tab")
 */
export function extractFlows(nodes: NodeRedNode[]): NodeRedNode[] {
  return nodes.filter((node) => node.type === 'tab')
}

/**
 * Merge profundo de objetos para preservar propiedades anidadas
 * 
 * Combina dos objetos preservando todas las propiedades del original,
 * pero sobrescribiendo con las del nuevo cuando sea necesario.
 * 
 * @param original Objeto original con todas las propiedades
 * @param updates Objeto con actualizaciones
 * @returns Objeto combinado
 */
function deepMerge<T extends Record<string, any>>(original: T, updates: Partial<T>): T {
  const result = { ...original }
  
  for (const key in updates) {
    if (updates.hasOwnProperty(key)) {
      const originalValue = original[key]
      const updateValue = updates[key]
      
      // Si ambos son objetos y no son arrays, hacer merge profundo
      if (
        originalValue &&
        typeof originalValue === 'object' &&
        !Array.isArray(originalValue) &&
        updateValue &&
        typeof updateValue === 'object' &&
        !Array.isArray(updateValue)
      ) {
        result[key] = deepMerge(originalValue, updateValue)
      } else {
        // Si el valor original existe y el update es undefined, preservar el original
        // Si el update tiene un valor, usarlo
        if (updateValue !== undefined) {
          result[key] = updateValue as T[Extract<keyof T, string>]
        }
      }
    }
  }
  
  return result
}

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
  flowId: string
): NodeRedNode[] {
  mapperLogger('🔄 Transformando React Flow a Node-RED para flow:', flowId)

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

  // Convertir cada nodo de React Flow a Node-RED
  const nodeRedNodes: NodeRedNode[] = nodes.map((node) => {
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
    
    const updates: Partial<NodeRedNode> = {
      id: node.id,
      type: node.data.nodeRedType || originalNodeRedNode.type || 'unknown',
      x: node.position.x,
      y: node.position.y,
      z: flowId,
      name: nodeName,
      wires: wires.length > 0 ? wires : undefined,
    }

    // Usar merge profundo para preservar TODAS las propiedades originales
    // Esto incluye propiedades desconocidas, anidadas, y cualquier metadata
    // que Node-RED pueda necesitar
    const nodeRedNode = deepMerge(originalNodeRedNode, updates) as NodeRedNode

    // Asegurar que las propiedades requeridas estén presentes
    // (el merge profundo ya las agregó, pero por seguridad)
    nodeRedNode.id = node.id
    nodeRedNode.type = node.data.nodeRedType || originalNodeRedNode.type || 'unknown'
    nodeRedNode.x = node.position.x
    nodeRedNode.y = node.position.y
    nodeRedNode.z = flowId
    // Usar nodeRedNode.name si está disponible (puede haber sido editado), sino usar label
    // El deepMerge ya aplicó el name desde updates, pero aseguramos que esté presente
    if (nodeName !== undefined) {
      nodeRedNode.name = nodeName
    }
    if (wires.length > 0) {
      nodeRedNode.wires = wires
    } else if (originalNodeRedNode.wires === undefined) {
      // Solo eliminar wires si originalmente no existían
      delete nodeRedNode.wires
    }


    return nodeRedNode
  })

  mapperLogger('✅ Transformación a Node-RED completada:', {
    nodesCount: nodeRedNodes.length,
    edgesCount: edges.length,
  })

  return nodeRedNodes
}
