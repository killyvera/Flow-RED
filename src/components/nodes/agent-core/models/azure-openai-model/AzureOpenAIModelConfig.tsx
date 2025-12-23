import React from 'react'
import { TabbedNodeEditor, Tab } from '@/components/editors/TabbedNodeEditor'
import { ConnectionTab } from './tabs/ConnectionTab'
import { ParametersTab } from './tabs/ParametersTab'
import { ToolsPreviewTab } from './tabs/ToolsPreviewTab'
import { RuntimeTab } from './tabs/RuntimeTab'

export interface AzureOpenAIModelConfigProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

/**
 * Editor de configuración para el nodo Azure OpenAI Model
 * 
 * Este nodo representa SOLO un modelo de lenguaje que recibe prompts
 * del Agent Core y retorna respuestas JSON estrictas.
 */
export function AzureOpenAIModelConfig({ nodeData, onNodeDataChange }: AzureOpenAIModelConfigProps) {
  const tabs: Tab[] = [
    {
      id: 'connection',
      label: 'Connection',
      component: ConnectionTab,
    },
    {
      id: 'parameters',
      label: 'Parameters',
      component: ParametersTab,
    },
    {
      id: 'tools-preview',
      label: 'Tools Preview',
      component: ToolsPreviewTab,
    },
    {
      id: 'runtime',
      label: 'Runtime / Debug',
      component: RuntimeTab,
    },
  ]

  return (
    <TabbedNodeEditor
      tabs={tabs}
      nodeData={nodeData}
      onNodeDataChange={onNodeDataChange}
    />
  )
}

