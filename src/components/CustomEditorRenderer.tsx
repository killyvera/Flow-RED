/**
 * CustomEditorRenderer Component
 * 
 * Registry de editores custom por tipo de nodo.
 * Permite renderizar configuradores personalizados para nodos específicos
 * en lugar del formulario genérico de campos.
 */

import { HttpRequestConfig } from './nodes/http-request/HttpRequestConfig'
import { AgentCoreConfig } from './nodes/agent-core/AgentCoreConfig'
import { AzureOpenAIModelConfig } from './nodes/agent-core/models/azure-openai-model/AzureOpenAIModelConfig'

// Registro de componentes custom por tipo de nodo
const CUSTOM_EDITORS: Record<string, React.ComponentType<any>> = {
  'http request': HttpRequestConfig,
  'agent-core': AgentCoreConfig,
  'model.azure.openai': AzureOpenAIModelConfig,
  // Future custom editors:
  // 'mqtt in': MqttInConfig,
  // 'mqtt out': MqttOutConfig,
  // 'websocket in': WebSocketInConfig,
  // etc.
}

export interface CustomEditorRendererProps {
  nodeType: string
  nodeData: any
  onChange: (data: any) => void
}

/**
 * Renderizar el editor custom para un tipo de nodo,
 * o retornar null si no hay editor custom disponible.
 */
export function CustomEditorRenderer({
  nodeType,
  nodeData,
  onChange,
}: CustomEditorRendererProps) {
  const EditorComponent = CUSTOM_EDITORS[nodeType]

  if (!EditorComponent) {
    return null
  }

  return (
    <EditorComponent
      nodeData={nodeData}
      onNodeDataChange={onChange}
    />
  )
}

/**
 * Verificar si un tipo de nodo tiene un editor custom
 */
export function hasCustomEditor(nodeType: string): boolean {
  return nodeType in CUSTOM_EDITORS
}

/**
 * Obtener la lista de tipos de nodo con editores custom
 */
export function getCustomEditorTypes(): string[] {
  return Object.keys(CUSTOM_EDITORS)
}
