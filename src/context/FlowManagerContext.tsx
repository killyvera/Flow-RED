/**
 * Contexto para comunicar el Sidebar con el FlowManager
 */

import { createContext, useContext, useState, useCallback } from 'react'
import type { NodeRedNode } from '@/api/types'

interface FlowManagerContextType {
  isFlowManagerOpen: boolean
  openFlowManager: () => void
  closeFlowManager: () => void
  // Props para FlowManager
  flows: NodeRedNode[]
  activeFlowId: string | null
  allNodes: NodeRedNode[]
  isLoading: boolean
  onSelectFlow: ((flowId: string) => void) | undefined
  onCreateFlow: ((name: string) => Promise<{ id: string }>) | undefined
  onEditFlow: ((flowId: string) => void) | undefined
  onDuplicateFlow: ((flowId: string) => void) | undefined
  onDeleteFlow: ((flowId: string) => Promise<void>) | undefined
  onImportFlow: ((json: string | object, options?: { name?: string }) => Promise<void>) | undefined
  onConvertToSubflow: ((flowId: string) => Promise<void>) | undefined
  reloadFlows: (() => Promise<void>) | undefined
  setFlowManagerProps: (props: Partial<Omit<FlowManagerContextType, 'isFlowManagerOpen' | 'openFlowManager' | 'closeFlowManager' | 'setFlowManagerProps'>>) => void
}

const FlowManagerContext = createContext<FlowManagerContextType | undefined>(undefined)

export function FlowManagerProvider({ children }: { children: React.ReactNode }) {
  const [isFlowManagerOpen, setIsFlowManagerOpen] = useState(false)
  const [props, setProps] = useState<Omit<FlowManagerContextType, 'isFlowManagerOpen' | 'openFlowManager' | 'closeFlowManager' | 'setFlowManagerProps'>>({
    flows: [],
    activeFlowId: null,
    allNodes: [],
    isLoading: false,
    onSelectFlow: undefined,
    onCreateFlow: undefined,
    onEditFlow: undefined,
    onDuplicateFlow: undefined,
    onDeleteFlow: undefined,
    onImportFlow: undefined,
    onConvertToSubflow: undefined,
    reloadFlows: undefined,
  })

  const openFlowManager = useCallback(() => {
    setIsFlowManagerOpen(true)
  }, [])

  const closeFlowManager = useCallback(() => {
    setIsFlowManagerOpen(false)
  }, [])

  const setFlowManagerProps = useCallback((newProps: Partial<typeof props>) => {
    setProps(prev => ({ ...prev, ...newProps }))
  }, [])

  return (
    <FlowManagerContext.Provider value={{ 
      isFlowManagerOpen, 
      openFlowManager, 
      closeFlowManager,
      ...props,
      setFlowManagerProps,
    }}>
      {children}
    </FlowManagerContext.Provider>
  )
}

export function useFlowManager() {
  const context = useContext(FlowManagerContext)
  if (context === undefined) {
    throw new Error('useFlowManager debe ser usado dentro de un FlowManagerProvider')
  }
  return context
}

