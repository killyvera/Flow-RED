/**
 * DataViewer - Componente reutilizable para visualizar datos
 * 
 * Soporta múltiples modos de visualización: schema, table, json
 * Con estados vacíos, badges de inferred/truncated, y expansión de datos
 */

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

export interface DataViewerProps {
  data: any
  mode: 'schema' | 'table' | 'json'
  emptyMessage?: string
  isInferred?: boolean
  isTruncated?: boolean
  onExpand?: () => void
  sourceNodeName?: string // Para mostrar de dónde viene el dato inferido
}

export function DataViewer({
  data,
  mode,
  emptyMessage = 'No data available',
  isInferred = false,
  isTruncated = false,
  onExpand,
  sourceNodeName,
}: DataViewerProps) {
  const [isExpanded, setIsExpanded] = useState(!isTruncated)

  // Si no hay datos, mostrar empty state
  if (data === null || data === undefined) {
    return (
      <div className="p-6 text-center text-text-secondary">
        <p className="text-xs">{emptyMessage}</p>
      </div>
    )
  }

  // Renderizar según el modo
  const content = useMemo(() => {
    switch (mode) {
      case 'schema':
        return <SchemaView data={data} />
      case 'table':
        return <TableView data={data} />
      case 'json':
        return <JsonView data={data} isExpanded={isExpanded} />
      default:
        return <JsonView data={data} isExpanded={isExpanded} />
    }
  }, [data, mode, isExpanded])

  return (
    <div className="space-y-2">
      {/* Badges y controles */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isInferred && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-bg-secondary text-text-secondary rounded border border-node-border">
              <Info className="w-3 h-3" />
              Inferred
              {sourceNodeName && (
                <span className="text-text-tertiary">from {sourceNodeName}</span>
              )}
            </span>
          )}
          {isTruncated && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-bg-secondary text-text-secondary rounded border border-node-border">
              Truncated
            </span>
          )}
        </div>
        {isTruncated && onExpand && (
          <button
            onClick={() => {
              setIsExpanded(!isExpanded)
              onExpand?.()
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-secondary hover:text-text-primary transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Expand
              </>
            )}
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-bg-secondary rounded-md border border-node-border/50 overflow-hidden">
        {content}
      </div>
    </div>
  )
}

/**
 * Vista de Schema - Muestra la estructura de los datos
 */
function SchemaView({ data }: { data: any }) {
  const schema = useMemo(() => {
    if (typeof data !== 'object' || data === null) {
      return [{ key: 'value', type: typeof data, value: String(data) }]
    }

    if (Array.isArray(data)) {
      return [
        {
          key: '[array]',
          type: `array[${data.length}]`,
          value: data.length > 0 ? `First item: ${typeof data[0]}` : 'empty',
        },
      ]
    }

    return Object.entries(data).map(([key, value]) => ({
      key,
      type: Array.isArray(value) ? `array[${value.length}]` : typeof value,
      value: typeof value === 'object' && value !== null ? JSON.stringify(value).substring(0, 50) + '...' : String(value),
    }))
  }, [data])

  return (
    <div className="p-3 space-y-2">
      {schema.map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-text-primary font-mono">{item.key}</span>
            <span className="text-text-tertiary ml-2">({item.type})</span>
          </div>
          <div className="text-text-secondary truncate max-w-[200px]" title={item.value}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Vista de Table - Muestra datos en formato tabla
 */
function TableView({ data }: { data: any }) {
  const tableData = useMemo(() => {
    if (Array.isArray(data)) {
      if (data.length === 0) return { headers: [], rows: [] }
      
      // Si es array de objetos, usar las keys del primer objeto como headers
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0])
        const rows = data.map(item => headers.map(h => item[h]))
        return { headers, rows }
      }
      
      // Si es array de valores simples
      return {
        headers: ['Value'],
        rows: data.map(item => [item]),
      }
    }

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data)
      return {
        headers: ['Key', 'Value'],
        rows: entries.map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]),
      }
    }

    return {
      headers: ['Value'],
      rows: [[String(data)]],
    }
  }, [data])

  if (tableData.headers.length === 0) {
    return (
      <div className="p-6 text-center text-text-secondary">
        <p className="text-xs">No table data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-node-border">
            {tableData.headers.map((header, idx) => (
              <th key={idx} className="px-3 py-2 text-left font-semibold text-text-secondary">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-node-border/50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-2 text-text-primary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Vista de JSON - Muestra datos en formato JSON formateado
 */
function JsonView({ data, isExpanded }: { data: any; isExpanded: boolean }) {
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }, [data])

  const displayJson = isExpanded ? jsonString : jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : '')

  return (
    <div className="p-3">
      <pre className="text-[10px] text-text-secondary font-mono overflow-x-auto max-h-96 overflow-y-auto">
        {displayJson}
      </pre>
    </div>
  )
}

