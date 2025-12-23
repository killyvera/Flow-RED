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
  const [activeTab, setActiveTab] = useState('strategy')

  const tabs: Tab[] = [
    {
      id: 'strategy',
      label: 'Strategy',
      icon: 'Settings'
    },
    {
      id: 'tools',
      label: 'Tools'
    },
    {
      id: 'conditions',
      label: 'Stop Conditions'
    },
    {
      id: 'model',
      label: 'Model'
    },
    {
      id: 'debug',
      label: 'Debug'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'strategy':
        return <StrategyTab nodeData={nodeData} onChange={onChange} />
      case 'tools':
        return <ToolsTab nodeData={nodeData} onChange={onChange} />
      case 'conditions':
        return <StopConditionsTab nodeData={nodeData} onChange={onChange} />
      case 'model':
        return <ModelTab nodeData={nodeData} onChange={onChange} />
      case 'debug':
        return <DebugTab nodeData={nodeData} onChange={onChange} />
      default:
        return null
    }
  }

  return (
    <TabbedNodeEditor
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderTabContent()}
    </TabbedNodeEditor>
  )
}

