/**
 * PerfModeToggle - Toggle para activar/desactivar Performance Mode
 * 
 * Performance Mode desactiva animaciones pesadas y sombras durante
 * pan/zoom/drag para mejorar el rendimiento en flows grandes.
 */

import { Gauge } from 'lucide-react'
import { useCanvasStore } from '@/state/canvasStore'

export function PerfModeToggle() {
  const perfMode = useCanvasStore((state) => state.perfMode)
  const togglePerfMode = useCanvasStore((state) => state.togglePerfMode)

  return (
    <button
      onClick={togglePerfMode}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md
        transition-colors
        ${perfMode
          ? 'bg-status-success/20 text-status-success hover:bg-status-success/30'
          : 'bg-bg-secondary text-text-secondary hover:bg-node-hover'
        }
        focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
      `}
      title={perfMode ? 'Desactivar Performance Mode' : 'Activar Performance Mode'}
    >
      <Gauge className="w-4 h-4" />
      <span className="text-xs font-medium">Perf Mode</span>
    </button>
  )
}

