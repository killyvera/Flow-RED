/**
 * Componente de Paleta de Nodos
 * 
 * Muestra una lista de nodos disponibles que se pueden arrastrar al canvas.
 * Incluye búsqueda, categorías y drag & drop.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { getAvailableNodes } from '@/api/client'
import { getNodeIcon } from '@/utils/nodeIcons'
import { useCanvasStore } from '@/state/canvasStore'
import type { NodeRedSubflowDefinition } from '@/api/types'
import { 
  Workflow, 
  ChevronDown, 
  ChevronRight,
  ArrowRight,
  Send,
  Code,
  Link2,
  Globe,
  Radio,
  Network,
  Wifi,
  GitBranch,
  FileCode,
  Database,
  Layout,
  Square,
  Box
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Lista de nodos comunes de Node-RED como fallback
 * cuando la API no está disponible
 */
function getDefaultNodes(): Array<{
  id: string
  type: string
  name: string
  category?: string
  module: string
  enabled: boolean
}> {
  return [
    // Layout nodes
    { id: 'group', type: 'group', name: 'Group', category: 'layout', module: 'node-red', enabled: true },
    
    // Input nodes
    { id: 'inject', type: 'inject', name: 'Inject', category: 'input', module: 'node-red', enabled: true },
    { id: 'catch', type: 'catch', name: 'Catch', category: 'input', module: 'node-red', enabled: true },
    { id: 'status', type: 'status', name: 'Status', category: 'input', module: 'node-red', enabled: true },
    
    // Output nodes
    { id: 'debug', type: 'debug', name: 'Debug', category: 'output', module: 'node-red', enabled: true },
    { id: 'complete', type: 'complete', name: 'Complete', category: 'output', module: 'node-red', enabled: true },
    
    // Function nodes
    { id: 'function', type: 'function', name: 'Function', category: 'function', module: 'node-red', enabled: true },
    { id: 'switch', type: 'switch', name: 'Switch', category: 'function', module: 'node-red', enabled: true },
    { id: 'change', type: 'change', name: 'Change', category: 'function', module: 'node-red', enabled: true },
    { id: 'template', type: 'template', name: 'Template', category: 'function', module: 'node-red', enabled: true },
    
    // Network nodes
    { id: 'http in', type: 'http in', name: 'HTTP In', category: 'network', module: 'node-red', enabled: true },
    { id: 'http out', type: 'http out', name: 'HTTP Out', category: 'network', module: 'node-red', enabled: true },
    { id: 'mqtt in', type: 'mqtt in', name: 'MQTT In', category: 'network', module: 'node-red', enabled: true },
    { id: 'mqtt out', type: 'mqtt out', name: 'MQTT Out', category: 'network', module: 'node-red', enabled: true },
    
    // Sequence nodes
    { id: 'delay', type: 'delay', name: 'Delay', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'trigger', type: 'trigger', name: 'Trigger', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'join', type: 'join', name: 'Join', category: 'sequence', module: 'node-red', enabled: true },
    { id: 'split', type: 'split', name: 'Split', category: 'sequence', module: 'node-red', enabled: true },
    
    // Parser nodes
    { id: 'json', type: 'json', name: 'JSON', category: 'parser', module: 'node-red', enabled: true },
    { id: 'xml', type: 'xml', name: 'XML', category: 'parser', module: 'node-red', enabled: true },
    { id: 'csv', type: 'csv', name: 'CSV', category: 'parser', module: 'node-red', enabled: true },
    { id: 'html', type: 'html', name: 'HTML', category: 'parser', module: 'node-red', enabled: true },
  ]
}

export interface NodePaletteProps {
  isOpen: boolean
  onClose: () => void
  onNodeDragStart?: (nodeType: string, event: React.DragEvent) => void
  onNodeClick?: (nodeType: string) => void
}

