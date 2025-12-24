/**
 * FunctionConfig Component
 * 
 * Configurador principal del nodo Function con sistema de tabs.
 * Orquesta todos los tabs de configuración y maneja el estado del nodo.
 */

import { useState } from 'react'
import { TabbedNodeEditor, type Tab } from '../../editors/TabbedNodeEditor'
import { CodeTab } from './tabs/CodeTab'
import { SettingsTab } from './tabs/SettingsTab'
import { LibrariesTab } from './tabs/LibrariesTab'
import { DebugTab } from './tabs/DebugTab'
import { Code, Settings, Package, Bug } from 'lucide-react'

export interface FunctionConfigProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function FunctionConfig({ nodeData, onNodeDataChange }: FunctionConfigProps) {
  const [activeTab, setActiveTab] = useState('code')

  // Definir tabs
  const tabs: Tab[] = [
    {
      id: 'code',
      label: 'Code',
      icon: Code,
      component: CodeTab,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      component: SettingsTab,
    },
    {
      id: 'libraries',
      label: 'Libraries',
      icon: Package,
      component: LibrariesTab,
    },
    {
      id: 'debug',
      label: 'Debug',
      icon: Bug,
      component: DebugTab,
    },
  ]

  return (
    <div className="function-config h-full">
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

