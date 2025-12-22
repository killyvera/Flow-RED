/**
 * Tipos TypeScript para nodos personalizados de React Flow
 * 
 * Define las interfaces y tipos para los custom nodes del editor visual.
 */

import type { Node, NodeProps } from 'reactflow'
import type { LucideIcon } from 'lucide-react'

/**
 * Data que contiene información del nodo de Node-RED
 */
export interface BaseNodeData {
  /** Label/título del nodo */
  label: string
  /** Tipo original de Node-RED */
  nodeRedType: string
  /** ID del flow al que pertenece */
  flowId?: string
  /** Nombre del nodo en Node-RED */
  nodeRedName?: string
  /** Información completa del nodo original (opcional) */
  nodeRedNode?: any
  /** Contenido adicional del body (opcional) */
  bodyContent?: React.ReactNode
  /** Color de acento para el header (opcional) */
  headerColor?: string
  /** Icono Lucide React o string (legacy) para mostrar en el header (opcional) */
  icon?: LucideIcon | string
  /** Número de puertos de salida (para renderizar handles dinámicamente) */
  outputPortsCount?: number
  /** Handler de click personalizado para el nodo completo (opcional) */
  onNodeClick?: (e: React.MouseEvent) => void | Promise<void>
  /** Handler de click específico para el icono (opcional) */
  onIconClick?: (e: React.MouseEvent) => void | Promise<void>
}

/**
 * Props del componente BaseNode
 */
export type BaseNodeProps = NodeProps<Node<BaseNodeData>>

/**
 * Estado del nodo (para estilos)
 */
export type NodeState = 'default' | 'hover' | 'selected'

