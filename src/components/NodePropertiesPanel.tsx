/**
 * Panel de Propiedades de Nodo (Inspector Moderno)
 * 
 * Sidebar moderno similar a n8n/Flowise que muestra y permite editar
 * las propiedades del nodo seleccionado de forma dinámica basándose
 * en el schema de Node-RED.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Node } from '@xyflow/react'
import { X, Loader2, Info, Settings, ChevronDown, ChevronUp, Database, Play, Code } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'
import { getRuntimeStateColor } from '@/utils/runtimeStatusMapper'
import { getNodeDefinition } from '@/api/nodeDefinition'
import { parseNodeSchema, type NodeSchema, type PropertyDefinition } from '@/utils/nodeSchema'
import { getKnownNodeProperties } from '@/utils/nodeDefaults'
import { shouldNodeHaveEditableProperties, getNoPropertiesMessage } from '@/utils/nodeTypesInfo'
import { TextField, NumberField, SelectField, BooleanField, JSONField, TypedInputField } from './fields'
import { DataViewer } from './DataViewer'
import { useNodeInputData, useNodeOutputData, useNodeContext, useExecutionTimeline } from '@/hooks/useNodeInspectorData'
import { isTriggerNode } from '@/utils/executionFrameManager'
import { CustomEditorRenderer, hasCustomEditor } from './CustomEditorRenderer'
// getNodeExplanation se usa en ExplainMode, pero está comentado por ahora

export interface NodePropertiesPanelProps {
  node: Node | null
  isOpen: boolean
  onClose: () => void
  onUpdateNode?: (nodeId: string, updates: Partial<Node>) => void
  isEditMode?: boolean // Si está en modo edición (muestra pestaña de configuración)
}

/**
 * Renderiza un campo dinámico basado en su definición
 */
function renderField(
  prop: PropertyDefinition,
  value: any,
  onChange: (value: any) => void,
  disabled: boolean
) {
  const fieldId = `field-${prop.id}`

  switch (prop.type) {
    case 'num':
      // Convertir string a número
      let numValue = 0
      if (typeof value === 'number') {
        numValue = value
      } else if (typeof value === 'string' && value !== '') {
        numValue = parseFloat(value) || 0
      } else if (prop.default !== undefined) {
        numValue = typeof prop.default === 'number' ? prop.default : (parseFloat(String(prop.default)) || 0)
      }
      return (
        <NumberField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={numValue}
          onChange={onChange}
          placeholder={prop.placeholder}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder}
        />
      )

    case 'bool':
      // Convertir string 'true'/'false' a boolean
      let boolValue = false
      if (typeof value === 'boolean') {
        boolValue = value
      } else if (typeof value === 'string') {
        boolValue = value === 'true' || value === '1'
      } else if (value !== undefined && value !== null) {
        boolValue = Boolean(value)
      } else if (prop.default !== undefined) {
        boolValue = typeof prop.default === 'boolean' ? prop.default : (prop.default === 'true' || prop.default === '1')
      }
      return (
        <BooleanField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={boolValue}
          onChange={onChange}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder}
        />
      )

    case 'select':
      // Si hay opciones definidas, usar SelectField
      if (prop.options && prop.options.length > 0) {
        return (
          <SelectField
            key={fieldId}
            id={fieldId}
            label={prop.label || prop.id}
            value={String(value || prop.default || '')}
            onChange={onChange}
            options={prop.options}
            required={prop.required}
            disabled={disabled}
            description={prop.placeholder}
          />
        )
      }
      // Si no hay opciones pero es un array, crear opciones desde el array
      if (Array.isArray(prop.default)) {
        return (
          <SelectField
            key={fieldId}
            id={fieldId}
            label={prop.label || prop.id}
            value={String(value || prop.default?.[0] || '')}
            onChange={onChange}
            options={prop.default.map((opt: any) => ({
              value: String(opt),
              label: String(opt),
            }))}
            required={prop.required}
            disabled={disabled}
            description={prop.placeholder}
          />
        )
      }
      // Fallback a TextField
      return (
        <TextField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={String(value || prop.default || '')}
          onChange={onChange}
          placeholder={prop.placeholder}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder}
        />
      )

    case 'typedInput':
      // Usar TypedInputField para campos typedInput
      return (
        <TypedInputField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={value}
          onChange={onChange}
          placeholder={prop.placeholder}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder || 'Tipo de input'}
          default={prop.default}
          typeOptions={prop.options}
          defaultType={(prop as any).defaultType || 'str'}
        />
      )

    case 'json':
    case 'array':
      // Para arrays complejos (props, rules, libs, etc.), usar JSONField
      // Detectar si el label o id indica que es un campo JSON
      const isJSONField = prop.id === 'props' || 
                         prop.id === 'rules' || 
                         prop.id === 'libs' ||
                         prop.id === 'headers' ||
                         (prop.label && prop.label.toLowerCase().includes('json'))
      
      if (isJSONField || prop.type === 'json' || prop.type === 'array') {
        return (
          <JSONField
            key={fieldId}
            id={fieldId}
            label={prop.label || prop.id}
            value={value}
            onChange={onChange}
            placeholder={prop.placeholder || '[]'}
            required={prop.required}
            disabled={disabled}
            description={prop.placeholder}
            default={prop.default}
          />
        )
      }
      // Fallback a TextField
      return (
        <TextField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={String(value || prop.default || '')}
          onChange={onChange}
          placeholder={prop.placeholder}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder}
        />
      )

    case 'str':
    default:
      // Detectar si es un campo JSON por el label o id
      const isJSON = prop.id === 'props' || 
                     prop.id === 'rules' || 
                     prop.id === 'libs' ||
                     prop.id === 'headers' ||
                     (prop.label && prop.label.toLowerCase().includes('json'))
      
      if (isJSON) {
        return (
          <JSONField
            key={fieldId}
            id={fieldId}
            label={prop.label || prop.id}
            value={value}
            onChange={onChange}
            placeholder={prop.placeholder || '[]'}
            required={prop.required}
            disabled={disabled}
            description={prop.placeholder}
            default={prop.default}
          />
        )
      }
      
      // Detectar si es un campo de código (multilínea)
      const isCodeField = prop.id === 'func' || 
                          prop.id === 'initialize' || 
                          prop.id === 'finalize' ||
                          prop.id === 'template' ||
                          prop.id === 'syntax' ||
                          prop.id === 'expression' ||
                          (prop.label && (
                            prop.label.toLowerCase().includes('function') ||
                            prop.label.toLowerCase().includes('code') ||
                            prop.label.toLowerCase().includes('script') ||
                            prop.label.toLowerCase().includes('template')
                          ))
      
      return (
        <TextField
          key={fieldId}
          id={fieldId}
          label={prop.label || prop.id}
          value={String(value || prop.default || '')}
          onChange={onChange}
          placeholder={prop.placeholder}
          required={prop.required}
          disabled={disabled}
          description={prop.placeholder}
          multiline={!!isCodeField}
          rows={isCodeField ? 10 : undefined}
        />
      )
  }
}

