/**
 * PerfReadout - Componente para mostrar métricas de performance (dev-only)
 * 
 * Muestra:
 * - Nodes count
 * - Edges count
 * - Queue size (backpressure)
 * - Render time
 * - Events/sec
 * 
 * Solo visible en modo desarrollo.
 */

import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/state/canvasStore'
import { getPerformanceMonitor } from '@/utils/performance'

export function PerfReadout() {
  // Solo mostrar en dev mode
  if (!import.meta.env.DEV) {
    return null
  }

  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const queueSize = useCanvasStore((state) => state.wsEventQueueSize)
  
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    eventProcessingRate: 0,
    nodeCount: 0,
    edgeCount: 0,
    queueSize: 0,
  })

  useEffect(() => {
    const monitor = getPerformanceMonitor()
    
    // Actualizar métricas cada segundo
    const interval = setInterval(() => {
      const newMetrics = monitor.getMetrics(
        nodes.length,
        edges.length,
        queueSize
      )
      
      setMetrics(newMetrics)
    }, 1000)

    return () => clearInterval(interval)
  }, [nodes.length, edges.length, queueSize])

  return (
    <div className="fixed top-4 right-4 bg-bg-secondary/90 backdrop-blur-sm border border-node-border rounded-md p-2 text-xs font-mono z-50 shadow-lg">
      <div className="text-[10px] font-semibold text-text-secondary mb-1.5 border-b border-node-border pb-1">
        Performance
      </div>
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-text-tertiary">Nodes:</span>
          <span className="text-text-primary font-medium">{metrics.nodeCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-tertiary">Edges:</span>
          <span className="text-text-primary font-medium">{metrics.edgeCount}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-tertiary">Queue:</span>
          <span className={`font-medium ${metrics.queueSize > 500 ? 'text-status-error' : metrics.queueSize > 200 ? 'text-status-warning' : 'text-text-primary'}`}>
            {metrics.queueSize}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-tertiary">Render:</span>
          <span className={`font-medium ${metrics.renderTime > 16 ? 'text-status-warning' : 'text-text-primary'}`}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-tertiary">Events/sec:</span>
          <span className="text-text-primary font-medium">
            {metrics.eventProcessingRate.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

