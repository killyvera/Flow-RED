/**
 * HttpRequestConfig Component
 * 
 * Configurador principal del nodo HTTP Request con sistema de tabs.
 * Orquesta todos los tabs de configuración y maneja el estado del nodo.
 */

import { useState } from 'react'
import { TabbedNodeEditor, type Tab } from '../../editors/TabbedNodeEditor'
import { RequestTab } from './tabs/RequestTab'
import { HeadersTab } from './tabs/HeadersTab'
import { BodyTab } from './tabs/BodyTab'
import { AdvancedTab } from './tabs/AdvancedTab'
import { DebugTab } from './tabs/DebugTab'
import { Globe, List, FileText, Settings, Bug } from 'lucide-react'

export interface HttpRequestConfigProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function HttpRequestConfig({ nodeData, onNodeDataChange }: HttpRequestConfigProps) {
  const [activeTab, setActiveTab] = useState('request')

  // Definir tabs
  const tabs: Tab[] = [
    {
      id: 'request',
      label: 'Request',
      icon: Globe,
      component: RequestTab,
    },
    {
      id: 'headers',
      label: 'Headers',
      icon: List,
      component: HeadersTab,
    },
    {
      id: 'body',
      label: 'Body',
      icon: FileText,
      component: BodyTab,
      // Solo visible para POST, PUT, PATCH
      visible: (data: any) => ['POST', 'PUT', 'PATCH'].includes(data.method),
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: Settings,
      component: AdvancedTab,
    },
    {
      id: 'debug',
      label: 'Debug',
      icon: Bug,
      component: DebugTab,
    },
  ]

  return (
    <div className="http-request-config h-full">
      <TabbedNodeEditor
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        nodeData={nodeData}
        onNodeDataChange={onNodeDataChange}
      />
    </div>
  )
}
