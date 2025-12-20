/**
 * Sistema de iconos por tipo de nodo de Node-RED usando Lucide React
 * 
 * Mapea tipos de nodos de Node-RED a componentes de iconos de Lucide React.
 */

import {
  // Iconos básicos existentes
  Play,
  Bug,
  Code,
  FileText,
  GitBranch,
  RefreshCw,
  BarChart3,
  Globe,
  Send,
  Radio,
  Wifi,
  FolderOpen,
  Save,
  File,
  Plug,
  Network,
  Link,
  Database,
  Mail,
  Clock,
  Timer,
  Shield,
  Activity,
  CheckCircle2,
  Circle,
  // Iconos de entrada/salida
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Download,
  Upload,
  // Iconos de procesamiento
  Zap,
  Settings,
  Filter,
  Search,
  Wrench,
  Cog,
  // Iconos de datos
  Table,
  FileJson,
  FileCode,
  Braces,
  Hash,
  Lock,
  // Iconos de red
  Server,
  Cloud,
  // Iconos de tiempo
  Calendar,
  AlarmClock,
  // Iconos de lógica
  GitMerge,
  Workflow,
  ArrowUpDown,
  // Iconos genéricos
  Box,
  Package,
  Layers,
  Grid,
  List,
  // Iconos de UI
  MessageSquare,
  Bell,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Type,
  Keyboard,
  ChevronDown,
  Gauge,
  LineChart,
  Square,
  type LucideIcon,
} from 'lucide-react'

/**
 * Mapeo de tipos de Node-RED a componentes de iconos de Lucide
 */
const nodeIconMap: Record<string, LucideIcon> = {
  // Input Nodes
  inject: Play,
  catch: Shield,
  status: Activity,
  'link in': ArrowRight,
  comment: MessageSquare,
  
  // Output Nodes
  debug: Bug,
  complete: CheckCircle2,
  'link out': ArrowRight,
  notify: Bell,
  
  // Function Nodes
  function: Code,
  template: FileText,
  switch: GitBranch,
  change: RefreshCw,
  range: BarChart3,
  json: FileJson,
  xml: FileCode,
  html: FileCode,
  yaml: FileCode,
  csv: Table,
  base64: Hash,
  buffer: Package,
  
  // Network Nodes
  'http in': Globe,
  'http out': Send,
  'http request': Download,
  'http response': Globe,
  'mqtt in': Wifi,
  'mqtt out': Wifi,
  'mqtt-broker': Network,
  tcp: Plug,
  udp: Radio,
  websocket: Link,
  
  // File Nodes
  'file in': FolderOpen,
  'file out': Save,
  'file': File,
  
  // Database Nodes
  mongodb: Database,
  mysql: Database,
  postgresql: Database,
  
  // Time Nodes
  delay: Clock,
  trigger: Timer,
  
  // Sequence Nodes
  join: GitMerge,
  split: GitBranch,
  batch: Package,
  sort: ArrowUpDown,
  
  // Parser Nodes (ya incluidos en Function, pero específicos)
  'json parser': FileJson,
  'xml parser': FileCode,
  'yaml parser': FileCode,
  'csv parser': Table,
  'html parser': FileCode,
  
  // Storage Nodes
  storage: Database,
  
  // Social/APIs
  twitter: Send,
  email: Mail,
  
  // Dashboard UI Nodes
  'ui_button': Square,
  'ui_switch': ToggleLeft,
  'ui_slider': SlidersHorizontal,
  'ui_text_input': Keyboard,
  'ui_dropdown': ChevronDown,
  'ui_gauge': Gauge,
  'ui_chart': BarChart3,
  'ui_numeric': Type,
  'ui_checkbox': Square,
  'ui_radio': Circle,
  'ui_date_picker': Calendar,
  'ui_colour_picker': Settings,
  'ui_form': FileText,
  'ui_notification': Bell,
  'ui_template': FileCode,
  'ui_tab': Layers,
  'ui_group': Grid,
  
  // Subflow y Group
  subflow: Workflow,
  group: Grid,
  tab: Layers,
  
  // Otros nodos comunes
  rbe: Filter,
  smooth: Activity,
  random: Zap,
  report: BarChart3,
  exec: Code,
  terminal: Code,
  
  // Default (último recurso)
  default: Box,
}

/**
 * Mapeo de categorías a iconos genéricos (fallback)
 */
const categoryIconMap: Record<string, LucideIcon> = {
  input: ArrowRight,
  output: Send,
  function: Code,
  network: Globe,
  storage: Database,
  time: Clock,
  parser: FileCode,
  sequence: GitBranch,
  dashboard: Square,
  ui: Square,
}

/**
 * Detecta la categoría de un nodo basándose en su tipo
 */
