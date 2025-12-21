/**
 * Página principal del canvas
 * 
 * Renderiza flows de Node-RED en un canvas de React Flow.
 * 
 * Características:
 * - Carga flows desde Node-RED automáticamente
 * - Renderiza nodos y edges en modo solo lectura
 * - Soporta múltiples flows (tabs) con selector
 * - Muestra estados de carga y errores
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import type { Node, MarkerType } from 'reactflow'
import ReactFlow, {
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'
import type { Edge } from 'reactflow'
import 'reactflow/dist/style.css'

import { ContextMenu } from '@/components/ContextMenu'
import { ExecutionLog } from '@/components/ExecutionLog'
import { ExecutionBar } from '@/components/ExecutionBar'
import { ExplainModeStepper } from '@/components/ExplainModeStepper'
import { PerfModeToggle } from '@/components/PerfModeToggle'
import { PerfReadout } from '@/components/PerfReadout'
import { getPerformanceMonitor } from '@/utils/performance'
import { HelpCircle } from 'lucide-react'

import { DottedGridBackground } from '@/components/DottedGridBackground'
import { useTheme } from '@/context/ThemeContext'

import { useCanvasStore } from '@/state/canvasStore'
import { useNodeRedFlow } from '@/canvas/useNodeRedFlow'
import { useNodeRedWebSocket } from '@/hooks/useNodeRedWebSocket'
import { BaseNode } from '@/canvas/nodes/BaseNode'
import { modernEdgeTypes } from '@/canvas/edges.tsx'
import { applyModernEdgeStyles } from '@/canvas/edges.tsx'
import { NodePalette } from '@/components/NodePalette'
import { NodePropertiesPanel } from '@/components/NodePropertiesPanel'
import { GroupPropertiesPanel } from '@/components/GroupPropertiesPanel'
import { GroupSelector } from '@/components/GroupSelector'
import { useKeyboardShortcuts } from '@/utils/keyboardShortcuts'
import { pasteFromClipboard, copyToClipboard } from '@/utils/clipboard'
import { validateConnectionComplete } from '@/utils/connectionValidator'
import { getNodeType } from '@/canvas/nodes/nodeFactory'
import { saveFlow, type SaveFlowError } from '@/api/client'
import { transformReactFlowToNodeRed } from '@/canvas/mappers'
import type { NodeRedGroup } from '@/api/types'

// Registrar los tipos de nodos personalizados
import { InjectNode } from '@/canvas/nodes/InjectNode'
import { DebugNode } from '@/canvas/nodes/DebugNode'
import { GroupNode } from '@/canvas/nodes/GroupNode'

// Definir tipos de nodos fuera del componente para referencia
const baseNodeTypes = {
  baseNode: BaseNode,
  inject: InjectNode,
  debug: DebugNode,
  group: GroupNode,
}

/**
 * Configuración del canvas de React Flow
 */
const canvasConfig = {
  minZoom: 0.1,
  maxZoom: 2,
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  // Estilos del canvas
  style: {
    backgroundColor: 'var(--color-canvas-bg)',
  },
  // Configuración dinámica según modo edición (se sobrescribe en el componente)
  // Por defecto: solo lectura
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: true, // Permitir selección siempre
  // Configuración de zoom y pan suaves
  panOnDrag: true, // Permitir pan con botón izquierdo (cuando no se arrastra un nodo)
  panOnScroll: false, // Deshabilitar pan con scroll (usar zoom en su lugar)
  zoomOnScroll: true,
  zoomOnPinch: true,
  zoomOnDoubleClick: false,
  preventScrolling: false, // Permitir scroll normal de la página
  // Configuración de edges
  defaultEdgeOptions: {
    type: 'smoothstep', // Curvas suaves por defecto
    animated: false, // Deshabilitar animación para mejor rendimiento en tiempo real
    style: {
      strokeWidth: 2,
      stroke: 'var(--color-edge-default)',
    },
    markerEnd: {
      type: 'arrowclosed' as MarkerType,
      color: 'var(--color-edge-default)',
    },
  },
  // Optimizaciones para actualización en tiempo real durante el arrastre
  elevateNodesOnSelect: false, // No elevar nodos al seleccionar (evita delays visuales)
  elevateEdgesOnSelect: false, // No elevar edges al seleccionar
  // Asegurar que los nodos se actualicen en tiempo real durante el arrastre
  nodeOrigin: [0.5, 0.5] as [number, number], // Origen del nodo en el centro (por defecto)
  // Deshabilitar animaciones durante el arrastre para mejor rendimiento
  disableKeyboardA11y: false, // Mantener accesibilidad
  // Asegurar que los nodos se actualicen inmediatamente sin delay
  fitViewOptions: {
    padding: 0.1,
    includeHiddenNodes: false,
    maxZoom: 1.5,
    minZoom: 0.5,
  },
}

