/**
 * Panel de Propiedades de Nodo (Inspector Moderno)
 * 
 * Sidebar moderno similar a n8n/Flowise que muestra y permite editar
 * las propiedades del nodo seleccionado de forma dinámica basándose
 * en el schema de Node-RED.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Node } from 'reactflow'
import { X, Loader2, Info, Settings, Activity } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'
import { getRuntimeStateColor } from '@/utils/runtimeStatusMapper'
import { getNodeDefinition } from '@/api/nodeDefinition'
import { parseNodeSchema, type NodeSchema, type PropertyDefinition } from '@/utils/nodeSchema'
import { getKnownNodeProperties } from '@/utils/nodeDefaults'
import { shouldNodeHaveEditableProperties, getNoPropertiesMessage } from '@/utils/nodeTypesInfo'
import { TextField, NumberField, SelectField, BooleanField, JSONField, TypedInputField } from './fields'

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
          defaultType={prop.defaultType || 'str'}
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
  
  // Edges conectados al nodo (input/output)
  const edges = useCanvasStore((state) => state.edges)
  const inputEdges = useMemo(() => {
    if (!node?.id) return []
    return edges.filter(e => e.target === node.id)
  }, [edges, node?.id])
  
  const outputEdges = useMemo(() => {
    if (!node?.id) return []
    return edges.filter(e => e.source === node.id)
  }, [edges, node?.id])
  
  // Nodos conectados
  const nodes = useCanvasStore((state) => state.nodes)
  const inputNodes = useMemo(() => {
    return inputEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      return {
        edge,
        node: sourceNode,
        nodeName: sourceNode?.data?.label || sourceNode?.data?.nodeRedType || edge.source
      }
    })
  }, [inputEdges, nodes])
  
  const outputNodes = useMemo(() => {
    return outputEdges.map(edge => {
      const targetNode = nodes.find(n => n.id === edge.target)
      return {
        edge,
        node: targetNode,
        nodeName: targetNode?.data?.label || targetNode?.data?.nodeRedType || edge.target
      }
    })
  }, [outputEdges, nodes])

  // Pestañas del panel - si no está en modo edición, solo mostrar estado
  const [activeTab, setActiveTab] = useState<'config' | 'status'>(
    isEditMode ? 'config' : 'status'
  )
  
  // Si no está en modo edición, forzar pestaña de estado
  useEffect(() => {
    if (!isEditMode) {
      setActiveTab('status')
    }
  }, [isEditMode])

  // Return temprano DESPUÉS de todos los hooks
  if (!isOpen || !node) return null

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-bg-primary border-l border-node-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-node-border flex-shrink-0">
        <div className="p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {nodeName}
            </h2>
            <p className="text-xs text-text-tertiary truncate mt-0.5">
              {nodeType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 -mr-1 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            aria-label="Cerrar panel"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        
        {/* Pestañas - solo mostrar si hay más de una pestaña disponible */}
        {(isEditMode || activeTab === 'status') && (
          <div className="flex border-t border-node-border">
            {isEditMode && (
              <button
                onClick={() => setActiveTab('config')}
                className={`
                  flex-1 px-3 py-2 text-xs font-medium transition-colors
                  flex items-center justify-center gap-1.5
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
                  ${activeTab === 'config'
                    ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  }
                `}
              >
                <Settings className="w-3.5 h-3.5" />
                Configuración
              </button>
            )}
            <button
              onClick={() => setActiveTab('status')}
                className={`
                ${isEditMode ? 'flex-1' : 'w-full'} px-3 py-2 text-xs font-medium transition-colors
                flex items-center justify-center gap-1.5 relative
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
                ${activeTab === 'status'
                  ? 'bg-bg-secondary text-text-primary border-b-2 border-accent-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }
              `}
            >
              <Activity className="w-3.5 h-3.5" />
              Estado
              {runtimeStateColor && (
                <span
                  className="absolute top-1.5 right-2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: runtimeStateColor }}
                />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'config' ? (
          isLoadingSchema ? (
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
        ) : (
          /* Pestaña de Estado */
          <div className="p-3 space-y-4">
            {/* Estado actual del nodo */}
            <div className="space-y-2 pb-3 border-b border-node-border">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Estado de Runtime
              </h3>
              
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Estado Actual
                  </label>
                  <div className="flex items-center gap-2">
                    {runtimeStateColor ? (
                      <>
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: runtimeStateColor }}
                        />
                        <span className="text-xs font-medium text-text-primary capitalize">
                          {runtimeState === 'running' ? 'Ejecutando' :
                           runtimeState === 'error' ? 'Error' :
                           runtimeState === 'warning' ? 'Advertencia' :
                           'Inactivo'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-text-tertiary">Sin estado activo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Input/Output Connections (estilo n8n) */}
            <div className="space-y-3 pb-3 border-b border-node-border">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Conexiones
              </h3>
              
              {/* Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  Input ({inputEdges.length})
                </label>
                {inputEdges.length > 0 ? (
                  <div className="space-y-1">
                    {inputNodes.map(({ edge, nodeName }) => (
                      <div
                        key={edge.id}
                        className="px-2 py-1.5 bg-bg-secondary rounded text-[11px] text-text-secondary border border-node-border/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-medium text-text-primary truncate">{nodeName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-tertiary px-2">Sin conexiones de entrada</p>
                )}
              </div>
              
              {/* Output */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-secondary">
                  Output ({outputEdges.length})
                </label>
                {outputEdges.length > 0 ? (
                  <div className="space-y-1">
                    {outputNodes.map(({ edge, nodeName }) => (
                      <div
                        key={edge.id}
                        className="px-2 py-1.5 bg-bg-secondary rounded text-[11px] text-text-secondary border border-node-border/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-medium text-text-primary truncate">{nodeName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-tertiary px-2">Sin conexiones de salida</p>
                )}
              </div>
            </div>

            {/* Último Payload (estilo n8n) */}
            {lastLogWithData && lastLogWithData.data && (
              <div className="space-y-2 pb-3 border-b border-node-border">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Último Payload
                </h3>
                <div className="bg-bg-secondary rounded-md p-2 border border-node-border/50">
                  <pre className="text-[10px] text-text-secondary overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(lastLogWithData.data, null, 2)}
                  </pre>
                </div>
                <p className="text-[10px] text-text-tertiary">
                  {new Date(lastLogWithData.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {/* Logs de ejecución */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Logs de Ejecución
                </h3>
                <span className="text-xs text-text-tertiary">
                  {nodeLogs.length} {nodeLogs.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              
              {nodeLogs.length > 0 ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {nodeLogs.map((log, index) => {
                    if (index === 0) {
                      console.log('📋 [NodePropertiesPanel] Mostrando primer log:', {
                        logId: log.id,
                        nodeId: log.nodeId,
                        message: log.message?.substring(0, 50),
                        hasData: !!log.data
                      })
                    }
                    const getLogColor = (level: string) => {
                      switch (level) {
                        case 'error': return { text: 'text-red-500', border: 'border-red-500' }
                        case 'warn': return { text: 'text-yellow-500', border: 'border-yellow-500' }
                        case 'success': return { text: 'text-green-500', border: 'border-green-500' }
                        default: return { text: 'text-blue-500', border: 'border-blue-500' }
                      }
                    }
                    
                    const colors = getLogColor(log.level)
                    
                    return (
                      <div
                        key={log.id}
                        className={`p-2 bg-bg-secondary rounded-md text-xs border-l-2 ${colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${colors.text}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-text-tertiary text-[10px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-text-secondary text-[11px] mb-1">{log.message}</p>
                        {log.data && (
                          <details className="mt-1">
                            <summary className="text-[10px] text-text-tertiary cursor-pointer hover:text-text-secondary">
                              Ver payload
                            </summary>
                            <pre className="mt-1 p-1.5 bg-bg-tertiary rounded text-[10px] text-text-secondary overflow-x-auto max-h-32 overflow-y-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.duration !== undefined && (
                          <p className="text-text-tertiary text-[10px] mt-1">
                            Duración: {log.duration}ms
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-text-tertiary text-xs">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay logs de ejecución aún</p>
                  <p className="text-[10px] mt-1 opacity-75">
                    Los logs aparecerán cuando el nodo se ejecute
                  </p>
                  {/* Debug info */}
                  {executionLogs.length > 0 && (
                    <div className="mt-3 p-2 bg-bg-secondary rounded text-[9px] text-left border border-node-border/50">
                      <p className="font-medium mb-1 text-text-secondary">Debug Info:</p>
                      <p className="text-text-tertiary">Total logs en store: {executionLogs.length}</p>
                      <p className="text-text-tertiary">Node ID buscado: {node?.id}</p>
                      <p className="text-text-tertiary">Logs de otros nodos: {executionLogs.filter(l => l.nodeId !== node?.id).length}</p>
                      {executionLogs.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-text-tertiary hover:text-text-secondary">
                            Ver primeros logs (últimos 3)
                          </summary>
                          <pre className="mt-1 text-[8px] overflow-x-auto text-text-tertiary">
                            {JSON.stringify(executionLogs.slice(0, 3).map(l => ({
                              nodeId: l.nodeId,
                              nodeName: l.nodeName,
                              message: l.message?.substring(0, 40)
                            })), null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