export function NodePalette({ isOpen, onClose, onNodeDragStart, onNodeClick }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [nodes, setNodes] = useState<Array<{
    id: string
    type: string
    name: string
    category?: string
    module: string
    enabled: boolean
    [key: string]: any
  }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isClosing, setIsClosing] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const hasLoadedRef = useRef(false) // Ref para evitar cargas duplicadas
  const paletteRef = useRef<HTMLDivElement>(null) // Ref para detectar clicks fuera
  
  // Obtener subflows desde el store
  const nodeRedNodes = useCanvasStore((state) => state.nodeRedNodes)
  const subflows = useMemo(() => {
    return nodeRedNodes.filter((n): n is NodeRedSubflowDefinition => 
      n.type === 'subflow' && !n.x && !n.y && !n.z
    )
  }, [nodeRedNodes])

  // Cargar nodos disponibles (solo una vez cuando se abre o cuando cambian los subflows)
  useEffect(() => {
    if (isOpen && nodes.length === 0 && !isLoading && !hasLoadedRef.current) {
      hasLoadedRef.current = true // Marcar como cargado
      setIsLoading(true)
      setError(null)
      
      console.log('🔄 Iniciando carga de nodos para la paleta...')
      
      // Intentar cargar desde la API primero
      getAvailableNodes()
        .then((availableNodes) => {
          
          if (availableNodes.length > 0) {
            console.log('✅ Nodos cargados desde la API:', availableNodes.length)
            
            // Verificar si "group" está en los nodos de la API
            const hasGroup = availableNodes.some(n => n.type === 'group')
            console.log('🔍 ¿Grupo está en nodos de API?', hasGroup)
            
            // Agregar "group" si no está presente (los grupos son especiales y pueden no estar en /nodes)
            if (!hasGroup) {
              console.log('➕ Agregando "group" a la lista de nodos disponibles')
              const groupNode = {
                id: 'group',
                type: 'group',
                name: 'Group',
                category: 'layout',
                module: 'node-red',
                enabled: true,
              }
              availableNodes.unshift(groupNode) // Agregar al inicio
            }
            
            // Agregar subflows disponibles a la paleta
            if (subflows.length > 0) {
              console.log('➕ Agregando subflows a la paleta:', subflows.length)
              const subflowNodes = subflows.map((subflow) => ({
                id: `subflow:${subflow.id}`,
                type: `subflow:${subflow.id}`, // Tipo de instancia de subflow
                name: subflow.name || subflow.label || `Subflow ${subflow.id.slice(0, 8)}`,
                category: 'subflows',
                module: 'node-red',
                enabled: true,
                subflowDefinition: subflow, // Guardar la definición para referencia
              }))
              availableNodes.push(...subflowNodes)
            }
            
            setNodes(availableNodes)
          } else {
            // Si no hay nodos disponibles desde la API, usar lista hardcodeada
            console.log('⚠️ No hay nodos desde la API, usando lista por defecto')
            const defaultNodes = getDefaultNodes()
            
            // Agregar subflows incluso si usamos lista por defecto
            if (subflows.length > 0) {
              const subflowNodes = subflows.map((subflow) => ({
                id: `subflow:${subflow.id}`,
                type: `subflow:${subflow.id}`,
                name: subflow.name || subflow.label || `Subflow ${subflow.id.slice(0, 8)}`,
                category: 'subflows',
                module: 'node-red',
                enabled: true,
                subflowDefinition: subflow,
              }))
              defaultNodes.push(...subflowNodes)
            }
            
            console.log('📦 Nodos por defecto cargados:', defaultNodes.length)
            setNodes(defaultNodes)
          }
        })
        .catch((err) => {
          // En caso de error, usar lista hardcodeada
          console.warn('⚠️ Error al cargar nodos desde la API, usando lista por defecto:', err.message)
          const defaultNodes = getDefaultNodes()
          
          // Agregar subflows incluso si hay error
          if (subflows.length > 0) {
            const subflowNodes = subflows.map((subflow) => ({
              id: `subflow:${subflow.id}`,
              type: `subflow:${subflow.id}`,
              name: subflow.name || subflow.label || `Subflow ${subflow.id.slice(0, 8)}`,
              category: 'subflows',
              module: 'node-red',
              enabled: true,
              subflowDefinition: subflow,
            }))
            defaultNodes.push(...subflowNodes)
          }
          
          console.log('📦 Nodos por defecto cargados:', defaultNodes.length)
          setNodes(defaultNodes)
        })
        .finally(() => setIsLoading(false))
    }
    
    // Resetear el ref cuando se cierra la paleta
    if (!isOpen) {
      hasLoadedRef.current = false
    }
  }, [isOpen, nodes.length, isLoading, subflows]) // Incluir subflows en dependencias

  // Controlar el renderizado basado en isOpen
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
    } else if (!isOpen && shouldRender && !isClosing) {
      // Si se cierra desde fuera (sin pasar por handleClose), iniciar animación
      setIsClosing(true)
      setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 300)
    }
  }, [isOpen, shouldRender, isClosing])

  // Función para manejar el cierre con animación
  const handleClose = () => {
    if (isClosing) return // Evitar múltiples llamadas
    setIsClosing(true)
    // Llamar a onClose inmediatamente para actualizar el estado del padre
    onClose()
    // Ocultar el componente después de que termine la animación
    setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
    }, 300) // Duración de la animación
  }

  // Detectar clicks fuera del componente para cerrarlo
  useEffect(() => {
    if (!isOpen || isClosing) return

    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    // Agregar listener después de un pequeño delay para evitar que se cierre inmediatamente al abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isClosing, handleClose])

  // Función para formatear nombres de subcategorías para mejor legibilidad
  const formatSubcategoryName = (subcategory: string): string => {
    const nameMap: Record<string, string> = {
      'in': 'Entrada',
      'out': 'Salida',
      'call': 'Llamada',
      'request': 'Petición',
      'response': 'Respuesta',
      'broker': 'Broker',
      'client': 'Cliente',
      'server': 'Servidor',
      // Formatos de parser
      'json': 'JSON',
      'xml': 'XML',
      'csv': 'CSV',
      'yaml': 'YAML',
      'html': 'HTML',
      'msgpack': 'MessagePack',
      'cbor': 'CBOR',
      'base64': 'Base64',
    }
    
    const lowerSubcategory = subcategory.toLowerCase()
    if (nameMap[lowerSubcategory]) {
      return nameMap[lowerSubcategory]
    }
    
    // Si es un formato conocido (solo letras mayúsculas), mantenerlo en mayúsculas
    if (/^[a-z]+$/.test(lowerSubcategory) && ['json', 'xml', 'csv', 'yaml', 'html'].includes(lowerSubcategory)) {
      return subcategory.toUpperCase()
    }
    
    return subcategory
  }

  // Función para obtener el icono de una categoría
  const getCategoryIcon = (category: string): LucideIcon => {
    const categoryMap: Record<string, LucideIcon> = {
      'input': ArrowRight,
      'output': Send,
      'function': Code,
      'link': Link2,
      'http': Globe,
      'mqtt': Radio,
      'tcp': Network,
      'udp': Wifi,
      'websocket': Wifi,
      'network': Network,
      'sequence': GitBranch,
      'parser': FileCode,
      'storage': Database,
      'database': Database,
      'layout': Layout,
      'dashboard': Square,
      'ui': Square,
      'subflows': Workflow,
      'Otros': Box,
      'otros': Box,
    }
    
    return categoryMap[category.toLowerCase()] || Box
  }

  // Función para obtener la descripción de una categoría
  const getCategoryDescription = (category: string): string => {
    const descriptionMap: Record<string, string> = {
      'input': 'Nodos que inician el flujo o reciben datos externos',
      'output': 'Nodos que finalizan el flujo o envían datos al exterior',
      'function': 'Nodos para procesar y transformar datos',
      'link': 'Nodos para conectar flujos no adyacentes',
      'http': 'Nodos para comunicación HTTP/REST',
      'mqtt': 'Nodos para protocolo MQTT',
      'tcp': 'Nodos para comunicación TCP',
      'udp': 'Nodos para comunicación UDP',
      'websocket': 'Nodos para comunicación WebSocket',
      'network': 'Nodos para comunicación de red',
      'sequence': 'Nodos para controlar el flujo y secuencia de mensajes',
      'parser': 'Nodos para parsear y formatear datos',
      'storage': 'Nodos para almacenamiento y bases de datos',
      'database': 'Nodos para bases de datos',
      'layout': 'Nodos para organizar y agrupar elementos',
      'dashboard': 'Nodos para interfaces de usuario y dashboards',
      'ui': 'Nodos para interfaces de usuario',
      'subflows': 'Subflujos reutilizables',
      'Otros': 'Otros nodos que no encajan en categorías específicas',
      'otros': 'Otros nodos que no encajan en categorías específicas',
    }
    
    return descriptionMap[category.toLowerCase()] || 'Nodos adicionales'
  }

  // Función para extraer categoría y subcategoría de un nodo
  const getNodeCategoryAndSubcategory = (nodeType: string, category?: string): { mainCategory: string; subcategory: string | null } => {
    const normalizedType = nodeType.toLowerCase().trim()
    const normalizedCategory = category?.toLowerCase() || ''
    
    // Patrones comunes para detectar subcategorías
    // link call, link in, link out
    if (normalizedType.startsWith('link ')) {
      const subcategory = normalizedType.replace('link ', '').trim()
      return { mainCategory: 'link', subcategory: subcategory || null }
    }
    
    // http in, http out, http request, etc.
    if (normalizedType.startsWith('http ')) {
      const subcategory = normalizedType.replace('http ', '').trim()
      return { mainCategory: 'http', subcategory: subcategory || null }
    }
    
    // mqtt in, mqtt out, mqtt broker, etc.
    if (normalizedType.startsWith('mqtt ')) {
      const subcategory = normalizedType.replace('mqtt ', '').trim()
      return { mainCategory: 'mqtt', subcategory: subcategory || null }
    }
    
    // tcp in, tcp out, etc.
    if (normalizedType.startsWith('tcp ')) {
      const subcategory = normalizedType.replace('tcp ', '').trim()
      return { mainCategory: 'tcp', subcategory: subcategory || null }
    }
    
    // udp in, udp out, etc.
    if (normalizedType.startsWith('udp ')) {
      const subcategory = normalizedType.replace('udp ', '').trim()
      return { mainCategory: 'udp', subcategory: subcategory || null }
    }
    
    // websocket in, websocket out, etc.
    if (normalizedType.startsWith('websocket ') || normalizedType.startsWith('ws ')) {
      const subcategory = normalizedType.replace(/^(websocket|ws) /, '').trim()
      return { mainCategory: 'websocket', subcategory: subcategory || null }
    }
    
    // Nodos de parser (JSON, XML, CSV, YAML, HTML, etc.)
    const parserFormats = ['json', 'xml', 'csv', 'yaml', 'html', 'msgpack', 'cbor', 'base64']
    
    // Verificar si es un formato de parser (exacto o que comience con el formato)
    const formatMatch = normalizedType.match(/^(json|xml|csv|yaml|html|msgpack|cbor|base64)(\s|$)/)
    const isParserFormat = formatMatch !== null || parserFormats.includes(normalizedType)
    
    if (isParserFormat || normalizedCategory === 'parser') {
      // Extraer el formato del tipo de nodo
      if (formatMatch) {
        return { mainCategory: 'parser', subcategory: formatMatch[1] }
      }
      // Si el tipo completo es un formato de parser
      if (parserFormats.includes(normalizedType)) {
        return { mainCategory: 'parser', subcategory: normalizedType }
      }
      // Si no se puede extraer el formato, usar el tipo completo como subcategoría
      return { mainCategory: 'parser', subcategory: normalizedType }
    }
    
    // Detectar categorías comunes basándose en el tipo o categoría
    // Input nodes
    if (normalizedCategory === 'input' || 
        normalizedType === 'inject' || 
        normalizedType === 'catch' || 
        normalizedType === 'status' ||
        normalizedType.includes('input')) {
      return { mainCategory: 'input', subcategory: null }
    }
    
    // Output nodes
    if (normalizedCategory === 'output' || 
        normalizedType === 'debug' || 
        normalizedType === 'complete' ||
        normalizedType.includes('output')) {
      return { mainCategory: 'output', subcategory: null }
    }
    
    // Function nodes
    if (normalizedCategory === 'function' || 
        normalizedType === 'function' || 
        normalizedType === 'switch' || 
        normalizedType === 'change' || 
        normalizedType === 'template' ||
        normalizedType === 'range' ||
        normalizedType.includes('function')) {
      return { mainCategory: 'function', subcategory: null }
    }
    
    // Sequence nodes
    if (normalizedCategory === 'sequence' || 
        normalizedType === 'delay' || 
        normalizedType === 'trigger' || 
        normalizedType === 'join' || 
        normalizedType === 'split' ||
        normalizedType.includes('sequence')) {
      return { mainCategory: 'sequence', subcategory: null }
    }
    
    // Layout nodes
    if (normalizedCategory === 'layout' || 
        normalizedType === 'group' ||
        normalizedType === 'tab') {
      return { mainCategory: 'layout', subcategory: null }
    }
    
    // Network nodes (genéricos)
    if (normalizedCategory === 'network' && 
        !normalizedType.startsWith('http') && 
        !normalizedType.startsWith('mqtt') && 
        !normalizedType.startsWith('tcp') && 
        !normalizedType.startsWith('udp') &&
        !normalizedType.startsWith('websocket') &&
        !normalizedType.startsWith('ws ')) {
      return { mainCategory: 'network', subcategory: null }
    }
    
    // Storage/Database nodes
    if (normalizedCategory === 'storage' || 
        normalizedCategory === 'database' ||
        normalizedType.includes('file') || 
        normalizedType.includes('mongodb') || 
        normalizedType.includes('mysql') || 
        normalizedType.includes('postgresql') ||
        normalizedType.includes('sqlite') ||
        normalizedType.includes('redis')) {
      return { mainCategory: 'storage', subcategory: null }
    }
    
    // Dashboard/UI nodes
    if (normalizedCategory === 'dashboard' || 
        normalizedCategory === 'ui' ||
        normalizedType.includes('dashboard') ||
        normalizedType.includes('ui_') ||
        normalizedType.startsWith('ui ')) {
      return { mainCategory: 'dashboard', subcategory: null }
    }
    
    // Subflows
    if (normalizedType.startsWith('subflow:') || normalizedCategory === 'subflows') {
      return { mainCategory: 'subflows', subcategory: null }
    }
    
    // Lista de categorías válidas conocidas
    const validCategories = [
      'input', 'output', 'function', 'link', 'http', 'mqtt', 'tcp', 'udp', 'websocket',
      'network', 'sequence', 'parser', 'storage', 'database', 'layout', 'dashboard', 'ui',
      'subflows', 'time', 'social', 'analysis', 'advanced'
    ]
    
    // Si tiene categoría, verificar si es válida
    if (category) {
      const normalizedCat = category.toLowerCase().trim()
      
      // Si la categoría es un número o parece un ID/índice, poner en "Otros"
      if (/^\d+$/.test(category.trim()) || category.trim().length <= 2) {
        return { mainCategory: 'Otros', subcategory: null }
      }
      
      // Si la categoría es válida, usarla
      if (validCategories.includes(normalizedCat)) {
        return { mainCategory: category, subcategory: null }
      }
      
      // Si la categoría no es válida pero parece un nombre legible, usarla
      // (puede ser una categoría personalizada de un módulo)
      if (normalizedCat.length > 2 && !/^\d+$/.test(normalizedCat)) {
        return { mainCategory: category, subcategory: null }
      }
    }
    
    // Si no se puede determinar, poner en "Otros"
    return { mainCategory: 'Otros', subcategory: null }
  }
  
  // Función para toggle de categoría expandida
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  // Filtrar nodos por búsqueda
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes
    
    const query = searchQuery.toLowerCase()
    return nodes.filter(node => 
      node.type.toLowerCase().includes(query) ||
      node.name.toLowerCase().includes(query) ||
      (node.category && node.category.toLowerCase().includes(query))
    )
  }, [nodes, searchQuery])

  // Agrupar nodos por categoría y subcategoría
  const nodesByCategoryAndSubcategory = useMemo(() => {
    // Estructura: { mainCategory: { subcategory: [nodes] } }
    const grouped: Record<string, Record<string, typeof nodes>> = {}
    
    filteredNodes.forEach(node => {
      let { mainCategory, subcategory } = getNodeCategoryAndSubcategory(node.type, node.category)
      
      // Normalizar "Otros" para que siempre tenga la primera letra mayúscula
      if (mainCategory.toLowerCase() === 'otros') {
        mainCategory = 'Otros'
      }
      
      // Si la categoría es numérica o parece un ID, forzar a "Otros"
      if (/^\d+$/.test(mainCategory.trim()) || (mainCategory.trim().length <= 2 && !['ui', 'ws'].includes(mainCategory.toLowerCase()))) {
        mainCategory = 'Otros'
      }
      
      if (!grouped[mainCategory]) {
        grouped[mainCategory] = {}
      }
      
      // Si no hay subcategoría, usar 'general' como clave
      const subcategoryKey = subcategory || 'general'
      
      if (!grouped[mainCategory][subcategoryKey]) {
        grouped[mainCategory][subcategoryKey] = []
      }
      
      grouped[mainCategory][subcategoryKey].push(node)
    })
    
    return grouped
  }, [filteredNodes])

  // No renderizar nada si no debe renderizarse
  if (!shouldRender) return null

  return (
    <>
      {/* Overlay/Backdrop visual - no bloquea eventos */}
      <div 
        className={`fixed inset-0 bg-black/20 z-40 pointer-events-none ${
          isClosing ? 'animate-[fadeOut_0.3s_ease-in]' : 'animate-[fadeIn_0.3s_ease-out]'
        }`}
        aria-hidden="true"
      />
      
      {/* Paleta de nodos - ahora en la derecha con animación de slide-in/out */}
      <div 
        ref={paletteRef}
        className={`fixed right-0 top-0 bottom-0 w-64 bg-bg-primary border-l border-node-border shadow-lg z-50 flex flex-col pointer-events-auto ${
          isClosing ? 'animate-[slideOutRight_0.3s_ease-in]' : 'animate-[slideInRight_0.3s_ease-out]'
        }`}
      >
          {/* Header - más compacto estilo n8n */}
          <div className="p-3 border-b border-node-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Paleta de Nodos</h2>
            <button
              onClick={handleClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              aria-label="Cerrar paleta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Búsqueda - más compacto */}
          <div className="p-3 border-b border-node-border">
            <input
              type="text"
              placeholder="Buscar nodos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-node-border rounded-md bg-bg-primary text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
            />
          </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-3 text-center text-text-secondary text-xs">
            Cargando nodos...
          </div>
        )}

        {error && (
          <div className="p-3 text-center text-status-error text-xs">
            {error}
          </div>
        )}

        {!isLoading && !error && Object.keys(nodesByCategoryAndSubcategory).length === 0 && (
          <div className="p-3 text-center text-text-secondary text-xs">
            No se encontraron nodos
          </div>
        )}

        {!isLoading && !error && Object.entries(nodesByCategoryAndSubcategory)
          .sort(([a], [b]) => {
            // Ordenar categorías: orden preferido primero, luego alfabéticamente
            const categoryOrder = ['input', 'output', 'function', 'link', 'http', 'mqtt', 'tcp', 'udp', 'websocket', 'network', 'sequence', 'parser', 'storage', 'layout', 'dashboard', 'subflows', 'Otros']
            const indexA = categoryOrder.indexOf(a)
            const indexB = categoryOrder.indexOf(b)
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB
            if (indexA !== -1) return -1
            if (indexB !== -1) return 1
            return a.localeCompare(b)
          })
          .map(([mainCategory, subcategories]) => {
            const isExpanded = expandedCategories.has(mainCategory)
            const totalNodes = Object.values(subcategories).reduce((sum, nodes) => sum + nodes.length, 0)
            
            return (
              <div key={mainCategory} className="mb-1">
                {/* Encabezado de categoría principal - clickeable para expandir/colapsar */}
                <button
                  onClick={() => toggleCategory(mainCategory)}
                  className="w-full px-3 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-[10px] font-semibold text-text-secondary uppercase grid grid-cols-[auto_1fr_auto] gap-2 transition-colors group"
                >
                  {/* Icono - ocupa 2 filas, centrado verticalmente */}
                  {(() => {
                    const CategoryIcon = getCategoryIcon(mainCategory)
                    return (
                      <CategoryIcon 
                        className="w-4 h-4 text-text-secondary group-hover:text-text-primary flex-shrink-0 transition-colors row-span-2 self-center" 
                        strokeWidth={2}
                      />
                    )
                  })()}
                  
                  {/* Título y descripción - ocupan 2 filas */}
                  <div className="flex flex-col items-start min-w-0 row-span-2">
                    <span className="truncate w-full text-left">{mainCategory}</span>
                    <span className="text-[9px] text-text-tertiary font-normal normal-case text-left w-full break-words leading-tight mt-0.5">
                      {getCategoryDescription(mainCategory)}
                    </span>
                  </div>
                  
                  {/* Contador y chevron - ocupan 2 filas, centrado verticalmente */}
                  <div className="flex items-center gap-2 flex-shrink-0 row-span-2 self-center">
                    <span className="text-[9px] text-text-tertiary font-normal">
                      ({totalNodes})
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                    )}
                  </div>
                </button>
                
                {/* Subcategorías - solo visible si está expandido */}
                {isExpanded && (
                  <div className="mt-1">
                    {Object.entries(subcategories)
                      .sort(([a], [b]) => {
                        // Ordenar: 'general' primero, luego alfabéticamente
                        if (a === 'general') return -1
                        if (b === 'general') return 1
                        return a.localeCompare(b)
                      })
                      .map(([subcategory, subcategoryNodes]) => (
                        <div key={`${mainCategory}-${subcategory}`} className="mb-2">
                          {/* Encabezado de subcategoría (solo si no es 'general' y hay más de una subcategoría) */}
                          {subcategory !== 'general' && Object.keys(subcategories).length > 1 && (
                            <div className="px-3 py-1 text-[10px] font-medium text-text-tertiary uppercase mt-1">
                              {formatSubcategoryName(subcategory)}
                            </div>
                          )}
                          
                          {/* Nodos de la subcategoría */}
                          <div className="space-y-1">
                            {subcategoryNodes.map((node, index) => (
                              <div
                                key={`${node.type}-${mainCategory}-${subcategory}-${index}`}
                                draggable
                                onDragStart={(e) => {
                                  if (onNodeDragStart) {
                                    onNodeDragStart(node.type, e)
                                  } else {
                                    // Default: pasar el tipo de nodo en dataTransfer
                                    e.dataTransfer.setData('application/reactflow', node.type)
                                    e.dataTransfer.effectAllowed = 'move'
                                  }
                                }}
                                onClick={() => {
                                  if (onNodeClick) {
                                    onNodeClick(node.type)
                                  }
                                }}
                                className="px-3 py-1.5 hover:bg-node-hover cursor-pointer transition-colors flex items-center gap-2"
                              >
                                {(() => {
                                  // Si es un subflow, usar icono de Workflow
                                  if (node.type.startsWith('subflow:')) {
                                    return (
                                      <Workflow 
                                        className="w-4 h-4 text-text-primary flex-shrink-0" 
                                        strokeWidth={2}
                                      />
                                    )
                                  }
                                  const IconComponent = getNodeIcon(node.type)
                                  return (
                                    <IconComponent 
                                      className="w-4 h-4 text-text-primary flex-shrink-0" 
                                      strokeWidth={2}
                                    />
                                  )
                                })()}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-text-primary truncate">
                                    {node.name || node.type}
                                  </div>
                                  {node.name !== node.type && (
                                    <div className="text-[10px] text-text-tertiary truncate">
                                      {node.type}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>
      </div>
    </>
  )
}