export function CanvasPage() {
  // Obtener tema actual
  const { isDarkMode } = useTheme()

  // Memoizar nodeTypes y edgeTypes para evitar recreaciones en cada render
  // Esto es necesario para evitar warnings de React Flow
  const nodeTypes = useMemo(() => baseNodeTypes, [])
  const edgeTypes = useMemo(() => modernEdgeTypes, [])

  // Cargar flows de Node-RED automáticamente
  const {
    flows,
    activeFlowId,
    isLoading,
    error,
    switchFlow,
    loadFlows,
    renderFlow,
  } = useNodeRedFlow(true)

  // Conectar a WebSocket para recibir eventos de runtime
  // Inicializar conexión WebSocket para estados de runtime
  // console.log('🎬 [CanvasPage] Inicializando WebSocket...')
  const wsConnection = useNodeRedWebSocket(true)
  // console.log('🔌 [CanvasPage] Estado de conexión WebSocket:', {
  //   connected: wsConnection.connected,
  //   connectionState: wsConnection.connectionState
  // })
  
  // #region agent log
  // Log cuando cambian los flows para debug
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:flowsEffect',message:'Flows actualizados en el componente',data:{flowsCount:flows.length,flowIds:flows.map(f=>f.id),activeFlowId,isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }, [flows, activeFlowId, isLoading])
  // #endregion

  // Obtener nodos, edges y grupos del store usando selectores específicos para mejor rendimiento
  const storeNodes = useCanvasStore((state) => state.nodes)
  const storeEdges = useCanvasStore((state) => state.edges)
  const storeGroups = useCanvasStore((state) => state.groups)
  const isEditMode = useCanvasStore((state) => state.isEditMode)
  const setNodes = useCanvasStore((state) => state.setNodes)
  const setEdges = useCanvasStore((state) => state.setEdges)
  const setGroups = useCanvasStore((state) => state.setGroups)
  const collapsedGroupIds = useCanvasStore((state) => state.collapsedGroupIds)
  const setCollapsedGroupIds = useCanvasStore((state) => state.setCollapsedGroupIds)
  const explainMode = useCanvasStore((state) => state.explainMode)
  const toggleExplainMode = useCanvasStore((state) => state.toggleExplainMode)
  const perfMode = useCanvasStore((state) => state.perfMode)

  // Cargar estado de grupos colapsados desde localStorage inicialmente
  const hasInitializedCollapsedRef = React.useRef(false)
  useEffect(() => {
    if (storeGroups.length > 0 && !hasInitializedCollapsedRef.current) {
      const collapsed = new Set<string>()
      storeGroups.forEach((group) => {
        try {
          const isCollapsed = localStorage.getItem(`node-red-editor:group-collapsed:${group.id}`) === 'true'
          if (isCollapsed) {
            collapsed.add(group.id)
          }
        } catch (e) {}
      })
      
      if (collapsed.size > 0) {
        setCollapsedGroupIds(collapsed)
      }
      hasInitializedCollapsedRef.current = true
    }
  }, [storeGroups, setCollapsedGroupIds])

  // Estado para guardado
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  // Estado para rastrear cambios no guardados
  const [savedNodes, setSavedNodes] = React.useState<Node[]>([])
  const [savedEdges, setSavedEdges] = React.useState<Edge[]>([])

  // Estado para paleta de nodos
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false)
  const [isExecutionLogOpen, setIsExecutionLogOpen] = React.useState(false)
  // Estado para conexión automática desde handle
  const [pendingConnection, setPendingConnection] = React.useState<{
    sourceNodeId: string
    sourceHandleId: string
    position: { x: number; y: number }
  } | null>(null)
  
  // Estado para panel de propiedades
  const [isPropertiesOpen, setIsPropertiesOpen] = React.useState(false)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)

  // Estado para menú contextual
  const [contextMenu, setContextMenu] = React.useState<{
    position: { x: number; y: number }
    node: Node | null
  } | null>(null)

  // Estado para clipboard
  const [hasClipboard, setHasClipboard] = React.useState(false)

  // Estado para selector de grupo
  const [groupSelector, setGroupSelector] = React.useState<{
    isOpen: boolean
    nodeId: string | null
    position?: { x: number; y: number }
  }>({
    isOpen: false,
    nodeId: null,
  })


  // Estados locales de React Flow para manejar cambios en tiempo real
  const [nodes, setNodesLocal, onNodesChange] = useNodesState(storeNodes)
  const [edges, setEdgesLocal, onEdgesChange] = useEdgesState(applyModernEdgeStyles(storeEdges))
  
  // Ref para almacenar los nodos actualizados y actualizar el store después del render
  const pendingStoreUpdateRef = React.useRef<{ nodes: Node[] | null; edges: Edge[] | null }>({ nodes: null, edges: null })
  
  // Performance monitor (solo en dev mode)
  const perfMonitorRef = React.useRef(import.meta.env.DEV ? getPerformanceMonitor() : null)
  
  // Efecto para aplicar actualizaciones pendientes al store después del render
  // Usar useLayoutEffect para ejecutar antes del paint, pero después del render
  React.useLayoutEffect(() => {
    // Medir tiempo de render (solo en dev mode)
    if (perfMonitorRef.current) {
      perfMonitorRef.current.startRender()
    }
    if (pendingStoreUpdateRef.current.nodes) {
      const nodesToUpdate = pendingStoreUpdateRef.current.nodes
      pendingStoreUpdateRef.current.nodes = null
      // Usar setTimeout para asegurar que se ejecute después del render completo
      setTimeout(() => {
        setNodes(nodesToUpdate)
      }, 0)
    }
    if (pendingStoreUpdateRef.current.edges) {
      const edgesToUpdate = pendingStoreUpdateRef.current.edges
      pendingStoreUpdateRef.current.edges = null
      setTimeout(() => {
        setEdges(edgesToUpdate)
      }, 0)
    }
  })
  
  // Referencia para React Flow instance (se inicializará dentro del componente)
  const reactFlowInstanceRef = React.useRef<any>(null)
  
  // Ref para rastrear si estamos en el proceso de renderizado inicial
  const isInitialRenderRef = React.useRef(true)
  
  // Marcar que el renderizado inicial ha terminado
  useEffect(() => {
    isInitialRenderRef.current = false
  }, [])

  // Nodos y edges seleccionados (memoizados para evitar loops de efectos)
  const selectedNodes = React.useMemo(() => nodes.filter(n => n.selected), [nodes])
  const selectedEdges = React.useMemo(() => edges.filter(e => e.selected), [edges])

  // Sincronizar selectedNode con el nodo actualmente seleccionado
  const prevSelectedNodeIdRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (selectedNodes.length > 0) {
      const firstSelected = selectedNodes[0]
      const currentSelectedId = firstSelected.id
      
      // Solo actualizar si es un nodo diferente
      if (prevSelectedNodeIdRef.current !== currentSelectedId) {
        prevSelectedNodeIdRef.current = currentSelectedId
        setSelectedNode(firstSelected)
        // El panel solo se abre con doble clic, no automáticamente
      } else {
        // Es el mismo nodo, actualizar solo si los datos básicos han cambiado
        // Evitar bucle infinito no comparando todo el objeto data
        if (selectedNode && (
          selectedNode.data.label !== firstSelected.data.label ||
          selectedNode.data.nodeRedType !== firstSelected.data.nodeRedType
        )) {
          setSelectedNode(firstSelected)
        }
      }
    } else if (selectedNodes.length === 0) {
      if (prevSelectedNodeIdRef.current !== null) {
        prevSelectedNodeIdRef.current = null
        // Si no hay nodos seleccionados pero selectedNode está establecido, limpiarlo
        // Solo si el panel está cerrado (para no cerrarlo automáticamente)
        if (!isPropertiesOpen) {
          setSelectedNode(null)
        }
      }
    }
  }, [selectedNodes, isEditMode, isPropertiesOpen, selectedNode])

  // Sincronizar nodos del store con estado local cuando cambian
  // IMPORTANTE: Evitar loops ignorando cambios que solo afectan a los handlers inyectados
  useEffect(() => {
    setNodesLocal(prevNodes => {
      // Si el número de nodos es diferente, actualizar
      if (prevNodes.length !== storeNodes.length) return storeNodes
      
      // Verificar si hay cambios reales en los datos de los nodos
      const hasRealChanges = storeNodes.some((storeNode, i) => {
        const prevNode = prevNodes[i]
        if (!prevNode || prevNode.id !== storeNode.id) return true
        
        // Comparar posición y datos básicos
        if (prevNode.position.x !== storeNode.position.x || prevNode.position.y !== storeNode.position.y) return true
        
        // Comparar data (ignorando onResize y resizable que son inyectados)
        const { onResize: _p, resizable: _r, ...prevData } = prevNode.data
        const { onResize: _sp, resizable: _sr, ...storeData } = storeNode.data
        
        return JSON.stringify(prevData) !== JSON.stringify(storeData)
      })
      
      return hasRealChanges ? storeNodes : prevNodes
    })
  }, [storeNodes, setNodesLocal])

  // Sincronizar edges del store con estado local cuando cambian
  useEffect(() => {
    const styledEdges = applyModernEdgeStyles(storeEdges)
    setEdgesLocal(prevEdges => {
      if (prevEdges.length !== styledEdges.length) return styledEdges
      
      const hasChanges = styledEdges.some((edge, i) => {
        const prevEdge = prevEdges[i]
        return !prevEdge || 
               prevEdge.id !== edge.id || 
               prevEdge.source !== edge.source || 
               prevEdge.target !== edge.target ||
               JSON.stringify(prevEdge.style) !== JSON.stringify(edge.style)
      })
      
      return hasChanges ? styledEdges : prevEdges
    })
  }, [storeEdges, setEdgesLocal])

  // Guardar estado inicial cuando cambia el flow activo o se cargan nuevos nodos
  const prevActiveFlowIdRef = React.useRef<string | null>(null)
  useEffect(() => {
    // Solo actualizar cuando cambia el flow activo o cuando se cargan nodos por primera vez
    if (activeFlowId && storeNodes.length > 0) {
      // Si cambió el flow activo o es la primera carga
      if (prevActiveFlowIdRef.current !== activeFlowId) {
        setSavedNodes(JSON.parse(JSON.stringify(storeNodes))) // Deep copy
        setSavedEdges(JSON.parse(JSON.stringify(storeEdges))) // Deep copy
        prevActiveFlowIdRef.current = activeFlowId
      }
    }
  }, [activeFlowId, storeNodes, storeEdges]) // Depender de storeNodes/storeEdges para detectar cuando se cargan

  // Sincronizar cambios locales con el store cuando se mueven nodos o se crean conexiones
  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    // Aplicar cambios inmediatamente para que los edges se actualicen en tiempo real
    onNodesChange(changes)
    
    // Verificar si hay cambios persistentes antes de actualizar
    const hasPersistentChanges = isEditMode && !isInitialRenderRef.current && 
      changes.some(c => c.type === 'position' || c.type === 'remove' || c.type === 'add')
    
    // Aplicar cambios localmente
    setNodesLocal((prevNodes) => {
      const updatedNodes = applyNodeChanges(changes, prevNodes)
      
      // Guardar en ref para actualizar el store después del render
      if (hasPersistentChanges) {
        pendingStoreUpdateRef.current.nodes = updatedNodes
      }
      
      return updatedNodes
    })
  }, [isEditMode, setNodes, onNodesChange, setNodesLocal])

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    setEdgesLocal((prevEdges) => {
      const updatedEdges = applyEdgeChanges(changes, prevEdges)
      // Actualizar store solo en modo edición y cambios persistentes
      // Guardar en ref para actualizar después del render
      if (isEditMode && !isInitialRenderRef.current) {
        const hasPersistentChanges = changes.some(c => c.type === 'remove' || c.type === 'add')
        if (hasPersistentChanges) {
          pendingStoreUpdateRef.current.edges = updatedEdges
        }
      }
      return updatedEdges
    })
  }, [isEditMode, setEdges, onEdgesChange, setEdgesLocal])

  // Manejar creación de conexiones
  const onConnect = useCallback((connection: Connection) => {
    if (!isEditMode) return // No permitir conexiones en modo lectura
    
    // Validar la conexión antes de crearla
    const validation = validateConnectionComplete(connection, nodes, edges, false)
    if (!validation.isValid) {
      // Mostrar error al usuario
      console.warn('Conexión inválida:', validation.error)
      // Opcional: mostrar notificación al usuario
      if (validation.error) {
        alert(`No se puede crear la conexión: ${validation.error}`)
      }
      return
    }
    
    const newEdge = {
      ...connection,
      id: `${connection.source}-${connection.sourceHandle || '0'}-${connection.target}-${connection.targetHandle || 'input'}`,
      type: 'smoothstep',
      style: {
        strokeWidth: 2,
        stroke: 'var(--color-edge-default)',
      },
      markerEnd: {
        type: 'arrowclosed',
        color: 'var(--color-edge-default)',
      },
    }
    
    const updatedEdges = addEdge(newEdge, edges)
    setEdgesLocal(updatedEdges)
    setEdges(updatedEdges)
  }, [isEditMode, nodes, edges, setEdgesLocal, setEdges])

  // Manejar eliminación con tecla Delete
  useEffect(() => {
    if (!isEditMode) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si se está escribiendo en un input/textarea o campo editable
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (target.tagName === 'SELECT' && target === document.activeElement)
      ) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(node => node.selected)
        const selectedEdges = edges.filter(edge => edge.selected)
        
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault()
          
          // Confirmar eliminación
          if (window.confirm(`¿Eliminar ${selectedNodes.length} nodo(s) y ${selectedEdges.length} conexión(es)?`)) {
            // Eliminar nodos seleccionados
            const nodeIdsToDelete = new Set(selectedNodes.map(n => n.id))
            const updatedNodes = nodes.filter(node => !node.selected)
            setNodesLocal(updatedNodes)
            setNodes(updatedNodes)
            
            // Eliminar edges seleccionados y edges conectados a nodos eliminados
            const updatedEdges = edges.filter(edge => 
              !edge.selected && 
              !nodeIdsToDelete.has(edge.source) && 
              !nodeIdsToDelete.has(edge.target)
            )
            setEdgesLocal(updatedEdges)
            setEdges(updatedEdges)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, nodes, edges, setNodesLocal, setEdgesLocal, setNodes, setEdges])

  // Función para guardar el flow
  const handleSave = useCallback(async () => {
    if (!activeFlowId || !isEditMode) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // #region agent log
      const allNodeRedNodes = useCanvasStore.getState().nodeRedNodes
      const allFlowsFromStore = allNodeRedNodes.filter(n => n.type === 'tab')
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Iniciando guardado',data:{activeFlowId,flowsCount:allFlowsFromStore.length,flowIds:allFlowsFromStore.map(f=>f.id),nodesCount:nodes.length,edgesCount:edges.length,storeGroupsCount:storeGroups.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Transformar nodos y edges a formato Node-RED
      console.log('[handleSave] Antes de transformar:', {
        activeFlowId,
        nodesCount: nodes.length,
        edgesCount: edges.length,
        nodesWithParentId: nodes.filter(n => n.parentId).map(n => ({ id: n.id, parentId: n.parentId, position: n.position })),
        groupNodes: nodes.filter(n => n.type === 'group').map(n => ({ id: n.id, position: n.position })),
      })
      const nodeRedNodes = transformReactFlowToNodeRed(nodes, edges, activeFlowId)
      console.log('[handleSave] Después de transformar:', {
        transformedCount: nodeRedNodes.length,
        nodesWithG: nodeRedNodes.filter(n => n.g).map(n => ({ id: n.id, g: n.g, x: n.x, y: n.y })),
        groupNodes: nodeRedNodes.filter(n => n.type === 'group').map(n => ({ id: n.id, x: n.x, y: n.y })),
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Nodos transformados',data:{activeFlowId,transformedNodesCount:nodeRedNodes.length,transformedNodeIds:nodeRedNodes.map(n=>n.id),transformedNodeTypes:nodeRedNodes.map(n=>n.type)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Obtener todos los flows (tabs) del store para preservarlos
      // CRÍTICO: Node-RED reemplaza TODOS los flows cuando se guarda, así que debemos incluir todos los tabs
      // Asegurar que los tabs tengan x e y (requeridos por la validación, aunque los tabs no los usen)
      const allFlows = allNodeRedNodes
        .filter(n => n.type === 'tab')
        .map(flow => ({
          ...flow,
          // Los tabs necesitan x e y para pasar la validación, aunque no los usen
          // Manejar undefined, null y NaN
          x: (typeof flow.x === 'number' && !isNaN(flow.x)) ? flow.x : 0,
          y: (typeof flow.y === 'number' && !isNaN(flow.y)) ? flow.y : 0,
        }))
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Flows obtenidos del store',data:{allFlowsCount:allFlows.length,allFlowIds:allFlows.map(f=>f.id),activeFlowInList:allFlows.some(f=>f.id===activeFlowId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // CRÍTICO: Preservar TODOS los nodos de otros flows (no solo grupos)
      // Node-RED reemplaza TODOS los flows cuando se guarda, así que debemos incluir
      // todos los nodos de todos los flows para no perderlos
      const nodesFromOtherFlows = allNodeRedNodes.filter(
        n => n.z !== activeFlowId && n.type !== 'tab'
      )
      
      // #region agent log
      const groupsInTransformed = nodeRedNodes.filter(n => n.type === 'group').map(n => n.id)
      const nodesFromOtherFlowsByType = nodesFromOtherFlows.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('[handleSave] Nodos de otros flows a preservar:', {
        count: nodesFromOtherFlows.length,
        byType: nodesFromOtherFlowsByType,
        sample: nodesFromOtherFlows.slice(0, 3).map(n => ({ id: n.id, type: n.type, z: n.z })),
      })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Nodos de otros flows identificados',data:{activeFlowId,groupsInTransformed:groupsInTransformed.length,groupsInTransformedIds:groupsInTransformed,nodesFromOtherFlowsCount:nodesFromOtherFlows.length,nodesFromOtherFlowsByType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Construir el payload final:
      // 1. Todos los flows (tabs) para preservarlos
      // 2. Nodos transformados del flow activo (incluye grupos del flow activo)
      // 3. TODOS los nodos de otros flows para preservarlos (grupos y nodos normales)
      const allNodesToSave = [...allFlows, ...nodeRedNodes, ...nodesFromOtherFlows]
      
      console.log('[handleSave] Payload final:', {
        totalNodes: allNodesToSave.length,
        flows: allNodesToSave.filter(n => n.type === 'tab').length,
        activeFlowNodes: nodeRedNodes.length,
        otherFlowNodes: nodesFromOtherFlows.length,
        byType: allNodesToSave.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      })
      
      // #region agent log
      const allGroupIds = allNodesToSave.filter(n => n.type === 'group').map(n => n.id)
      const duplicateGroupIds = allGroupIds.filter((id, index) => allGroupIds.indexOf(id) !== index)
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Payload final preparado',data:{activeFlowId,totalNodesToSave:allNodesToSave.length,flowsInPayload:allNodesToSave.filter(n=>n.type==='tab').length,flowIdsInPayload:allNodesToSave.filter(n=>n.type==='tab').map(n=>n.id),groupsInPayload:allGroupIds.length,groupIds:allGroupIds,duplicateGroupIds:duplicateGroupIds,hasDuplicates:duplicateGroupIds.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Validar que no haya IDs duplicados antes de enviar
      if (duplicateGroupIds.length > 0) {
        const errorMessage = `IDs duplicados detectados antes de guardar: ${duplicateGroupIds.join(', ')}`
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Error: IDs duplicados detectados',data:{activeFlowId,duplicateGroupIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw new Error(errorMessage)
      }
      
      // Guardar usando la API (la validación se hace dentro de saveFlow)
      console.log('[handleSave] Guardando flow en Node-RED...')
      await saveFlow(activeFlowId, allNodesToSave)
      console.log('[handleSave] ✅ Flow guardado exitosamente')
      
      // #region agent log
      const flowsAfterSave = useCanvasStore.getState().flows
      fetch('http://127.0.0.1:7242/ingest/ae5fc8cc-311f-43dc-9442-4e2184e25420',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasPage.tsx:handleSave',message:'Guardado exitoso',data:{activeFlowId,flowsAfterSaveCount:flowsAfterSave.length,flowIdsAfterSave:flowsAfterSave.map(f=>f.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // CRÍTICO: Actualizar el store con los nodos y edges actuales (que acabamos de guardar)
      // No recargar desde Node-RED porque acabamos de guardar, el estado local es el correcto
      // Solo actualizamos el store para sincronizar con otros componentes
      console.log('[handleSave] Actualizando store con nodos y edges guardados...')
      setNodes(nodes)
      setEdges(edges)
      
      // Actualizar estado guardado después de guardar exitosamente
      // Usar los nodos y edges actuales del estado local (que acabamos de guardar)
      setSavedNodes(JSON.parse(JSON.stringify(nodes))) // Deep copy
      setSavedEdges(JSON.parse(JSON.stringify(edges))) // Deep copy
      
      console.log('[handleSave] ✅ Store actualizado con estado guardado')
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000) // Ocultar mensaje después de 3 segundos
    } catch (err) {
      // Manejar errores específicos de SaveFlowError
      if (err && typeof err === 'object' && 'code' in err) {
        const saveError = err as SaveFlowError
        
        if (saveError.code === 'VALIDATION_ERROR') {
          // Error de validación: mostrar errores de validación
          const errorDetails = saveError.validationErrors?.join('\n') || saveError.message
          setSaveError(`Validación fallida:\n${errorDetails}`)
        } else if (saveError.code === 'SAVE_ERROR') {
          // Error de guardado: mostrar mensaje descriptivo
          let errorMessage = saveError.message
          
          // Agregar detalles adicionales si están disponibles
          if (saveError.httpStatus) {
            errorMessage += ` (HTTP ${saveError.httpStatus})`
          }
          
          if (saveError.validationWarnings && saveError.validationWarnings.length > 0) {
            errorMessage += `\nAdvertencias: ${saveError.validationWarnings.join(', ')}`
          }
          
          setSaveError(errorMessage)
        } else {
          setSaveError(saveError.message || 'Error al guardar flow')
        }
      } else {
        // Error genérico
        const errorMessage = err instanceof Error ? err.message : 'Error al guardar flow'
        setSaveError(errorMessage)
      }
      
      console.error('Error saving flow:', err)
    } finally {
      setIsSaving(false)
    }
  }, [activeFlowId, isEditMode, nodes, edges, loadFlows, renderFlow])

  // Manejar drag & drop desde la paleta
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    
    if (!isEditMode || !activeFlowId) {
      return
    }

    const nodeType = event.dataTransfer.getData('application/reactflow')
    
    
    if (!nodeType) {
      return
    }

    // Obtener posición del drop usando screenToFlowPosition
    let position = { x: 0, y: 0 }
    if (reactFlowInstanceRef.current) {
      try {
        position = reactFlowInstanceRef.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
      } catch (e) {
        console.debug('Error al convertir posición:', e)
        // Fallback a coordenadas relativas
        const target = event.currentTarget as HTMLElement
        const rect = target.getBoundingClientRect()
        position = {
          x: event.clientX - rect.left - 100,
          y: event.clientY - rect.top - 50,
        }
      }
    } else {
      // Fallback si no hay instancia de React Flow
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      position = {
        x: event.clientX - rect.left - 100,
        y: event.clientY - rect.top - 50,
      }
    }

    // Si es un grupo, crear nodo React Flow de tipo 'group'
    if (nodeType === 'group') {
      const groupId = `group-${Date.now()}`
      const newGroupNode: Node = {
        id: groupId,
        type: 'group',
        position,
        data: {
          group: {
            id: groupId,
            type: 'group',
            name: 'Nuevo Grupo',
            x: position.x,
            y: position.y,
            w: 400,
            h: 300,
            z: activeFlowId,
          } as NodeRedGroup,
          nodesCount: 0,
        },
        style: {
          width: 400,
          height: 300,
        },
      }


      const updatedNodes = [...nodes, newGroupNode]
      setNodesLocal(updatedNodes)
      setNodes(updatedNodes)
      
      
      return
    }

    // Para otros tipos de nodos, crear normalmente
    const newNodeId = `${nodeType}-${Date.now()}`
    const newNodeType = getNodeType(nodeType)
    const newNode: Node = {
      id: newNodeId,
      type: newNodeType,
      position,
      data: {
        label: nodeType,
        nodeRedType: nodeType,
        flowId: activeFlowId,
        outputPortsCount: 1,
        nodeRedNode: {
          id: newNodeId,
          type: nodeType,
          name: nodeType,
          z: activeFlowId,
        },
      },
    }


    const updatedNodes = [...nodes, newNode]
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)
    
  }, [isEditMode, activeFlowId, nodes, setNodesLocal, setNodes, reactFlowInstanceRef])

  // Función para organizar nodos de manera compacta (Tidy up)
  const handleTidyUp = useCallback(() => {
    if (!nodes.length || !reactFlowInstanceRef.current) return

    // Constantes de espaciado (mitad de la distancia anterior)
    const HORIZONTAL_SPACING = 270 // Espacio horizontal entre niveles (mitad de 540)
    const VERTICAL_SPACING = 180 // Espacio vertical entre nodos del mismo nivel (mitad de 360)
    const START_X = 50 // Posición X inicial
    const START_Y = 50 // Posición Y inicial

    // Crear mapas para acceso rápido
    const edgesBySource = new Map<string, Edge[]>()
    const edgesByTarget = new Map<string, Edge[]>()
    
    edges.forEach(edge => {
      if (!edgesBySource.has(edge.source)) {
        edgesBySource.set(edge.source, [])
      }
      edgesBySource.get(edge.source)!.push(edge)
      
      if (!edgesByTarget.has(edge.target)) {
        edgesByTarget.set(edge.target, [])
      }
      edgesByTarget.get(edge.target)!.push(edge)
    })

    // Identificar nodos fuente (sin conexiones de entrada)
    const sourceNodes = nodes.filter(node => {
      const incomingEdges = edgesByTarget.get(node.id) || []
      return incomingEdges.length === 0
    })

    if (sourceNodes.length === 0) {
      // Si no hay nodos fuente, usar todos los nodos
      sourceNodes.push(...nodes)
    }

    // Asignar niveles usando BFS
    const nodeLevels = new Map<string, number>()
    const visited = new Set<string>()
    const queue: Array<{ id: string; level: number }> = []

    // Inicializar cola con nodos fuente
    sourceNodes.forEach(node => {
      nodeLevels.set(node.id, 0)
      visited.add(node.id)
      queue.push({ id: node.id, level: 0 })
    })

    // BFS para asignar niveles
    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      const outgoingEdges = edgesBySource.get(id) || []
      
      outgoingEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          const nextLevel = level + 1
          nodeLevels.set(edge.target, nextLevel)
          visited.add(edge.target)
          queue.push({ id: edge.target, level: nextLevel })
        }
      })
    }

    // Asignar nivel 0 a nodos no visitados (nodos aislados)
    nodes.forEach(node => {
      if (!nodeLevels.has(node.id)) {
        nodeLevels.set(node.id, 0)
      }
    })

    // Agrupar nodos por nivel
    const nodesByLevel = new Map<number, Node[]>()
    nodes.forEach(node => {
      const level = nodeLevels.get(node.id) || 0
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    // Calcular posiciones
    const updatedNodes = nodes.map(node => {
      const level = nodeLevels.get(node.id) || 0
      const nodesInLevel = nodesByLevel.get(level) || []
      const indexInLevel = nodesInLevel.findIndex(n => n.id === node.id)
      
      const x = START_X + (level * HORIZONTAL_SPACING)
      const y = START_Y + (indexInLevel * VERTICAL_SPACING)
      
      return {
        ...node,
        position: { x, y },
      }
    })

    // Actualizar nodos
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)

    // Ajustar vista inmediatamente (React Flow 12.5.0+ soporta fitView inmediatamente después de cambios)
    if (reactFlowInstanceRef.current) {
      // Usar requestAnimationFrame para asegurar que los nodos se hayan renderizado
      requestAnimationFrame(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({ 
            padding: 0.2, 
            duration: 300,
            includeHiddenNodes: false,
            maxZoom: 1.5,
            minZoom: 0.1
          })
        }
      })
    }
  }, [nodes, edges, setNodesLocal, setNodes, reactFlowInstanceRef])

  // Inyectar botón Tidy Up dentro del panel de controles
  useEffect(() => {
    const injectTidyUpButton = () => {
      const controlsPanel = document.querySelector('.react-flow__controls.react-flow__controls-minimal')
      if (controlsPanel && !controlsPanel.querySelector('.react-flow__tidy-up-button')) {
        // Crear botón (solo icono, sin texto, sin separador)
        const button = document.createElement('button')
        button.className = 'react-flow__tidy-up-button'
        button.title = 'Tidy up - Organizar nodos de manera compacta'
        // Establecer color inline para asegurar que se aplique correctamente (blanco en dark, negro en light)
        button.style.setProperty('color', 'var(--color-text-primary)', 'important')
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: inherit;">
            <rect width="7" height="7" x="3" y="3" rx="1"/>
            <rect width="7" height="7" x="14" y="3" rx="1"/>
            <rect width="7" height="7" x="14" y="14" rx="1"/>
            <rect width="7" height="7" x="3" y="14" rx="1"/>
          </svg>
        `
        button.addEventListener('click', handleTidyUp)
        
        // Agregar botón al panel de controles (sin separador)
        controlsPanel.appendChild(button)
      }
    }

    // Intentar inyectar inmediatamente
    injectTidyUpButton()

    // También intentar después de un pequeño delay por si el panel aún no está renderizado
    const timeout = setTimeout(injectTidyUpButton, 100)

    return () => {
      clearTimeout(timeout)
      // Limpiar al desmontar
      const controlsPanel = document.querySelector('.react-flow__controls.react-flow__controls-minimal')
      if (controlsPanel) {
        const button = controlsPanel.querySelector('.react-flow__tidy-up-button')
        if (button) button.remove()
      }
    }
  }, [handleTidyUp])

  // Función para crear nodo desde handle con doble clic
  const handleCreateNodeFromHandle = useCallback((nodeType: string, connection: { sourceNodeId: string; sourceHandleId: string; position: { x: number; y: number } }) => {
    if (!activeFlowId || !reactFlowInstanceRef.current) return

    // Convertir posición de pantalla a posición del flow
    let position = { x: 0, y: 0 }
    try {
      position = reactFlowInstanceRef.current.screenToFlowPosition({
        x: connection.position.x,
        y: connection.position.y,
      })
      // Offset para que el nodo aparezca a la derecha del handle
      position.x += 150
    } catch (e) {
      console.debug('Error al convertir posición:', e)
      position = { x: 200, y: 100 }
    }

    // Crear el nuevo nodo
    const newNodeId = `${nodeType}-${Date.now()}`
    const newNodeType = getNodeType(nodeType)
    const newNode: Node = {
      id: newNodeId,
      type: newNodeType,
      position,
      data: {
        label: nodeType,
        nodeRedType: nodeType,
        flowId: activeFlowId,
        outputPortsCount: 1,
        nodeRedNode: {
          id: newNodeId,
          type: nodeType,
          name: nodeType,
          z: activeFlowId,
        },
      },
    }

    // Agregar el nodo
    const updatedNodes = [...nodes, newNode]
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)

    // Crear la conexión automáticamente
    const newEdge: Edge = {
      id: `${connection.sourceNodeId}-${connection.sourceHandleId}-${newNodeId}-input`,
      source: connection.sourceNodeId,
      sourceHandle: connection.sourceHandleId,
      target: newNodeId,
      targetHandle: 'input',
      type: 'smoothstep',
      style: {
        strokeWidth: 2,
        stroke: 'var(--color-edge-default)',
      },
      markerEnd: {
        type: 'arrowclosed' as MarkerType,
        color: 'var(--color-edge-default)',
      },
    }

    const updatedEdges = [...edges, newEdge]
    setEdgesLocal(updatedEdges)
    setEdges(updatedEdges)
  }, [activeFlowId, nodes, edges, setNodesLocal, setEdgesLocal, setNodes, setEdges, reactFlowInstanceRef])

  // Listener para doble clic en handles
  useEffect(() => {
    const handleDoubleClick = (event: CustomEvent) => {
      const { nodeId, handleId, handleType, position } = event.detail
      
      // Solo procesar handles de salida (source)
      if (handleType === 'source') {
        setPendingConnection({
          sourceNodeId: nodeId,
          sourceHandleId: handleId,
          position,
        })
        setIsPaletteOpen(true)
      }
    }

    window.addEventListener('handleDoubleClick', handleDoubleClick as EventListener)
    return () => {
      window.removeEventListener('handleDoubleClick', handleDoubleClick as EventListener)
    }
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handlers para selección múltiple
  const handleSelectAll = useCallback(() => {
    const updatedNodes = nodes.map(n => ({ ...n, selected: true }))
    setNodesLocal(updatedNodes)
  }, [nodes, setNodesLocal])

  const handleDeselectAll = useCallback(() => {
    const updatedNodes = nodes.map(n => ({ ...n, selected: false }))
    const updatedEdges = edges.map(e => ({ ...e, selected: false }))
    setNodesLocal(updatedNodes)
    setEdgesLocal(updatedEdges)
  }, [nodes, edges, setNodesLocal, setEdgesLocal])

  const handleDelete = useCallback((nodeIds: string[], edgeIds: string[]) => {
    const nodeIdsToDelete = new Set(nodeIds)
    const updatedNodes = nodes.filter(n => !nodeIdsToDelete.has(n.id))
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)
    const updatedEdges = edges.filter(
      edge => !edgeIds.includes(edge.id) && !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
    )
    setEdgesLocal(updatedEdges)
    setEdges(updatedEdges)
  }, [nodes, edges, setNodesLocal, setEdgesLocal, setNodes, setEdges])

  // Funciones para manejar grupos
  const handleCreateGroup = useCallback(() => {
    if (!isEditMode || !activeFlowId) return

    // Crear grupo en la posición del menú contextual o centro del viewport
    const groupId = `group-${Date.now()}`
    let defaultPosition = { x: 100, y: 100 }
    
    // Si hay menú contextual, convertir coordenadas de pantalla a coordenadas del flow
    if (contextMenu?.position && reactFlowInstanceRef.current) {
      try {
        defaultPosition = reactFlowInstanceRef.current.screenToFlowPosition({
          x: contextMenu.position.x,
          y: contextMenu.position.y,
        })
      } catch (e) {
        // Si falla, usar posición por defecto
        console.debug('Error al convertir posición:', e)
      }
    }
    
    const newGroup: NodeRedGroup = {
      id: groupId,
      type: 'group',
      name: 'Nuevo Grupo',
      x: defaultPosition.x,
      y: defaultPosition.y,
      w: 400,
      h: 300,
      z: activeFlowId,
    }

    // Agregar el grupo a los grupos existentes
    const updatedGroups = [...storeGroups, newGroup]
    setGroups(updatedGroups)

    // También necesitamos agregarlo como nodo para que se guarde
    // Los grupos son nodos especiales en Node-RED
    // IMPORTANTE: El tipo debe ser 'group' para que React Flow lo reconozca como grupo
    const groupNode: Node = {
      id: groupId,
      type: 'group', // Tipo 'group' para que React Flow use GroupNode
      position: defaultPosition,
      data: {
        label: 'Nuevo Grupo',
        nodeRedType: 'group',
        flowId: activeFlowId,
        outputPortsCount: 0,
        nodeRedNode: newGroup,
        group: newGroup, // Agregar referencia al grupo en data.group
      },
      style: {
        width: newGroup.w || 400,
        height: newGroup.h || 300,
      },
    }

    const updatedNodes = [...nodes, groupNode]
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)
  }, [isEditMode, activeFlowId, contextMenu, storeGroups, setGroups, nodes, setNodesLocal, setNodes])

  const handleAddToGroup = useCallback((nodeId: string, position?: { x: number; y: number }) => {
    if (!isEditMode) return

    // Si no hay grupos, crear uno nuevo directamente
    if (storeGroups.length === 0) {
      handleCreateGroup()
      // Esperar un momento y luego agregar el nodo al grupo recién creado
      setTimeout(() => {
        const state = useCanvasStore.getState()
        const latestGroup = state.groups[state.groups.length - 1]
        if (latestGroup) {
          setNodesLocal((prevNodes) => {
            // Verificar que el grupo existe en el array de nodos
            const groupExists = prevNodes.some(n => n.id === latestGroup.id && n.type === 'group')
            if (!groupExists) {
              console.warn(`Grupo ${latestGroup.id} no encontrado en nodos. No se puede asignar parentId.`)
              return prevNodes
            }

            return prevNodes.map(n => {
              if (n.id === nodeId) {
                const newNodeRedNode = {
                  ...n.data.nodeRedNode,
                  g: latestGroup.id,
                }
                return {
                  ...n,
                  parentId: latestGroup.id, // IMPORTANTE: Establecer parentId para React Flow
                  data: {
                    ...n.data,
                    nodeRedNode: newNodeRedNode,
                  },
                }
              }
              return n
            })
          })
        }
      }, 100)
    } else {
      // Mostrar selector de grupo
      setGroupSelector({
        isOpen: true,
        nodeId,
        position,
      })
    }
  }, [isEditMode, storeGroups, handleCreateGroup, setNodesLocal])

  const handleRemoveFromGroup = useCallback((nodeId: string) => {
    if (!isEditMode) return

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        const newNodeRedNode = { ...n.data.nodeRedNode }
        delete newNodeRedNode.g // Remover la propiedad g
        return {
          ...n,
          parentId: undefined, // IMPORTANTE: Remover parentId para React Flow
          data: {
            ...n.data,
            nodeRedNode: newNodeRedNode,
          },
        }
      }
      return n
    })
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)
  }, [isEditMode, nodes, setNodesLocal, setNodes])

  // Handler para cuando se selecciona un grupo en el selector
  const handleSelectGroup = useCallback((groupId: string | null) => {
    if (!groupSelector.nodeId) return

    const nodeId = groupSelector.nodeId

    if (groupId === null) {
      // Remover del grupo
      handleRemoveFromGroup(nodeId)
    } else {
      // Agregar al grupo seleccionado
      // IMPORTANTE: Verificar que el grupo existe en el array de nodos antes de asignar parentId
      setNodesLocal((prevNodes) => {
        // Verificar que el grupo existe
        const groupExists = prevNodes.some(n => n.id === groupId && n.type === 'group')
        if (!groupExists) {
          console.warn(`Grupo ${groupId} no encontrado en nodos. No se puede asignar parentId.`)
          return prevNodes
        }

        return prevNodes.map(n => {
          if (n.id === nodeId) {
            const newNodeRedNode = {
              ...n.data.nodeRedNode,
              g: groupId,
            }
            return {
              ...n,
              parentId: groupId, // IMPORTANTE: Establecer parentId para React Flow
              data: {
                ...n.data,
                nodeRedNode: newNodeRedNode,
              },
            }
          }
          return n
        })
      })
      // Actualizar el store con los nodos modificados
      setNodesLocal((prevNodes) => {
        // Verificar que el grupo existe
        const groupExists = prevNodes.some(n => n.id === groupId && n.type === 'group')
        if (!groupExists) {
          console.warn(`Grupo ${groupId} no encontrado en nodos. No se puede asignar parentId.`)
          return prevNodes
        }

        const updatedNodes = prevNodes.map((n: Node) => {
          if (n.id === nodeId) {
            const newNodeRedNode = {
              ...n.data.nodeRedNode,
              g: groupId,
            }
            return {
              ...n,
              parentId: groupId, // IMPORTANTE: Establecer parentId para React Flow
              data: {
                ...n.data,
                nodeRedNode: newNodeRedNode,
              },
            }
          }
          return n
        })
        // Actualizar el store después del render usando el ref
        if (isEditMode) {
          pendingStoreUpdateRef.current.nodes = updatedNodes
        }
        return updatedNodes
      })
    }

    setGroupSelector({ isOpen: false, nodeId: null })
  }, [groupSelector.nodeId, handleRemoveFromGroup, setNodesLocal, setNodes])

  // Función para mover grupos (no se usa actualmente, los grupos se mueven nativamente con React Flow)
  // const handleGroupMove = useCallback((groupId: string, newX: number, newY: number) => {
  //   if (!isEditMode) return
  //   // Actualizar el grupo en el store
  //   const updatedGroups = storeGroups.map(g => {
  //     if (g.id === groupId) {
  //       return {
  //         ...g,
  //         x: newX,
  //         y: newY,
  //       }
  //     }
  //     return g
  //   })
  //   setGroups(updatedGroups)
  // }, [isEditMode, storeGroups, setGroups])

  // Función para redimensionar grupos
  const handleGroupResize = useCallback((groupId: string, newWidth: number, newHeight: number) => {
    // Acceder al estado actual del store para evitar dependencias circulares
    const state = useCanvasStore.getState()
    const currentIsEditMode = state.isEditMode
    const currentGroups = state.groups

    if (process.env.NODE_ENV === 'development') {
      console.log('[CanvasPage] handleGroupResize llamado', { groupId, newWidth, newHeight, isEditMode: currentIsEditMode })
    }
    
    if (!currentIsEditMode) {
      return
    }

    // Actualizar el grupo en el store
    const updatedGroups = currentGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          w: newWidth,
          h: newHeight,
        }
      }
      return g
    })
    setGroups(updatedGroups)

    // También actualizar el nodo del grupo en React Flow
    // Usamos el setter funcional para evitar dependencia directa de 'nodes'
    setNodesLocal((prevNodes) => {
      const updatedNodes = prevNodes.map(n => {
        if (n.id === groupId && n.type === 'group') {
          if (n.data.group) {
            return {
              ...n,
              data: {
                ...n.data,
                group: {
                  ...n.data.group,
                  w: newWidth,
                  h: newHeight,
                },
              },
              style: {
                ...n.style,
                width: newWidth,
                // Mantener la altura actual (que puede ser 40 si está colapsado) o usar la nueva
                height: n.style?.height === 40 || n.style?.height === '40px' ? 40 : newHeight,
              },
            }
          }
        }
        return n
      })
      
      return updatedNodes
    })
  }, [setGroups, setNodesLocal])

  // Handler para actualizar grupo
  const handleUpdateGroup = useCallback((groupId: string, updates: Partial<NodeRedGroup>) => {
    if (!isEditMode) return

    // Actualizar grupo en el store
    const updatedGroups = storeGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, ...updates }
      }
      return g
    })
    setGroups(updatedGroups)

    // Actualizar nodo del grupo en React Flow
    setNodesLocal((prevNodes) => {
      return prevNodes.map(n => {
        if (n.id === groupId && n.type === 'group') {
          const currentGroup = (n.data as any).group
          if (currentGroup) {
            return {
              ...n,
              data: {
                ...n.data,
                group: { ...currentGroup, ...updates },
              },
            }
          }
        }
        return n
      })
    })
  }, [isEditMode, storeGroups, setGroups, setNodesLocal])

  // Handler para eliminar grupo
  const handleDeleteGroup = useCallback((groupId: string) => {
    if (!isEditMode) return

    // Confirmar eliminación
    if (!window.confirm('¿Eliminar este grupo? Los nodos dentro del grupo se desasignarán.')) {
      return
    }

    // Desasignar todos los nodos del grupo
    setNodesLocal((prevNodes) => {
      return prevNodes.map(n => {
        const nodeRedNode = n.data?.nodeRedNode
        if (nodeRedNode && nodeRedNode.g === groupId) {
          const newNodeRedNode = { ...nodeRedNode }
          delete newNodeRedNode.g
          return {
            ...n,
            data: {
              ...n.data,
              nodeRedNode: newNodeRedNode,
            },
          }
        }
        return n
      })
    })

    // Remover grupo del store
    const updatedGroups = storeGroups.filter(g => g.id !== groupId)
    setGroups(updatedGroups)

    // Remover nodo del grupo de React Flow
    setNodesLocal((prevNodes) => {
      const updatedNodes = prevNodes.filter((n: Node) => n.id !== groupId)
      // Actualizar el store después del render usando el ref
      if (isEditMode) {
        pendingStoreUpdateRef.current.nodes = updatedNodes
      }
      return updatedNodes
    })
  }, [isEditMode, storeGroups, setGroups, setNodes, setNodesLocal])

  // Handler para duplicar grupo
  const handleDuplicateGroup = useCallback((groupId: string) => {
    if (!isEditMode || !activeFlowId) return

    const originalGroup = storeGroups.find(g => g.id === groupId)
    if (!originalGroup) return

    // Crear nuevo grupo con ID único
    const newGroupId = `group-${Date.now()}`
    const offset = 50 // Offset para posicionar el grupo duplicado

    const newGroup: NodeRedGroup = {
      ...originalGroup,
      id: newGroupId,
      x: originalGroup.x + offset,
      y: originalGroup.y + offset,
    }

    // Agregar nuevo grupo al store
    const updatedGroups = [...storeGroups, newGroup]
    setGroups(updatedGroups)

    // Duplicar nodos dentro del grupo
    const nodesInGroup = nodes.filter(n => {
      const nodeRedNode = n.data?.nodeRedNode
      return nodeRedNode && nodeRedNode.g === groupId
    })

    const duplicatedNodes = nodesInGroup.map(n => {
      const newNodeId = `${n.id}-${Date.now()}`
      const newNodeRedNode = {
        ...n.data.nodeRedNode,
        id: newNodeId,
        g: newGroupId,
        x: (n.data.nodeRedNode.x || n.position.x) + offset,
        y: (n.data.nodeRedNode.y || n.position.y) + offset,
      }

      return {
        ...n,
        id: newNodeId,
        position: {
          x: n.position.x + offset,
          y: n.position.y + offset,
        },
        data: {
          ...n.data,
          nodeRedNode: newNodeRedNode,
        },
      }
    })

    // Agregar nodo del grupo y nodos duplicados
    const groupNode: Node = {
      id: newGroupId,
      type: 'group',
      position: { x: newGroup.x, y: newGroup.y },
      data: {
        label: newGroup.name || newGroup.label || 'Nuevo Grupo',
        nodeRedType: 'group',
        flowId: activeFlowId,
        outputPortsCount: 0,
        nodeRedNode: newGroup,
        group: newGroup,
        nodesCount: duplicatedNodes.length,
      },
      style: {
        width: newGroup.w || 400,
        height: newGroup.h || 300,
      },
    }

    const updatedNodes = [...nodes, groupNode, ...duplicatedNodes]
    setNodesLocal(updatedNodes)
    setNodes(updatedNodes)
  }, [isEditMode, activeFlowId, storeGroups, nodes, setGroups, setNodes, setNodesLocal])

  // Handler para cambiar color del grupo
  const handleChangeGroupColor = useCallback((groupId: string) => {
    // Abrir un prompt simple para cambiar color (mejorar con modal de color picker)
    const currentGroup = storeGroups.find(g => g.id === groupId)
    // Usar color por defecto del tema (azul) como fallback para el prompt
    // El prompt requiere un valor hexadecimal, no una variable CSS
    const currentColor = currentGroup?.color || '#3b82f6'
    
    const newColor = window.prompt('Ingrese el color hexadecimal (ej: #3b82f6):', currentColor)
    if (newColor && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      handleUpdateGroup(groupId, { color: newColor })
    } else if (newColor && newColor !== '') {
      alert('Color inválido. Use formato hexadecimal (ej: #3b82f6)')
    }
  }, [storeGroups, handleUpdateGroup])

  // Handler para editar grupo (abrir panel de propiedades)
  const handleEditGroup = useCallback((groupId: string) => {
    const groupNode = nodes.find(n => n.id === groupId && n.type === 'group')
    if (groupNode) {
      setSelectedNode(groupNode)
      setIsPropertiesOpen(true)
    }
  }, [nodes])

  // Agregar handlers a nodos de grupo cuando se cargan o cambia el modo edición
  useEffect(() => {
    // Usar setter funcional para evitar dependencia de 'nodes'
    setNodesLocal(prevNodes => {
      let hasAnyChange = false
      const updatedNodes = prevNodes.map(node => {
        if (node.type === 'group' && node.data.group) {
          // Solo actualizar si realmente ha cambiado el handler o el modo edición
          if (node.data.onResize !== handleGroupResize || node.data.resizable !== isEditMode) {
            hasAnyChange = true
            return {
              ...node,
              data: {
                ...node.data,
                onResize: handleGroupResize,
                resizable: isEditMode,
              },
            }
          }
        }
        return node
      })
      
      if (!hasAnyChange) return prevNodes
      
      // IMPORTANTE: NO sincronizar con el store global aquí.
      // Estos handlers son efímeros y específicos de la UI del canvas actual.
      // Sincronizar con el store causaría un loop infinito de actualizaciones.
      
      return updatedNodes
    })
  }, [handleGroupResize, isEditMode, setNodesLocal])

  // Hook de atajos de teclado
  useKeyboardShortcuts({
    selectedNodes,
    selectedEdges,
    allNodes: nodes,
    allEdges: edges,
    onNodesChange: (newNodes) => {
      setNodesLocal(newNodes)
      setNodes(newNodes)
    },
    onEdgesChange: (newEdges) => {
      setEdgesLocal(newEdges)
      setEdges(newEdges)
    },
    onSelectAll: handleSelectAll,
    onDeselectAll: handleDeselectAll,
    onDelete: handleDelete,
    isEditMode,
    onClipboardChange: setHasClipboard,
  })

  // Función para comparar si hay cambios no guardados
  const hasUnsavedChanges = useCallback(() => {
    if (!isEditMode) return false
    
    // Comparar nodos (solo posición y propiedades relevantes)
    const nodesChanged = nodes.length !== savedNodes.length ||
      nodes.some((node, index) => {
        const saved = savedNodes[index]
        if (!saved) return true
        return (
          node.id !== saved.id ||
          node.position.x !== saved.position.x ||
          node.position.y !== saved.position.y ||
          node.data.label !== saved.data.label ||
          JSON.stringify(node.data.nodeRedNode) !== JSON.stringify(saved.data.nodeRedNode)
        )
      }) ||
      savedNodes.some((saved, index) => {
        const node = nodes[index]
        if (!node) return true
        return node.id !== saved.id
      })

    // Comparar edges
    const edgesChanged = edges.length !== savedEdges.length ||
      edges.some((edge, index) => {
        const saved = savedEdges[index]
        if (!saved) return true
        return (
          edge.id !== saved.id ||
          edge.source !== saved.source ||
          edge.target !== saved.target ||
          edge.sourceHandle !== saved.sourceHandle ||
          edge.targetHandle !== saved.targetHandle
        )
      }) ||
      savedEdges.some((saved, index) => {
        const edge = edges[index]
        if (!edge) return true
        return edge.id !== saved.id
      })

    return nodesChanged || edgesChanged
  }, [isEditMode, nodes, edges, savedNodes, savedEdges])

  // Función wrapper para switchFlow que verifica cambios no guardados
  const handleSwitchFlow = useCallback((newFlowId: string) => {
    if (hasUnsavedChanges()) {
      const confirm = window.confirm(
        'Tienes cambios sin guardar. ¿Estás seguro de que quieres cambiar de flow? Los cambios se perderán.'
      )
      if (!confirm) {
        return
      }
    }
    switchFlow(newFlowId)
  }, [hasUnsavedChanges, switchFlow])

  // Navegación entre flows con teclado (Ctrl+[ y Ctrl+])
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si se está escribiendo en un input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && flows.length > 1) {
        if (event.key === '[' || event.key === '{') {
          event.preventDefault()
          const currentIndex = flows.findIndex(f => f.id === activeFlowId)
          if (currentIndex > 0) {
            handleSwitchFlow(flows[currentIndex - 1].id)
          } else {
            handleSwitchFlow(flows[flows.length - 1].id) // Ir al último flow
          }
        } else if (event.key === ']' || event.key === '}') {
          event.preventDefault()
          const currentIndex = flows.findIndex(f => f.id === activeFlowId)
          if (currentIndex < flows.length - 1) {
            handleSwitchFlow(flows[currentIndex + 1].id)
          } else {
            handleSwitchFlow(flows[0].id) // Ir al primer flow
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [flows, activeFlowId, handleSwitchFlow])

  // Configuración dinámica del canvas según modo edición
  const dynamicCanvasConfig = {
    ...canvasConfig,
    nodesDraggable: isEditMode,
    nodesConnectable: isEditMode,
    // Pan: permitir con botón izquierdo cuando no se arrastra un nodo
    // React Flow automáticamente detecta si se está arrastrando un nodo o el canvas vacío
    panOnDrag: true, // Permite pan con botón izquierdo en espacio vacío, nodos se mueven si se arrastran
    panOnScroll: false,
    // No seleccionar nodos al arrastrar (solo al hacer click)
    // Esto permite que el pan funcione correctamente cuando no hay nodo seleccionado
    selectNodesOnDrag: false,
    // Selección múltiple: habilitar con Ctrl/Cmd
    multiSelectionKeyCode: ['Meta', 'Control'], // Cmd en Mac, Ctrl en Windows/Linux
    // Box selection: habilitado por defecto en React Flow cuando multiSelectionKeyCode está configurado
    // Optimizaciones para actualización en tiempo real durante el arrastre
    // Asegurar que los nodos se actualicen inmediatamente sin delay
    nodesFocusable: false, // No hacer focus en nodos (evita delays)
    edgesFocusable: false, // No hacer focus en edges (evita delays)
  }

  return (
    <div className={`w-full h-full bg-canvas-bg flex flex-col ${perfMode ? 'perf-mode' : ''}`}>
      {/* Barra superior con selector de flow y estado */}
      <div className="bg-bg-secondary border-b border-canvas-grid p-2 flex items-center gap-4">

        {/* Botón de paleta */}
        {isEditMode && (
          <>
            <div className="w-px h-6 bg-canvas-grid" />
            <button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-primary rounded-md hover:bg-node-hover transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Paleta</span>
            </button>
          </>
        )}

        {/* Botón Explain Mode */}
        <div className="w-px h-6 bg-canvas-grid" />
        <button
          onClick={toggleExplainMode}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
            explainMode
              ? 'bg-accent-primary text-white hover:bg-accent-secondary'
              : 'bg-bg-tertiary text-text-primary hover:bg-node-hover'
          }`}
          title={explainMode ? 'Exit Explain Mode' : 'Enter Explain Mode'}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Explain Mode</span>
        </button>

        {/* Botón Performance Mode */}
        <div className="w-px h-6 bg-canvas-grid" />
        <PerfModeToggle />

        {/* Botón de guardar (solo en modo edición) */}
        {isEditMode && activeFlowId && (
          <>
            <div className="w-px h-6 bg-canvas-grid" />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs bg-accent-primary text-white rounded-md hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save & Deploy</span>
                </>
              )}
            </button>
            {/* Indicador de cambios no guardados */}
            {hasUnsavedChanges() && !isSaving && (
              <span className="text-xs text-status-warning flex items-center gap-1" title="Tienes cambios sin guardar">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Sin guardar
              </span>
            )}
            {saveSuccess && (
              <span className="text-xs text-status-success flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Guardado
              </span>
            )}
            {saveError && (
              <div className="relative group">
                <span className="text-xs text-status-error flex items-center gap-1 max-w-xs truncate cursor-help">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Error
                </span>
                {/* Tooltip con detalles del error */}
                <div className="absolute left-0 top-full mt-1 px-2 py-1.5 bg-bg-primary border border-node-border rounded-md shadow-lg text-[10px] text-text-primary whitespace-pre-line max-w-md z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                  {saveError.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Separador */}
        {(flows.length > 1 || isLoading || error) && (
          <div className="w-px h-6 bg-canvas-grid" />
        )}

        {/* Selector de flow y estado */}
        {(flows.length > 0 || isLoading || error) && (
          <>
          {/* Selector de flow si hay flows */}
          {flows.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="flow-selector" className="text-xs font-medium text-text-secondary">
                Flow:
              </label>
              <select
                id="flow-selector"
                value={activeFlowId || ''}
                onChange={(e) => handleSwitchFlow(e.target.value)}
                className="px-2.5 py-1 text-xs border border-canvas-grid rounded-md bg-bg-primary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              >
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.label || flow.name || `Flow ${flow.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Estado de carga */}
          {isLoading && (
            <div className="text-xs text-text-secondary">Cargando flows...</div>
          )}

          {/* Error con botón de reintento */}
          {error && (
            <div className="text-xs text-status-error flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
              <button
                onClick={() => loadFlows()}
                disabled={isLoading}
                className="px-2 py-1 text-[10px] bg-accent-primary text-white rounded-md hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Cargando...' : 'Reintentar'}
              </button>
            </div>
          )}

          {/* Indicador de flow activo */}
          {!isLoading && !error && activeFlowId && (
            <div className="text-xs text-text-tertiary">
              {flows.find((f) => f.id === activeFlowId)?.label ||
                flows.find((f) => f.id === activeFlowId)?.name ||
                'Flow activo'}
            </div>
          )}
          </>
        )}
      </div>

      {/* Paleta de nodos */}
      {isEditMode && (
        <NodePalette
          isOpen={isPaletteOpen}
          onClose={() => {
            setIsPaletteOpen(false)
            setPendingConnection(null)
          }}
          onNodeClick={(nodeType) => {
            if (pendingConnection) {
              // Crear nodo y conectarlo automáticamente
              handleCreateNodeFromHandle(nodeType, pendingConnection)
              setPendingConnection(null)
              setIsPaletteOpen(false)
            }
          }}
        />
      )}

      {/* Canvas de React Flow */}
      <div className="flex-1 relative">
        {/* Indicador discreto de conexión WebSocket */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {wsConnection.connected ? (
            <div 
              className="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"
              title="Conectado a Node-RED (tiempo real)"
            />
          ) : (
            <div 
              className="w-2 h-2 rounded-full bg-yellow-500 shadow-sm"
              title="WebSocket desconectado. La aplicación funciona sin tiempo real. Los nodos inject funcionan correctamente."
            />
          )}
        </div>
        
        {/* Mensaje cuando hay error de conexión */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
            <div className="text-center max-w-md">
              <p className="text-lg mb-2 text-status-error">No se puede conectar a Node-RED</p>
              <p className="text-sm mb-4">{error}</p>
              <div className="text-xs text-text-tertiary space-y-1">
                <p>• Verifica que Node-RED esté corriendo</p>
                <p>• Verifica la URL en .env.local (por defecto: http://localhost:1880)</p>
                <p>• Verifica que no haya problemas de CORS</p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay flows pero no hay error */}
        {nodes.length === 0 && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <p className="text-lg mb-2">No hay flows para mostrar</p>
              <p className="text-sm">Asegúrate de que Node-RED esté corriendo y tenga flows configurados.</p>
            </div>
          </div>
        )}

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="w-full h-full"
          style={{ 
            touchAction: 'none', // Mejorar soporte táctil
            pointerEvents: 'auto', // Asegurar que los eventos funcionen
          }}
          onDragEnter={() => {
            // Drag enter event - no action needed
          }}
        >
          <ReactFlow
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodes={React.useMemo(() => {
              const filtered = nodes.filter((node) => {
                // Los grupos ahora son nodos React Flow normales, así que se renderizan normalmente
                // Filtrar nodos que pertenecen a grupos colapsados
                // parentId es la forma correcta en React Flow para indicar que un nodo pertenece a un grupo
                // También verificar nodeRedNode.g como fallback para compatibilidad
                const groupId = node.parentId || (node.data as any)?.nodeRedNode?.g
                if (groupId && collapsedGroupIds.has(groupId)) {
                  return false // No renderizar nodos de grupos colapsados
                }
                return true
              })
              
              // Debug: verificar si se están filtrando demasiados nodos
              if (process.env.NODE_ENV === 'development' && filtered.length < nodes.length) {
                const filteredCount = nodes.length - filtered.length
                const filteredNodes = nodes.filter(n => {
                  const groupId = n.parentId || (n.data as any)?.nodeRedNode?.g
                  return groupId && collapsedGroupIds.has(groupId)
                })
                console.debug(`[CanvasPage] Filtrados ${filteredCount} nodos de grupos colapsados. Total: ${nodes.length}, Visible: ${filtered.length}`, {
                  collapsedGroupIds: Array.from(collapsedGroupIds),
                  filteredNodeIds: filteredNodes.map(n => n.id),
                  filteredNodeGroups: filteredNodes.map(n => ({
                    id: n.id,
                    groupId: n.parentId || (n.data as any)?.nodeRedNode?.g
                  }))
                })
              }
              
              return filtered
            }, [nodes, collapsedGroupIds])}
            edges={React.useMemo(() => edges.filter((edge) => {
              // Filtrar edges que conectan nodos de grupos colapsados
              const sourceNode = nodes.find((n) => n.id === edge.source)
              const targetNode = nodes.find((n) => n.id === edge.target)
              // parentId es la forma correcta en React Flow para indicar que un nodo pertenece a un grupo
              // También verificar nodeRedNode.g como fallback para compatibilidad
              const sourceGroupId = sourceNode?.parentId || (sourceNode?.data as any)?.nodeRedNode?.g
              const targetGroupId = targetNode?.parentId || (targetNode?.data as any)?.nodeRedNode?.g
              
              // Si alguno de los nodos está en un grupo colapsado, ocultar el edge
              if (sourceGroupId && collapsedGroupIds.has(sourceGroupId)) {
                return false
              }
              if (targetGroupId && collapsedGroupIds.has(targetGroupId)) {
                return false
              }
              return true
            }), [edges, nodes, collapsedGroupIds])}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNode(node)
              // No abrir panel automáticamente en click simple, solo seleccionar
            }}
            onNodeDoubleClick={(_, node) => {
              setSelectedNode(node)
              setIsPropertiesOpen(true)
            }}
            onNodeDragStart={(event, node) => {
              // Para grupos, solo permitir arrastre desde el header
              if (node.type === 'group') {
                const target = event.target as HTMLElement
                
                // Prevenir arrastre si estamos redimensionando
                const isResizingGroup = (window as any).__isResizingGroup
                if (isResizingGroup) {
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
                
                // Prevenir arrastre si el click provino del handle de redimensionamiento
                if (target.closest('[data-resize-handle="true"]') || target.hasAttribute('data-resize-handle')) {
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
                
                // Solo permitir arrastre si el click provino del header (data-handle="true")
                // El header tiene pointer-events: auto y data-handle="true"
                const isFromHeader = target.closest('[data-handle="true"]') || target.hasAttribute('data-handle')
                if (!isFromHeader) {
                  // Si el click no provino del header, prevenir el arrastre
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
              }
            }}
            onNodeDrag={(_event, node) => {
              // Si por alguna razón el drag comenzó, detenerlo si estamos redimensionando
              const isResizingGroup = (window as any).__isResizingGroup
              if (isResizingGroup && node.type === 'group') {
                // Restaurar la posición original del nodo usando el store persistente
                const originalGroup = storeGroups.find(g => g.id === node.id)
                if (originalGroup && (node.position.x !== originalGroup.x || node.position.y !== originalGroup.y)) {
                  // Usar setTimeout para evitar actualizar durante el render
                  setTimeout(() => {
                    setNodesLocal(prevNodes => prevNodes.map(n => 
                      n.id === node.id ? { ...n, position: { x: originalGroup.x, y: originalGroup.y } } : n
                    ))
                  }, 0)
                }
              }
            }}
            onNodeContextMenu={(event, node) => {
              event.preventDefault()
              setContextMenu({
                position: { x: event.clientX, y: event.clientY },
                node,
              })
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault()
              setContextMenu({
                position: { x: event.clientX, y: event.clientY },
                node: null,
              })
            }}
            fitView
            {...dynamicCanvasConfig}
          >
          {/* Grid de puntos personalizado */}
          <DottedGridBackground />

          {/* Controles de zoom y pan - Diseño minimalista */}
          <Controls
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            className="react-flow__controls-minimal react-flow__controls-with-tidy"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-node-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-node)',
            }}
          />


          {/* Mini mapa del canvas */}
          <MiniMap
            nodeColor={() => {
              // Color de los nodos en el minimap
              return 'var(--color-accent-primary)'
            }}
            maskColor="var(--color-bg-tertiary)"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-node-border)',
            }}
          />
          </ReactFlow>
          
        </div>

        {/* Panel de propiedades para grupos */}
        {isEditMode && selectedNode?.type === 'group' && (
          <GroupPropertiesPanel
            node={selectedNode}
            isOpen={isPropertiesOpen}
            onClose={() => {
              setIsPropertiesOpen(false)
              setSelectedNode(null)
            }}
            onUpdateGroup={handleUpdateGroup}
          />
        )}

        {/* Panel de propiedades para nodos normales (solo si no es grupo) */}
        {/* Visible en modo edición (ambas pestañas) y fuera de modo edición (solo estado) */}
        {selectedNode && selectedNode.type !== 'group' && (
          <NodePropertiesPanel
            node={selectedNode}
            isOpen={isPropertiesOpen}
            isEditMode={isEditMode}
            onClose={() => {
              setIsPropertiesOpen(false)
              setSelectedNode(null)
            }}
            onUpdateNode={isEditMode ? (nodeId, updates) => {
              const updatedNodes = nodes.map(n => 
                n.id === nodeId ? { ...n, ...updates } : n
              )
              setNodesLocal(updatedNodes)
              setNodes(updatedNodes)
            } : undefined}
          />
        )}

        {/* Menú contextual */}
        {contextMenu && (
          <ContextMenu
            position={contextMenu.position}
            node={contextMenu.node}
            onClose={() => setContextMenu(null)}
            onEdit={(nodeId) => {
              const node = nodes.find(n => n.id === nodeId)
              if (node) {
                setSelectedNode(node)
                setIsPropertiesOpen(true)
              }
            }}
            onToggleDisabled={(nodeId) => {
              const updatedNodes = nodes.map(n => {
                if (n.id === nodeId) {
                  const newNodeRedNode = {
                    ...n.data.nodeRedNode,
                    disabled: !n.data.nodeRedNode?.disabled,
                  }
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      nodeRedNode: newNodeRedNode,
                    },
                  }
                }
                return n
              })
              setNodesLocal(updatedNodes)
              setNodes(updatedNodes)
            }}
            onDuplicate={(nodeId) => {
              const nodeToDuplicate = nodes.find(n => n.id === nodeId)
              if (nodeToDuplicate) {
                const newId = `${nodeToDuplicate.data.nodeRedType}-${Date.now()}`
                const duplicatedNode: Node = {
                  ...nodeToDuplicate,
                  id: newId,
                  position: {
                    x: nodeToDuplicate.position.x + 50,
                    y: nodeToDuplicate.position.y + 50,
                  },
                  data: {
                    ...nodeToDuplicate.data,
                    nodeRedNode: {
                      ...nodeToDuplicate.data.nodeRedNode,
                      id: newId,
                    },
                  },
                }
                const updatedNodes = [...nodes, duplicatedNode]
                setNodesLocal(updatedNodes)
                setNodes(updatedNodes)
              }
            }}
            onCopy={(nodeId) => {
              const nodeToCopy = nodes.find(n => n.id === nodeId)
              if (nodeToCopy) {
                const nodeIds = new Set([nodeId])
                const connectedEdges = edges.filter(
                  edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
                )
                copyToClipboard([nodeToCopy], connectedEdges)
                setHasClipboard(true)
              }
            }}
            onCut={(nodeId) => {
              const nodeToCut = nodes.find(n => n.id === nodeId)
              if (nodeToCut) {
                const nodeIds = new Set([nodeId])
                const connectedEdges = edges.filter(
                  edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
                )
                copyToClipboard([nodeToCut], connectedEdges)
                setHasClipboard(true)
                handleDelete([nodeId], connectedEdges.map(e => e.id))
              }
            }}
            onDelete={(nodeId) => {
              const nodeIdsToDelete = new Set([nodeId])
              const updatedNodes = nodes.filter(n => n.id !== nodeId)
              setNodesLocal(updatedNodes)
              setNodes(updatedNodes)
              const updatedEdges = edges.filter(edge =>
                !nodeIdsToDelete.has(edge.source) &&
                !nodeIdsToDelete.has(edge.target)
              )
              setEdgesLocal(updatedEdges)
              setEdges(updatedEdges)
            }}
            onPaste={() => {
              // Pegar se maneja con el hook de atajos de teclado
              const pasted = pasteFromClipboard(50, 50)
              if (pasted) {
                const updatedNodes = [...nodes, ...pasted.nodes]
                const updatedEdges = [...edges, ...pasted.edges]
                setNodesLocal(updatedNodes)
                setNodes(updatedNodes)
                setEdgesLocal(updatedEdges)
                setEdges(updatedEdges)
              }
            }}
            onInsertNode={() => {
              setIsPaletteOpen(true)
            }}
            onCreateGroup={handleCreateGroup}
            onAddToGroup={(nodeId) => {
              const node = nodes.find(n => n.id === nodeId)
              const position = contextMenu?.position
              handleAddToGroup(nodeId, position)
            }}
            onRemoveFromGroup={handleRemoveFromGroup}
            onEditGroup={handleEditGroup}
            onChangeGroupColor={handleChangeGroupColor}
            onDuplicateGroup={handleDuplicateGroup}
            onDeleteGroup={handleDeleteGroup}
            hasClipboard={hasClipboard}
            nodeInGroup={contextMenu?.node ? !!contextMenu.node.data?.nodeRedNode?.g : false}
          />
        )}

        {/* Selector de grupo */}
        {isEditMode && (
          <GroupSelector
            groups={storeGroups}
            isOpen={groupSelector.isOpen}
            onClose={() => setGroupSelector({ isOpen: false, nodeId: null })}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={() => {
              handleCreateGroup()
              // Después de crear, agregar el nodo al grupo recién creado
              setTimeout(() => {
                const state = useCanvasStore.getState()
                const latestGroup = state.groups[state.groups.length - 1]
                if (latestGroup && groupSelector.nodeId) {
                  handleSelectGroup(latestGroup.id)
                }
              }, 100)
            }}
            position={groupSelector.position}
          />
        )}

        {/* Panel de propiedades para grupos */}
        {isEditMode && selectedNode?.type === 'group' && (
          <GroupPropertiesPanel
            node={selectedNode}
            isOpen={isPropertiesOpen}
            onClose={() => {
              setIsPropertiesOpen(false)
              setSelectedNode(null)
            }}
            onUpdateGroup={handleUpdateGroup}
          />
        )}

        {/* Panel de propiedades para nodos normales (solo si no es grupo) */}
        {/* Visible en modo edición (ambas pestañas) y fuera de modo edición (solo estado) */}
        {selectedNode && selectedNode.type !== 'group' && (
          <NodePropertiesPanel
            node={selectedNode}
            isOpen={isPropertiesOpen}
            isEditMode={isEditMode}
            onClose={() => {
              setIsPropertiesOpen(false)
              setSelectedNode(null)
            }}
            onUpdateNode={isEditMode ? (nodeId, updates) => {
              const updatedNodes = nodes.map(n => 
                n.id === nodeId ? { ...n, ...updates } : n
              )
              setNodesLocal(updatedNodes)
              setNodes(updatedNodes)
            } : undefined}
          />
        )}

        {/* Panel de logs de ejecución */}
        <ExecutionLog
          isOpen={isExecutionLogOpen}
          onClose={() => setIsExecutionLogOpen(false)}
        />

        {/* Botón para abrir/cerrar logs de ejecución */}
        <button
          onClick={() => setIsExecutionLogOpen(!isExecutionLogOpen)}
          className={`
            fixed bottom-4 right-4 z-40
            p-3 rounded-lg shadow-lg
            transition-all duration-200
            ${isExecutionLogOpen 
              ? 'bg-accent-primary text-white' 
              : 'bg-node-default text-text-primary border border-node-border hover:bg-node-hover'
            }
          `}
          title="Logs de ejecución"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>

      {/* Execution Bar - Barra de estado de Execution Frames */}
      <ExecutionBar />
      <ExplainModeStepper />
      
      {/* Performance Readout (dev-only) */}
      <PerfReadout />
    </div>
  )
}

