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
 * Soporta drag and drop para reposicionar el componente.
 */

import { useEffect, useState, useRef } from 'react'
import { useCanvasStore } from '@/state/canvasStore'
import { getPerformanceMonitor } from '@/utils/performance'

const STORAGE_KEY = 'perf-readout-position'

interface Position {
  x: number
  y: number
}

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

  // Estado para la posición del componente
  const [position, setPosition] = useState<Position>(() => {
    // Cargar posición desde localStorage al inicializar
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          // Validar que sea un objeto con x e y válidos
          if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return { x: parsed.x, y: parsed.y }
          }
        }
      } catch (e) {
        console.warn('Error al cargar posición de PerfReadout:', e)
      }
    }
    // Posición por defecto (top-4 right-4 = 16px desde arriba y derecha)
    return { x: window.innerWidth - 150, y: 16 }
  })

  // Ref para el elemento del componente
  const elementRef = useRef<HTMLDivElement>(null)
  // Estado para el drag
  const [isDragging, setIsDragging] = useState(false)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)

  // Guardar posición en localStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
      } catch (e) {
        console.warn('Error al guardar posición de PerfReadout:', e)
      }
    }
  }, [position])

  // Manejar inicio del drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!elementRef.current) return
    
    // Solo iniciar drag si se hace clic en el header (título)
    const target = e.target as HTMLElement
    const header = target.closest('.perf-readout-header')
    if (!header) return

    e.preventDefault()
    setIsDragging(true)
    
    const rect = elementRef.current.getBoundingClientRect()
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // Manejar movimiento del mouse durante el drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragOffsetRef.current) return

      // Calcular nueva posición
      const newX = e.clientX - dragOffsetRef.current.x
      const newY = e.clientY - dragOffsetRef.current.y

      // Limitar a los bordes de la ventana
      const maxX = window.innerWidth - (elementRef.current?.offsetWidth || 150)
      const maxY = window.innerHeight - (elementRef.current?.offsetHeight || 120)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragOffsetRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Ajustar posición cuando cambia el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (!elementRef.current) return

      const maxX = window.innerWidth - (elementRef.current.offsetWidth || 150)
      const maxY = window.innerHeight - (elementRef.current.offsetHeight || 120)

      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    <div
      ref={elementRef}
      className={`fixed bg-bg-secondary/90 backdrop-blur-sm border border-node-border rounded-md p-2 text-xs font-mono z-50 shadow-lg ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="perf-readout-header text-[10px] font-semibold text-text-secondary mb-1.5 border-b border-node-border pb-1">
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

