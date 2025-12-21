/**
 * ExecutionBar - Barra de estado de Execution Frames
 * 
 * Muestra el estado actual de captura de ejecución y resumen del último frame.
 * UI minimalista que no satura el canvas.
 */

import { useMemo } from 'react'
import { useCanvasStore } from '@/state/canvasStore'
import { Play, Square, Circle } from 'lucide-react'

export function ExecutionBar() {
  const currentFrame = useCanvasStore((state) => state.currentFrame)
  const frames = useCanvasStore((state) => state.frames)
  const executionFramesEnabled = useCanvasStore((state) => state.executionFramesEnabled)
  const nodeSnapshots = useCanvasStore((state) => state.nodeSnapshots)
  const startFrame = useCanvasStore((state) => state.startFrame)
  const endFrame = useCanvasStore((state) => state.endFrame)
  const setExecutionFramesEnabled = useCanvasStore((state) => state.setExecutionFramesEnabled)

  // Si está deshabilitado, no mostrar
  if (!executionFramesEnabled) {
    return null
  }

  // Calcular estadísticas del último frame
  const lastFrameStats = useMemo(() => {
    const lastFrame = frames.length > 0 ? frames[frames.length - 1] : null
    if (!lastFrame) {
      return null
    }

    // Contar snapshots en el frame
    let nodesUpdated = 0
    let payloadUpdates = 0
    let errors = 0

    nodeSnapshots.forEach((snapshots) => {
      const frameSnapshots = snapshots.filter((s) => s.frameId === lastFrame.id)
      if (frameSnapshots.length > 0) {
        nodesUpdated++
        frameSnapshots.forEach((snapshot) => {
          if (snapshot.payloadPreview) {
            payloadUpdates++
          }
          if (snapshot.status === 'error') {
            errors++
          }
        })
      }
    })

    return {
      nodesUpdated,
      payloadUpdates,
      errors,
      duration: lastFrame.endedAt && lastFrame.startedAt
        ? lastFrame.endedAt - lastFrame.startedAt
        : null,
    }
  }, [frames, nodeSnapshots])

  // Calcular estadísticas del frame actual
  const currentFrameStats = useMemo(() => {
    if (!currentFrame) {
      return null
    }

    let nodesUpdated = 0
    let payloadUpdates = 0
    let errors = 0

    nodeSnapshots.forEach((snapshots) => {
      const frameSnapshots = snapshots.filter((s) => s.frameId === currentFrame.id)
      if (frameSnapshots.length > 0) {
        nodesUpdated++
        frameSnapshots.forEach((snapshot) => {
          if (snapshot.payloadPreview) {
            payloadUpdates++
          }
          if (snapshot.status === 'error') {
            errors++
          }
        })
      }
    })

    return {
      nodesUpdated,
      payloadUpdates,
      errors,
      duration: Date.now() - currentFrame.startedAt,
    }
  }, [currentFrame, nodeSnapshots])

  const handleStartCapture = () => {
    startFrame(undefined, 'Manual capture')
  }

  const handleStopCapture = () => {
    if (currentFrame) {
      endFrame(currentFrame.id)
    }
  }

  const handleToggle = () => {
    setExecutionFramesEnabled(!executionFramesEnabled)
  }

  const stats = currentFrame ? currentFrameStats : lastFrameStats

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-bg-secondary border-t border-node-border flex items-center justify-between px-4 z-30 shadow-lg">
      <div className="flex items-center gap-4">
        {/* Estado actual */}
        <div className="flex items-center gap-2">
          {currentFrame ? (
            <>
              <Circle className="w-2 h-2 text-status-success animate-pulse" fill="currentColor" />
              <span className="text-xs font-medium text-text-primary">Recording</span>
            </>
          ) : (
            <>
              <Circle className="w-2 h-2 text-text-tertiary" fill="currentColor" />
              <span className="text-xs text-text-secondary">Idle</span>
            </>
          )}
        </div>

        {/* Botones de control */}
        <div className="flex items-center gap-2">
          {currentFrame ? (
            <button
              onClick={handleStopCapture}
              className="px-2 py-1 text-xs bg-status-error/10 hover:bg-status-error/20 text-status-error rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              title="Stop capture"
            >
              <Square className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleStartCapture}
              className="px-2 py-1 text-xs bg-status-success/10 hover:bg-status-success/20 text-status-success rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
              title="Start capture"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Resumen del frame */}
        {stats && (
          <div className="text-xs text-text-secondary">
            {stats.nodesUpdated > 0 && (
              <span className="mr-3">
                {stats.nodesUpdated} {stats.nodesUpdated === 1 ? 'node' : 'nodes'} updated
              </span>
            )}
            {stats.payloadUpdates > 0 && (
              <span className="mr-3">
                {stats.payloadUpdates} payload {stats.payloadUpdates === 1 ? 'update' : 'updates'}
              </span>
            )}
            {stats.errors > 0 && (
              <span className="text-status-error mr-3">
                {stats.errors} {stats.errors === 1 ? 'error' : 'errors'}
              </span>
            )}
            {stats.duration !== null && (
              <span className="text-text-tertiary">
                · {stats.duration < 1000 ? `${stats.duration}ms` : `${(stats.duration / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Toggle para habilitar/deshabilitar */}
      <button
        onClick={handleToggle}
        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 rounded px-2 py-1"
        title="Toggle execution frames"
      >
        {executionFramesEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  )
}