export function NodePropertiesPanel({
  node,
  isOpen,
  onClose,
  onUpdateNode,
  isEditMode = false,
}: NodePropertiesPanelProps) {
  const [schema, setSchema] = useState<NodeSchema | null>(null)
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)
  const [nodeProperties, setNodeProperties] = useState<Record<string, any>>({})
  const loadedNodeIdRef = useRef<string | null>(null)
  const schemaLoadedRef = useRef<boolean>(false)

  // Cargar schema y propiedades cuando cambia el nodo
  useEffect(() => {
    if (!node) {
      loadedNodeIdRef.current = null
      setSchema(null)
      setNodeProperties({})
      return
    }

    const nodeId = node.id
    const nodeType = node.data?.nodeRedType
    const nodeRedNode = node.data?.nodeRedNode

    // Si es un nodo diferente, limpiar estado y cargar nuevo
    if (loadedNodeIdRef.current !== nodeId) {
      // Limpiar propiedades anteriores cuando cambia el nodo
      setNodeProperties({})
      setSchema(null)
      loadedNodeIdRef.current = nodeId
      schemaLoadedRef.current = false
    } else {
      // Es el mismo nodo, pero actualizar propiedades por si los datos cambiaron
      if (nodeRedNode) {
        const internalProps = [
          'id', 'type', 'x', 'y', 'z', 'wires', 
          '_', 'dirty', 'changed', 'valid', 'users',
          'inputLabels', 'outputLabels', 'selected', 'moved',
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
          'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
          '_config', '_def', '_orig'
        ]
        const editableProps: Record<string, any> = {}
        Object.entries(nodeRedNode).forEach(([key, value]) => {
          if (!internalProps.includes(key)) {
            editableProps[key] = value
          }
        })
        setNodeProperties(editableProps)
      }
      // Si ya tenemos el schema cargado, no recargar (evitar llamadas innecesarias)
      if (schemaLoadedRef.current) {
        return
      }
    }

    // Inicializar propiedades desde el nodo actual
    // Propiedades internas de Node-RED que NO deben ser editables
    const internalProps = [
      'id', 'type', 'x', 'y', 'z', 'wires', 
      '_', 'dirty', 'changed', 'valid', 'users',
      'inputLabels', 'outputLabels', 'selected', 'moved',
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w',
      '_config', '_def', '_orig'
    ]
    
    if (nodeRedNode) {
      // Extraer propiedades editables (excluyendo internas)
      // NOTA: 'name' SÍ es editable en Node-RED, así que lo incluimos
      const editableProps: Record<string, any> = {}
      Object.entries(nodeRedNode).forEach(([key, value]) => {
        if (!internalProps.includes(key)) {
          editableProps[key] = value
        }
      })
      setNodeProperties(editableProps)
    }

    // Cargar schema del nodo
    if (nodeType) {
      setIsLoadingSchema(true)
      getNodeDefinition(nodeType)
        .then((nodeDef) => {
          if (nodeDef) {
            const parsedSchema = parseNodeSchema(nodeType, nodeDef, nodeRedNode)
            
            // Si el schema tiene propiedades, usarlo
            if (parsedSchema.properties && parsedSchema.properties.length > 0) {
              setSchema(parsedSchema)
              schemaLoadedRef.current = true
              
              // Actualizar nodeProperties con valores por defecto del schema si no están presentes
              setNodeProperties((prevProps) => {
                const updatedProps = { ...prevProps }
                parsedSchema.properties.forEach((prop) => {
                  if (prop.default !== undefined && !(prop.id in updatedProps)) {
                    updatedProps[prop.id] = prop.default
                  }
                })
                return updatedProps
              })
            } else {
              // Si no hay propiedades en el schema, intentar crear desde nodeRedNode
              // Obtener propiedades actuales usando función de actualización
              setNodeProperties((prevProps) => {
                if (Object.keys(prevProps).length > 0) {
                  const basicSchema: NodeSchema = {
                    nodeType,
                    properties: Object.entries(prevProps).map(([key, value]) => ({
                      id: key,
                      type: typeof value === 'number' ? 'num' : typeof value === 'boolean' ? 'bool' : 'str',
                      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
                      default: value,
                  })),
                }
                setSchema(basicSchema)
                schemaLoadedRef.current = true
              } else {
                // No hay propiedades disponibles
                setSchema(parsedSchema)
                schemaLoadedRef.current = true
              }
                return prevProps // No cambiar nodeProperties aquí
              })
            }
          } else {
            // Si no hay definición, intentar usar propiedades conocidas primero
            const knownProps = getKnownNodeProperties(nodeType)
            
            if (knownProps && knownProps.length > 0) {
              // Usar propiedades conocidas
              setNodeProperties((prevProps) => {
                const knownSchema: NodeSchema = {
                  nodeType,
                  properties: knownProps.map((prop) => ({
                    ...prop,
                    default: prevProps[prop.id] !== undefined ? prevProps[prop.id] : prop.default,
                  })),
                }
                setSchema(knownSchema)
                schemaLoadedRef.current = true
                
                // Actualizar nodeProperties con valores por defecto
                const updatedProps = { ...prevProps }
                knownProps.forEach((prop) => {
                  if (prop.default !== undefined && !(prop.id in updatedProps)) {
                    updatedProps[prop.id] = prop.default
                  }
                })
                return updatedProps
              })
            } else if (nodeRedNode) {
              // Si no hay propiedades conocidas, intentar extraer desde nodeRedNode
              setNodeProperties((prevProps) => {
                if (Object.keys(prevProps).length > 0) {
                  // Si hay propiedades en el nodo, usarlas
                  const fallbackSchema: NodeSchema = {
                    nodeType,
                    properties: Object.entries(prevProps).map(([key, value]) => ({
                      id: key,
                      type: typeof value === 'number' ? 'num' : typeof value === 'boolean' ? 'bool' : 'str',
                      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
                      default: value,
                    })),
                  }
                  setSchema(fallbackSchema)
                  schemaLoadedRef.current = true
                } else {
                  // No hay propiedades disponibles
                  setSchema({
                    nodeType,
                    properties: [],
                  })
                  schemaLoadedRef.current = true
                }
                return prevProps
              })
            } else {
              // No hay propiedades disponibles
              setSchema({
                nodeType,
                properties: [],
              })
              schemaLoadedRef.current = true
            }
          }
        })
        .catch((err) => {
          console.debug('Error al cargar schema del nodo:', err)
          // Intentar usar propiedades conocidas como fallback
          const knownProps = getKnownNodeProperties(nodeType)
          
          if (knownProps && knownProps.length > 0) {
            setNodeProperties((prevProps) => {
              const knownSchema: NodeSchema = {
                nodeType,
                properties: knownProps.map((prop) => ({
                  ...prop,
                  default: prevProps[prop.id] !== undefined ? prevProps[prop.id] : prop.default,
                })),
              }
              setSchema(knownSchema)
              schemaLoadedRef.current = true
              
              // Actualizar nodeProperties con valores por defecto
              const updatedProps = { ...prevProps }
              knownProps.forEach((prop) => {
                if (prop.default !== undefined && !(prop.id in updatedProps)) {
                  updatedProps[prop.id] = prop.default
                }
              })
              return updatedProps
            })
          } else if (nodeRedNode) {
            setNodeProperties((prevProps) => {
              if (Object.keys(prevProps).length > 0) {
                const basicSchema: NodeSchema = {
                  nodeType,
                  properties: Object.entries(prevProps).map(([key, value]) => ({
                    id: key,
                    type: typeof value === 'number' ? 'num' : typeof value === 'boolean' ? 'bool' : 'str',
                    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
                    default: value,
                  })),
                }
                setSchema(basicSchema)
                schemaLoadedRef.current = true
              } else {
                setSchema({
                  nodeType,
                  properties: [],
                })
                schemaLoadedRef.current = true
              }
              return prevProps
            })
          } else {
            setSchema({
              nodeType,
              properties: [],
            })
            schemaLoadedRef.current = true
          }
        })
        .finally(() => {
          setIsLoadingSchema(false)
        })
    }
  }, [node])

  // Agrupar propiedades por categorías (básico, avanzado, etc.)
  const groupedProperties = useMemo(() => {
    if (!schema || !schema.properties) return {}

    const groups: Record<string, PropertyDefinition[]> = {
      General: [],
      Advanced: [],
    }

    schema.properties.forEach((prop) => {
      // Propiedades comunes van a General
      if (['name', 'label', 'topic', 'payload'].includes(prop.id.toLowerCase())) {
        groups.General.push(prop)
      } else {
        groups.Advanced.push(prop)
      }
    })

    // Eliminar grupos vacíos
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })

    return groups
  }, [schema])

  // Manejar cambios en propiedades
  const handlePropertyChange = useCallback((propId: string, value: any) => {
    // Encontrar la definición de la propiedad para preservar el tipo correcto
    const propDef = schema?.properties.find(p => p.id === propId)
    
    // Convertir el valor según el tipo de propiedad
    let convertedValue: any = value
    if (propDef) {
      switch (propDef.type) {
        case 'num':
          // Convertir string a número
          convertedValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
          break
        case 'bool':
          // Convertir string 'true'/'false' a boolean
          if (typeof value === 'boolean') {
            convertedValue = value
          } else if (typeof value === 'string') {
            convertedValue = value === 'true' || value === '1'
          } else {
            convertedValue = Boolean(value)
          }
          break
        case 'select':
          // Mantener como string para selects
          convertedValue = String(value)
          break
        default:
          // Mantener como string para otros tipos
          convertedValue = String(value)
      }
    }
    
    const updatedProperties = {
      ...nodeProperties,
      [propId]: convertedValue,
    }
    setNodeProperties(updatedProperties)

    // Actualizar nodo en React Flow
    if (onUpdateNode && node) {
      // Si se cambió el nombre, también actualizar el label
      const updatedData: any = {
        ...node.data,
        nodeRedNode: {
          ...node.data.nodeRedNode,
          [propId]: convertedValue,
        },
      }
      
      // Si se cambió 'name', actualizar también el label
      if (propId === 'name') {
        updatedData.label = convertedValue || node.data.nodeRedType || 'node'
      }
      
      onUpdateNode(node.id, {
        data: updatedData,
      })
    }
  }, [node, schema, nodeProperties, onUpdateNode])

  // Calcular nombre del nodo de forma reactiva (ANTES del return null)
  // El nombre puede venir de nodeRedNode.name o del label del nodo
  const nodeType = useMemo(() => {
    return node?.data?.nodeRedType || 'unknown'
  }, [node?.data?.nodeRedType])

  const nodeName = useMemo(() => {
    if (!node) return 'Unknown'
    const nodeRedNode = node.data?.nodeRedNode
    if (nodeRedNode?.name) {
      return nodeRedNode.name
    }
    return node.data?.label || node.data?.nodeRedName || nodeType
  }, [node?.data?.nodeRedNode?.name, node?.data?.label, node?.data?.nodeRedName, nodeType])

  // Estado de runtime del nodo
  const nodeRuntimeStates = useCanvasStore((state) => state.nodeRuntimeStates)
  const runtimeState = node?.id ? nodeRuntimeStates.get(node.id) : undefined
  const runtimeStateColor = runtimeState ? getRuntimeStateColor(runtimeState) : undefined
  
  // Logs de ejecución del nodo
  const executionLogs = useCanvasStore((state) => state.executionLogs)
  const nodeLogs = useMemo(() => {
    if (!node?.id) return []
    const filtered = executionLogs.filter(log => {
      const matches = log.nodeId === node.id
      // Log de depuración solo para los primeros logs
      if (executionLogs.length > 0 && executionLogs.length <= 10) {
        console.log('🔍 [NodePropertiesPanel] Comparando log:', {
          logNodeId: log.nodeId,
          currentNodeId: node.id,
          matches,
          logMessage: log.message?.substring(0, 50)
        })
      }
      return matches
    })
    // Ordenar por timestamp descendente (más reciente primero)
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp)
    return sorted.slice(0, 50) // Últimos 50 logs
  }, [executionLogs, node?.id])
  
  // Último log con datos (para mostrar payload)
  const lastLogWithData = useMemo(() => {
    return nodeLogs.find(log => log.data) || null
  }, [nodeLogs])
  
  // Obtener datos usando los nuevos hooks
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const inputData = useNodeInputData(node?.id || null, currentFrame?.id || null)
  const outputData = useNodeOutputData(node?.id || null)
  const contextData = useNodeContext(node?.id || null, currentFrame?.id || null)
  const executionTimeline = useExecutionTimeline(node?.id || null)
  
  // Variables para tab Advanced (logs y raw msg)
  
  // Edges conectados al nodo (input/output)
  const edges = useCanvasStore((state) => state.edges)
  const nodes = useCanvasStore((state) => state.nodes)
  
  const inputEdges = useMemo(() => {
    if (!node?.id) return []
    return edges.filter(e => e.target === node.id)
  }, [edges, node?.id])
  
  const outputEdges = useMemo(() => {
    if (!node?.id) return []
    return edges.filter(e => e.source === node.id)
  }, [edges, node?.id])
  
  // Obtener información de nodos conectados (inputs)
  const inputNodes = useMemo(() => {
    if (!node?.id) return []
    return inputEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      return {
        edge,
        node: sourceNode,
        name: sourceNode?.data?.label || sourceNode?.data?.nodeRedName || sourceNode?.data?.nodeRedType || edge.source,
        type: sourceNode?.data?.nodeRedType || 'unknown',
      }
    })
  }, [inputEdges, nodes])
  
  // Obtener información de nodos conectados (outputs)
  const outputNodes = useMemo(() => {
    if (!node?.id) return []
    return outputEdges.map(edge => {
      const targetNode = nodes.find(n => n.id === edge.target)
      return {
        edge,
        node: targetNode,
        name: targetNode?.data?.label || targetNode?.data?.nodeRedName || targetNode?.data?.nodeRedType || edge.target,
        type: targetNode?.data?.nodeRedType || 'unknown',
      }
    })
  }, [outputEdges, nodes])

  // Pestañas del panel - nueva estructura: data, execution, configuration, advanced
  type TabType = 'data' | 'execution' | 'configuration' | 'advanced'
  const [activeTab, setActiveTab] = useState<TabType>(
    isEditMode ? 'configuration' : 'data'
  )
  const [dataSubTab, setDataSubTab] = useState<'input' | 'output' | 'context'>('input')
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false)
  
  // Si no está en modo edición, forzar pestaña de data
  useEffect(() => {
    if (!isEditMode && activeTab === 'configuration') {
      setActiveTab('data')
    }
  }, [isEditMode, activeTab])

  // Return temprano DESPUÉS de todos los hooks
  console.log('🔍 [NodePropertiesPanel] Renderizando:', {
    isOpen,
    hasNode: !!node,
    nodeId: node?.id,
    nodeType: node?.type,
    willRender: isOpen && !!node,
  })
  
  if (!isOpen || !node) {
    console.log('🔍 [NodePropertiesPanel] ⚠️ Return null - isOpen:', isOpen, 'hasNode:', !!node)
    return null
  }

  console.log('🔍 [NodePropertiesPanel] ✅ Renderizando panel visible para:', node.id)

  return (
    <>
      {/* Overlay modal */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal container - 3 paneles */}
        <div 
          className="bg-bg-primary border border-node-border shadow-2xl rounded-lg w-[85vw] max-w-[1000px] h-[75vh] max-h-[700px] flex flex-col z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-node-border flex-shrink-0">
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text-primary truncate">
                  {nodeName}
                </h2>
                <p className="text-xs text-text-tertiary truncate mt-0.5">
                  {nodeType}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-md hover:bg-bg-secondary flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
                aria-label="Cerrar panel"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            
            {/* Pestañas - nueva estructura */}
            <div className="flex border-t border-node-border overflow-x-auto">
          {/* Tab Data - siempre visible */}
          <button
            onClick={() => setActiveTab('data')}
            className={`
              flex-1 min-w-[80px] px-3 py-2 text-xs font-medium transition-colors
              flex items-center justify-center gap-1.5 relative
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
              ${activeTab === 'data'
                ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }
            `}
          >
            <Database className="w-3.5 h-3.5" />
            Data
          </button>
          
          {/* Tab Execution - siempre visible */}
          <button
            onClick={() => setActiveTab('execution')}
            className={`
              flex-1 min-w-[80px] px-3 py-2 text-xs font-medium transition-colors
              flex items-center justify-center gap-1.5 relative
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
              ${activeTab === 'execution'
                ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }
            `}
          >
            <Play className="w-3.5 h-3.5" />
            Execution
            {runtimeStateColor && (
              <span
                className="absolute top-1.5 right-2 w-2 h-2 rounded-full"
                style={{ backgroundColor: runtimeStateColor }}
              />
            )}
          </button>
          
          {/* Tab Configuration - solo en edit mode */}
          {isEditMode && (
            <button
              onClick={() => setActiveTab('configuration')}
              className={`
                flex-1 min-w-[80px] px-3 py-2 text-xs font-medium transition-colors
                flex items-center justify-center gap-1.5
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
                ${activeTab === 'configuration'
                  ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }
              `}
            >
              <Settings className="w-3.5 h-3.5" />
              Config
            </button>
          )}
          
          {/* Tab Advanced - siempre visible pero colapsado por defecto */}
          <button
            onClick={() => {
              setActiveTab('advanced')
              setIsAdvancedExpanded(true)
            }}
            className={`
              flex-1 min-w-[80px] px-3 py-2 text-xs font-medium transition-colors
              flex items-center justify-center gap-1.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
              ${activeTab === 'advanced'
                ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }
            `}
          >
            <Code className="w-3.5 h-3.5" />
            Advanced
          </button>
        </div>
        
        {/* Sub-tabs para Data tab */}
        {activeTab === 'data' && (
          <div className="flex border-t border-node-border bg-bg-secondary/50">
            <button
              onClick={() => setDataSubTab('input')}
              className={`
                flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors
                ${dataSubTab === 'input'
                  ? 'text-text-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              Input
            </button>
            <button
              onClick={() => setDataSubTab('output')}
              className={`
                flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors
                ${dataSubTab === 'output'
                  ? 'text-text-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              Output
            </button>
            <button
              onClick={() => setDataSubTab('context')}
              className={`
                flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors
                ${dataSubTab === 'context'
                  ? 'text-text-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              Context
            </button>
            </div>
          )}
          </div>

          {/* Contenido principal - 3 paneles */}
          <div className="flex-1 flex overflow-hidden">
            {/* Panel izquierdo - Inputs */}
            <div className="w-56 border-r border-node-border bg-bg-secondary/30 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-node-border">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Input Connections
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {inputNodes.length > 0 ? (
                  <div className="space-y-2">
                    {inputNodes.map(({ edge, name, type }) => (
                      <div
                        key={edge.id}
                        className="p-3 bg-bg-primary rounded-md border border-node-border/50 hover:border-node-border transition-colors"
                      >
                        <div className="text-xs font-medium text-text-primary mb-1">
                          {name}
                        </div>
                        <div className="text-[10px] text-text-tertiary mb-2">
                          {type}
                        </div>
                        <div className="text-[10px] text-text-secondary font-mono">
                          {edge.source}
                          {edge.sourceHandle && ` [${edge.sourceHandle}]`}
                          {' → '}
                          {edge.target}
                          {edge.targetHandle && ` [${edge.targetHandle}]`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-secondary">
                    <p className="text-xs">No input connections</p>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      {isTriggerNode(nodeType || '') 
                        ? 'This is a trigger node - no inputs'
                        : 'No upstream nodes connected'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel central - Propiedades */}
            <div className="w-96 flex flex-col min-w-0 flex-shrink-0">
              {/* Contenido scrollable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'data' ? (
          /* Tab Data con sub-tabs */
          <div className="p-3 space-y-4">
            {dataSubTab === 'input' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Input Data
                </h3>
                {inputData ? (
                  <DataViewer
                    data={inputData.data}
                    mode="json"
                    isInferred={inputData.isInferred}
                    sourceNodeName={inputData.source || undefined}
                    emptyMessage="No input data available"
                  />
                ) : (
                  <div className="p-6 text-center text-text-secondary">
                    <p className="text-xs">No input data available</p>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      {isTriggerNode(nodeType || '') 
                        ? 'This is a trigger node - input comes from external events'
                        : 'No upstream nodes connected or no data captured yet'}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {dataSubTab === 'output' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Output Data
                </h3>
                {outputData ? (
                  <>
                    <DataViewer
                      data={outputData.data}
                      mode="json"
                      isTruncated={outputData.isTruncated}
                      emptyMessage="No output data captured yet"
                    />
                    {outputData.timestamp && (
                      <p className="text-[10px] text-text-tertiary">
                        Last output: {new Date(outputData.timestamp).toLocaleString()}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center text-text-secondary">
                    <p className="text-xs">No output data captured yet</p>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      Output will appear here when the node executes
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {dataSubTab === 'context' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Context
                </h3>
                {contextData ? (
                  <div className="space-y-3">
                    {/* Frame Info */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-secondary">
                        Frame ID
                      </label>
                      <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs font-mono text-text-primary border border-node-border/50">
                        {contextData.frameId || 'No active frame'}
                      </div>
                    </div>
                    
                    {/* Execution Status */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-secondary">
                        Execution Status
                      </label>
                      <div className="flex items-center gap-2">
                        {runtimeStateColor && (
                          <div
                            className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: runtimeStateColor }}
                          />
                        )}
                        <span className="text-xs text-text-primary capitalize">
                          {contextData.executionStatus}
                        </span>
                      </div>
                    </div>
                    
                    {/* Duration */}
                    {contextData.duration !== null && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-text-secondary">
                          Duration
                        </label>
                        <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50">
                          {contextData.duration}ms
                        </div>
                      </div>
                    )}
                    
                    {/* Node Type */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-secondary">
                        Node Type
                      </label>
                      <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50">
                        {contextData.nodeType}
                      </div>
                    </div>
                    
                    {/* Metadata conocida */}
                    {(contextData.topic || contextData.headers || contextData.statusCode) && (
                      <div className="space-y-2 pt-2 border-t border-node-border">
                        <label className="block text-xs font-medium text-text-secondary">
                          Metadata
                        </label>
                        <div className="space-y-1.5">
                          {contextData.topic && (
                            <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary rounded text-xs border border-node-border/50">
                              <span className="text-text-secondary">Topic:</span>
                              <span className="text-text-primary font-mono">{contextData.topic}</span>
                            </div>
                          )}
                          {contextData.statusCode && (
                            <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary rounded text-xs border border-node-border/50">
                              <span className="text-text-secondary">Status Code:</span>
                              <span className="text-text-primary font-mono">{contextData.statusCode}</span>
                            </div>
                          )}
                          {contextData.headers && (
                            <div className="px-2 py-1 bg-bg-secondary rounded text-xs border border-node-border/50">
                              <span className="text-text-secondary">Headers:</span>
                              <pre className="text-[10px] text-text-primary mt-1 font-mono overflow-x-auto">
                                {JSON.stringify(contextData.headers, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    {contextData.timestamp && (
                      <div className="space-y-2 pt-2 border-t border-node-border">
                        <label className="block text-xs font-medium text-text-secondary">
                          Last Update
                        </label>
                        <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50">
                          {new Date(contextData.timestamp).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-secondary">
                    <p className="text-xs">No context data available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'execution' ? (
          /* Tab Execution */
          <div className="p-3 space-y-4">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Execution Timeline
            </h3>
            
            {executionTimeline ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {runtimeStateColor && (
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: runtimeStateColor }}
                    />
                  )}
                  <span className="text-xs font-medium text-text-primary capitalize">
                    Status: {contextData?.executionStatus || 'idle'}
                  </span>
                </div>
                
                {/* Frame Reference */}
                {contextData?.frameId && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-text-secondary">
                      Frame ID
                    </label>
                    <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs font-mono text-text-primary border border-node-border/50">
                      {contextData.frameId}
                    </div>
                  </div>
                )}
                
                {/* Duration */}
                {contextData?.duration !== null && contextData?.duration !== undefined && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-text-secondary">
                      Duration
                    </label>
                    <div className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50">
                      {contextData.duration}ms
                    </div>
                  </div>
                )}
                
                {/* Timeline Visual */}
                <div className="space-y-3 pt-2 border-t border-node-border">
                  <label className="block text-xs font-medium text-text-secondary">
                    Execution Flow
                  </label>
                  
                  {/* Previous Nodes */}
                  {executionTimeline.previous.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-text-tertiary uppercase">Previous</div>
                      <div className="space-y-1">
                        {executionTimeline.previous.map((prev) => (
                          <div
                            key={prev.id}
                            className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50"
                          >
                            {prev.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Current Node - Highlighted */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-text-tertiary uppercase">Current</div>
                    <div className="px-2 py-1.5 bg-accent-primary/20 rounded text-xs font-medium text-text-primary border-2 border-accent-primary">
                      {executionTimeline.current.name}
                    </div>
                  </div>
                  
                  {/* Next Nodes */}
                  {executionTimeline.next.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-text-tertiary uppercase">Next</div>
                      <div className="space-y-1">
                        {executionTimeline.next.map((next) => (
                          <div
                            key={next.id}
                            className="px-2 py-1.5 bg-bg-secondary rounded text-xs text-text-primary border border-node-border/50"
                          >
                            {next.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty states */}
                  {executionTimeline.previous.length === 0 && executionTimeline.next.length === 0 && (
                    <div className="text-xs text-text-tertiary text-center py-4">
                      No connected nodes
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-text-secondary">
                <p className="text-xs">No execution data available</p>
              </div>
            )}
          </div>
        ) : activeTab === 'configuration' ? (
          // Check if node has custom editor
          hasCustomEditor(nodeType) ? (
            <div className="flex-1 overflow-y-auto">
              <CustomEditorRenderer
                nodeType={nodeType}
                nodeData={node.data?.nodeRedNode || {}}
                nodeId={node.id} // Pasar nodeId para guardar credenciales
                onChange={(updatedData) => {
                  if (onUpdateNode) {
                    const updatedNodeData: any = {
                      ...node.data,
                      nodeRedNode: {
                        ...node.data?.nodeRedNode,
                        ...updatedData
                      }
                    }
                    
                    // Si se cambió el nombre, actualizar también el label del nodo
                    if (updatedData.name !== undefined) {
                      updatedNodeData.label = updatedData.name || node.data?.nodeRedType || 'node'
                    }
                    
                    onUpdateNode(node.id, {
                      data: updatedNodeData
                    })
                  }
                }}
              />
            </div>
          ) : isLoadingSchema ? (
          <div className="p-6 flex flex-col items-center justify-center text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Cargando propiedades...</p>
          </div>
        ) : schema && schema.properties.length > 0 ? (
          <div className="p-3 space-y-4">
            {/* Información básica del nodo (solo lectura) */}
            <div className="space-y-2 pb-3 border-b border-node-border">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  ID
                </label>
                <input
                  type="text"
                  value={node.id}
                  disabled
                  className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    X
                  </label>
                  <input
                    type="number"
                    value={Math.round(node.position.x)}
                    disabled
                    className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Y
                  </label>
                  <input
                    type="number"
                    value={Math.round(node.position.y)}
                    disabled
                    className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-secondary text-text-tertiary cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Descripción del nodo si está disponible */}
            {schema.description && (
              <div className="flex items-start gap-2 p-2 bg-bg-secondary rounded-md">
                <Info className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {schema.description}
                </p>
              </div>
            )}

            {/* Propiedades agrupadas */}
            {Object.entries(groupedProperties).map(([groupName, props]) => (
              <div key={groupName} className="space-y-3">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  {groupName}
                </h3>
                <div className="space-y-3">
                  {props.map((prop) => {
                    const currentValue = nodeProperties[prop.id] !== undefined
                      ? nodeProperties[prop.id]
                      : prop.default

                    return renderField(
                      prop,
                      currentValue,
                      (value) => handlePropertyChange(prop.id, value),
                      false
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-text-secondary">
            <p className="text-xs mb-2">No hay propiedades editables disponibles</p>
            {(() => {
              const customMessage = getNoPropertiesMessage(nodeType)
              return customMessage ? (
                <p className="text-[10px] text-text-tertiary">{customMessage}</p>
              ) : (
                <p className="text-[10px] text-text-tertiary">
                  Este nodo no tiene propiedades configurables o el schema no está disponible.
                  {!shouldNodeHaveEditableProperties(nodeType) && (
                    <span className="block mt-1 text-[9px] opacity-75">
                      Nota: Este tipo de nodo normalmente no tiene propiedades editables.
                    </span>
                  )}
                </p>
              )
            })()}
          </div>
        )
        ) : activeTab === 'advanced' ? (
          /* Tab Advanced */
          <div className="p-3 space-y-4">
            <div className="space-y-3">
              <button
                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                className="w-full text-left text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center justify-between hover:text-text-primary transition-colors"
              >
                <span>Advanced Details</span>
                <span className="text-text-tertiary">{isAdvancedExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
              </button>
              
              {isAdvancedExpanded && (
                <div className="space-y-4 pt-2">
                  {/* Raw msg */}
                  {lastLogWithData?.data && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-secondary">
                        Raw Message (msg)
                      </label>
                      <div className="bg-bg-secondary rounded-md p-2 border border-node-border/50">
                        <pre className="text-[10px] text-text-secondary font-mono overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(lastLogWithData.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Debug Logs */}
                  {nodeLogs.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-secondary">
                        Debug Logs ({nodeLogs.length})
                      </label>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {nodeLogs.map((log) => {
                          const getLogColor = (level: string) => {
                            switch (level) {
                              case 'error': return 'border-red-500'
                              case 'warn': return 'border-yellow-500'
                              case 'success': return 'border-green-500'
                              default: return 'border-blue-500'
                            }
                          }
                          
                          return (
                            <div
                              key={log.id}
                              className={`p-2 bg-bg-secondary rounded-md text-xs border-l-2 ${getLogColor(log.level)}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-text-primary">
                                  {log.level.toUpperCase()}
                                </span>
                                <span className="text-text-tertiary text-[10px]">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-text-secondary text-[11px]">{log.message}</p>
                              {log.duration !== undefined && (
                                <p className="text-text-tertiary text-[10px] mt-1">
                                  Duration: {log.duration}ms
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Internal IDs */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-secondary">
                      Internal IDs
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-2 py-1.5 bg-bg-secondary rounded text-xs border border-node-border/50">
                        <span className="text-text-secondary">React Flow ID:</span>
                        <span className="text-text-primary font-mono">{node.id}</span>
                      </div>
                      {node.data?.nodeRedNode?.id && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-bg-secondary rounded text-xs border border-node-border/50">
                          <span className="text-text-secondary">Node-RED ID:</span>
                          <span className="text-text-primary font-mono">{node.data.nodeRedNode.id}</span>
                        </div>
                      )}
                      {node.data?.flowId && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-bg-secondary rounded text-xs border border-node-border/50">
                          <span className="text-text-secondary">Flow ID (z):</span>
                          <span className="text-text-primary font-mono">{node.data.flowId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Wiring Info */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-secondary">
                      Wiring Info
                    </label>
                    <div className="space-y-2">
                      {/* Input Edges */}
                      <div>
                        <div className="text-[10px] text-text-tertiary uppercase mb-1">Input Edges</div>
                        {inputEdges.length > 0 ? (
                          <div className="space-y-1">
                            {inputEdges.map((edge) => (
                              <div key={edge.id} className="px-2 py-1 bg-bg-secondary rounded text-[10px] font-mono text-text-primary border border-node-border/50">
                                {edge.source} → {edge.target}
                                {edge.sourceHandle && ` [${edge.sourceHandle}]`}
                                {edge.targetHandle && ` [${edge.targetHandle}]`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-bg-secondary rounded text-[10px] text-text-tertiary border border-node-border/50">
                            No input edges
                          </div>
                        )}
                      </div>
                      
                      {/* Output Edges */}
                      <div>
                        <div className="text-[10px] text-text-tertiary uppercase mb-1">Output Edges</div>
                        {outputEdges.length > 0 ? (
                          <div className="space-y-1">
                            {outputEdges.map((edge) => (
                              <div key={edge.id} className="px-2 py-1 bg-bg-secondary rounded text-[10px] font-mono text-text-primary border border-node-border/50">
                                {edge.source} → {edge.target}
                                {edge.sourceHandle && ` [${edge.sourceHandle}]`}
                                {edge.targetHandle && ` [${edge.targetHandle}]`}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-bg-secondary rounded text-[10px] text-text-tertiary border border-node-border/50">
                            No output edges
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
              </div>
            </div>

            {/* Panel derecho - Outputs */}
            <div className="w-56 border-l border-node-border bg-bg-secondary/30 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-node-border">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Output Connections
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {outputNodes.length > 0 ? (
                  <div className="space-y-2">
                    {outputNodes.map(({ edge, name, type }) => (
                      <div
                        key={edge.id}
                        className="p-3 bg-bg-primary rounded-md border border-node-border/50 hover:border-node-border transition-colors"
                      >
                        <div className="text-xs font-medium text-text-primary mb-1">
                          {name}
                        </div>
                        <div className="text-[10px] text-text-tertiary mb-2">
                          {type}
                        </div>
                        <div className="text-[10px] text-text-secondary font-mono">
                          {edge.source}
                          {edge.sourceHandle && ` [${edge.sourceHandle}]`}
                          {' → '}
                          {edge.target}
                          {edge.targetHandle && ` [${edge.targetHandle}]`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-secondary">
                    <p className="text-xs">No output connections</p>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      No downstream nodes connected
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