function detectNodeCategory(nodeType: string): string | null {
  const normalized = nodeType.toLowerCase()
  
  // Input nodes
  if (normalized.includes('inject') || normalized.includes('catch') || 
      normalized.includes('status') || normalized.includes('link in') ||
      normalized.includes('input')) {
    return 'input'
  }
  
  // Output nodes
  if (normalized.includes('debug') || normalized.includes('complete') ||
      normalized.includes('link out') || normalized.includes('notify') ||
      normalized.includes('output')) {
    return 'output'
  }
  
  // Network nodes
  if (normalized.includes('http') || normalized.includes('mqtt') ||
      normalized.includes('tcp') || normalized.includes('udp') ||
      normalized.includes('websocket') || normalized.includes('network')) {
    return 'network'
  }
  
  // Storage/Database nodes
  if (normalized.includes('file') || normalized.includes('mongodb') ||
      normalized.includes('mysql') || normalized.includes('postgresql') ||
      normalized.includes('database') || normalized.includes('storage')) {
    return 'storage'
  }
  
  // Time nodes
  if (normalized.includes('delay') || normalized.includes('trigger') ||
      normalized.includes('time') || normalized.includes('timer') ||
      normalized.includes('clock')) {
    return 'time'
  }
  
  // Parser nodes
  if (normalized.includes('json') || normalized.includes('xml') ||
      normalized.includes('yaml') || normalized.includes('csv') ||
      normalized.includes('html') || normalized.includes('parser')) {
    return 'parser'
  }
  
  // Sequence nodes
  if (normalized.includes('join') || normalized.includes('split') ||
      normalized.includes('batch') || normalized.includes('sort') ||
      normalized.includes('sequence')) {
    return 'sequence'
  }
  
  // Dashboard/UI nodes
  if (normalized.includes('ui_') || normalized.includes('dashboard')) {
    return 'ui'
  }
  
  // Function nodes (por defecto para procesamiento)
  if (normalized.includes('function') || normalized.includes('template') ||
      normalized.includes('switch') || normalized.includes('change') ||
      normalized.includes('code') || normalized.includes('process')) {
    return 'function'
  }
  
  return null
}

/**
 * Obtiene el componente de icono para un tipo de nodo de Node-RED
 * 
 * @param nodeType Tipo del nodo (ej: "inject", "debug", "http in")
 * @returns Componente de icono de Lucide o icono por defecto
 */
export function getNodeIcon(nodeType: string | undefined): LucideIcon {
  if (!nodeType) return nodeIconMap.default
  
  const normalizedType = nodeType.toLowerCase()
  
  // 1. Buscar coincidencia exacta
  if (nodeIconMap[normalizedType]) {
    return nodeIconMap[normalizedType]
  }
  
  // 2. Buscar coincidencia parcial (para tipos como "http in" vs "http-in")
  const normalizedSearch = normalizedType.replace(/[_\s-]/g, ' ')
  for (const [key, icon] of Object.entries(nodeIconMap)) {
    const normalizedKey = key.replace(/[_\s-]/g, ' ')
    if (normalizedKey === normalizedSearch) {
      return icon
    }
  }
  
  // 3. Buscar por palabras clave específicas en el nombre
  const keywords: Array<[string[], LucideIcon]> = [
    [['json'], FileJson],
    [['xml'], FileCode],
    [['yaml'], FileCode],
    [['csv'], Table],
    [['html'], FileCode],
    [['http'], Globe],
    [['mqtt'], Wifi],
    [['tcp'], Plug],
    [['udp'], Radio],
    [['websocket'], Link],
    [['file'], File],
    [['database', 'db'], Database],
    [['mongodb'], Database],
    [['mysql'], Database],
    [['postgresql'], Database],
    [['delay'], Clock],
    [['trigger'], Timer],
    [['inject'], Play],
    [['debug'], Bug],
    [['function'], Code],
    [['template'], FileText],
    [['switch'], GitBranch],
    [['change'], RefreshCw],
    [['join'], GitMerge],
    [['split'], GitBranch],
    [['batch'], Package],
    [['sort'], ArrowUpDown],
    [['button'], Square],
    [['slider'], SlidersHorizontal],
    [['gauge'], Gauge],
    [['chart'], BarChart3],
    [['input', 'text_input'], Keyboard],
    [['dropdown'], ChevronDown],
    [['switch', 'toggle'], ToggleLeft],
  ]
  
  for (const [keywordList, icon] of keywords) {
    if (keywordList.some(keyword => normalizedSearch.includes(keyword))) {
      return icon
    }
  }
  
  // 4. Buscar por prefijo (ej: "mqtt" para "mqtt in" o "mqtt out")
  const prefix = normalizedSearch.split(' ')[0]
  for (const [key, icon] of Object.entries(nodeIconMap)) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      return icon
    }
  }
  
  // 5. Buscar por categoría
  const category = detectNodeCategory(normalizedType)
  if (category && categoryIconMap[category]) {
    return categoryIconMap[category]
  }
  
  // 6. Último recurso: usar Box en lugar de Circle para ser más visible
  return nodeIconMap.default
}

/**
 * Registra un icono personalizado para un tipo de nodo
 * 
 * @param nodeType Tipo del nodo
 * @param icon Componente de icono de Lucide
 */
export function registerNodeIcon(nodeType: string, icon: LucideIcon): void {
  nodeIconMap[nodeType.toLowerCase()] = icon
}

