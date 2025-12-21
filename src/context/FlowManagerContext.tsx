/**
 * Contexto para comunicar el Sidebar con el FlowManager
 */

import { createContext, useContext, useState, useCallback } from 'react'

interface FlowManagerContextType {
  isFlowManagerOpen: boolean
  openFlowManager: () => void
  closeFlowManager: () => void
}

const FlowManagerContext = createContext<FlowManagerContextType | undefined>(undefined)

export function FlowManagerProvider({ children }: { children: React.ReactNode }) {
  const [isFlowManagerOpen, setIsFlowManagerOpen] = useState(false)

  const openFlowManager = useCallback(() => {
    setIsFlowManagerOpen(true)
  }, [])

  const closeFlowManager = useCallback(() => {
    setIsFlowManagerOpen(false)
  }, [])

  return (
    <FlowManagerContext.Provider value={{ isFlowManagerOpen, openFlowManager, closeFlowManager }}>
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

