/**
 * Componente ExecutionLog - Panel de logs de ejecución en tiempo real
 * 
 * Muestra logs de ejecución de nodos con:
 * - Timestamp
 * - Nombre del nodo
 * - Tipo de nodo
 * - Estado (info, success, error, warning)
 * - Mensaje
 * - Datos adicionales
 */

import { useMemo } from 'react'
import { useCanvasStore, type ExecutionLogEntry } from '@/state/canvasStore'
import { X, Trash2, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

interface ExecutionLogProps {
  isOpen: boolean
  onClose: () => void
}

export function ExecutionLog({ isOpen, onClose }: ExecutionLogProps) {
  const logs = useCanvasStore((state) => state.executionLogs)
  const clearLogs = useCanvasStore((state) => state.clearExecutionLogs)

  const sortedLogs = useMemo(() => {
    return [...logs].reverse() // Más recientes primero
  }, [logs])

  const getLevelIcon = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getLevelColor = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'border-l-green-500 bg-green-500/10'
      case 'error':
        return 'border-l-red-500 bg-red-500/10'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/10'
      default:
        return 'border-l-blue-500 bg-blue-500/10'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-node-default border-t border-l border-node-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-node-border bg-node-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Logs de Ejecución</h3>
          <span className="text-xs text-text-tertiary bg-node-hover px-2 py-0.5 rounded">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1.5 hover:bg-node-hover rounded transition-colors"
            title="Limpiar logs"
          >
            <Trash2 className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-node-hover rounded transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedLogs.length === 0 ? (
          <div className="text-center text-text-tertiary text-sm py-8">
            No hay logs de ejecución
          </div>
        ) : (
          sortedLogs.map((log) => (
            <div
              key={log.id}
              className={`
                p-2 rounded border-l-2 text-xs
                ${getLevelColor(log.level)}
                transition-all duration-200
              `}
            >
              <div className="flex items-start gap-2">
                {getLevelIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary truncate">
                      {log.nodeName || log.nodeId}
                    </span>
                    <span className="text-text-tertiary text-[10px]">
                      {log.nodeType}
                    </span>
                    {log.duration !== undefined && (
                      <span className="text-text-tertiary text-[10px]">
                        ({log.duration}ms)
                      </span>
                    )}
                  </div>
                  <div className="text-text-secondary text-[11px] mb-1">
                    {log.message}
                  </div>
                  {log.data && (
                    <details className="text-[10px] text-text-tertiary">
                      <summary className="cursor-pointer hover:text-text-secondary">
                        Ver datos
                      </summary>
                      <pre className="mt-1 p-1 bg-node-hover rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="text-[10px] text-text-tertiary mt-1">
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

