/**
 * DebugTab Component
 * 
 * Tab para visualizar y debuggear el código del nodo Function:
 * - Preview del código completo
 * - Warnings sobre posibles problemas
 * - Información sobre el contexto disponible
 */

import { useMemo, useState } from 'react'
import { CodeEditor } from '../../../editors/CodeEditor'
import { AlertTriangle, Copy, Check, Info } from 'lucide-react'

export interface DebugTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function DebugTab({ nodeData }: DebugTabProps) {
  const [copied, setCopied] = useState(false)

  // Generar preview completo del código
  const codePreview = useMemo(() => {
    let preview = '// === Main Function ===\n'
    preview += nodeData.func || '\nreturn msg;'
    
    if (nodeData.initialize) {
      preview += '\n\n// === Initialize ===\n'
      preview += nodeData.initialize
    }
    
    if (nodeData.finalize) {
      preview += '\n\n// === Finalize ===\n'
      preview += nodeData.finalize
    }

    return preview
  }, [nodeData])

  // Detectar warnings
  const warnings = useMemo(() => {
    const warns: string[] = []
    const func = nodeData.func || ''

    // Función vacía o solo return msg
    if (!func.trim() || func.trim() === 'return msg;') {
      warns.push('Function code is empty or only returns the message unchanged')
    }

    // No return statement
    if (func && !func.includes('return')) {
      warns.push('Function does not return a value. Messages may not be sent to outputs.')
    }

    // Async sin await
    if (func.includes('async') && !func.includes('await')) {
      warns.push('Function is declared async but does not use await. Consider removing async.')
    }

    // Timeout muy bajo con código complejo
    if (nodeData.timeout && nodeData.timeout > 0 && nodeData.timeout < 1) {
      warns.push('Timeout is very low (< 1 second). Complex operations may fail.')
    }

    // Múltiples outputs pero solo retorna un mensaje
    if (nodeData.outputs > 1 && func && !func.includes('[') && func.includes('return msg')) {
      warns.push('Multiple outputs configured but function only returns a single message. Use an array to send to multiple outputs.')
    }

    // Libraries configuradas pero no usadas
    if (nodeData.libs && Array.isArray(nodeData.libs) && nodeData.libs.length > 0) {
      const libVars = nodeData.libs
        .map((lib: any) => lib.var || lib.module)
        .filter(Boolean)
      const libsUsed = libVars.some((varName: string) => 
        func.includes(varName) || 
        (nodeData.initialize && nodeData.initialize.includes(varName)) ||
        (nodeData.finalize && nodeData.finalize.includes(varName))
      )
      if (!libsUsed) {
        warns.push('Libraries are configured but not used in the code')
      }
    }

    return warns
  }, [nodeData])

  // Copiar al portapapeles
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codePreview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="debug-tab space-y-4">
      <div
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Preview of your complete function code. Use this to verify your implementation and check for potential issues.
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-status-warning)',
                opacity: 0.1,
                border: '1px solid var(--color-status-warning)',
                borderOpacity: 0.3,
                color: 'var(--color-status-warning)',
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Copy button */}
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors border"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-node-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Code
            </>
          )}
        </button>
      </div>

      {/* Code Preview */}
      <CodeEditor
        value={codePreview}
        onChange={() => {}} // Read-only
        language="javascript"
        height="400px"
        readOnly={true}
        showPrettyButton={false}
      />

      {/* Context Info */}
      <div
        className="p-4 rounded text-sm"
        style={{
          backgroundColor: 'var(--color-accent-primary)',
          opacity: 0.1,
          border: '1px solid var(--color-accent-primary)',
          borderOpacity: 0.3,
          color: 'var(--color-accent-primary)',
        }}
      >
        <p className="font-medium mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Available Context & Objects
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <strong>msg</strong> - The message object
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li><code>msg.payload</code> - Message payload</li>
              <li><code>msg.topic</code> - Message topic</li>
              <li><code>msg._msgid</code> - Unique message ID</li>
            </ul>
          </div>
          <div>
            <strong>context</strong> - Flow/Global context
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li><code>context.get(key)</code> - Get value</li>
              <li><code>context.set(key, value)</code> - Set value</li>
            </ul>
          </div>
          <div>
            <strong>global</strong> - Global context
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li><code>global.get(key)</code> - Get value</li>
              <li><code>global.set(key, value)</code> - Set value</li>
            </ul>
          </div>
          <div>
            <strong>node</strong> - Node context
            <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
              <li><code>node.context()</code> - Get node context</li>
              <li><code>node.id</code> - Node ID</li>
              <li><code>node.name</code> - Node name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

