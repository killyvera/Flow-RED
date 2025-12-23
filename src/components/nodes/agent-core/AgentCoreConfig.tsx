/**
 * Agent Core Node - Configuration Editor
 * 
 * Editor personalizado para el nodo agent-core con 5 tabs:
 * - Strategy: Configuración de estrategia REACT
 * - Tools: Lista de herramientas permitidas
 * - Stop Conditions: Condiciones de parada
 * - Model: Template de prompt
 * - Debug: Opciones de debugging
 */

import React, { useState } from 'react'
import { TabbedNodeEditor, type Tab } from '@/components/editors/TabbedNodeEditor'
import { StrategyTab } from './tabs/StrategyTab'
import { ToolsTab } from './tabs/ToolsTab'
import { StopConditionsTab } from './tabs/StopConditionsTab'
import { ModelTab } from './tabs/ModelTab'
import { DebugTab } from './tabs/DebugTab'

export interface AgentCoreConfigProps {
  nodeData: any
  onChange: (data: any) => void
}

export function AgentCoreConfig({ nodeData, onChange }: AgentCoreConfigProps) {
  const tabs: Tab[] = [
    {
      id: 'strategy',
      label: 'Strategy',
      component: StrategyTab
    },
    {
      id: 'tools',
      label: 'Tools',
      component: ToolsTab
    },
    {
      id: 'conditions',
      label: 'Stop Conditions',
      component: StopConditionsTab
    },
    {
      id: 'model',
      label: 'Model',
      component: ModelTab
    },
    {
      id: 'debug',
      label: 'Debug',
      component: DebugTab
    }
  ]

  return (
    <TabbedNodeEditor
      tabs={tabs}
      nodeData={nodeData}
      onNodeDataChange={onChange}
    />
  )
}

