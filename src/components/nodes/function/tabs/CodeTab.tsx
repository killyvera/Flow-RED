/**
 * CodeTab Component
 * 
 * Tab para editar el código JavaScript del nodo Function con:
 * - Editor principal para la función (func)
 * - Editor para código de inicialización (initialize)
 * - Editor para código de finalización (finalize)
 * - Syntax highlighting y validación
 */

import { useState } from 'react'
import { CodeEditor } from '../../../editors/CodeEditor'
import { Info } from 'lucide-react'

export interface CodeTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function CodeTab({ nodeData, onNodeDataChange }: CodeTabProps) {
  const [activeEditor, setActiveEditor] = useState<'func' | 'initialize' | 'finalize'>('func')

  const updateCode = (field: 'func' | 'initialize' | 'finalize', value: string) => {
    onNodeDataChange({
      ...nodeData,
      [field]: value,
    })
  }

  const currentCode = nodeData[activeEditor] || (activeEditor === 'func' ? '\nreturn msg;' : '')

  return (
    <div className="code-tab space-y-4">
      {/* Editor selector */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--color-node-border)' }}>
        <button
          onClick={() => setActiveEditor('func')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeEditor === 'func'
              ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
              : 'border-transparent text-[var(--color-text-secondary)]'
          }`}
          onMouseEnter={(e) => {
            if (activeEditor !== 'func') {
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (activeEditor !== 'func') {
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }
          }}
        >
          Main Function
        </button>
        <button
          onClick={() => setActiveEditor('initialize')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeEditor === 'initialize'
              ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
              : 'border-transparent text-[var(--color-text-secondary)]'
          }`}
          onMouseEnter={(e) => {
            if (activeEditor !== 'initialize') {
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (activeEditor !== 'initialize') {
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }
          }}
        >
          Initialize
        </button>
        <button
          onClick={() => setActiveEditor('finalize')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeEditor === 'finalize'
              ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
              : 'border-transparent text-[var(--color-text-secondary)]'
          }`}
          onMouseEnter={(e) => {
            if (activeEditor !== 'finalize') {
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (activeEditor !== 'finalize') {
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }
          }}
        >
          Finalize
        </button>
      </div>

      {/* Info box */}
      <div
        className="flex items-start gap-2 p-3 rounded text-sm"
        style={{
          backgroundColor: 'var(--color-accent-primary)',
          opacity: 0.1,
          border: '1px solid var(--color-accent-primary)',
          borderOpacity: 0.3,
          color: 'var(--color-accent-primary)',
        }}
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          {activeEditor === 'func' && (
            <p>
              <strong>Main Function:</strong> This code runs for each message received. 
              Return a message object or array of messages to send to the output(s).
            </p>
          )}
          {activeEditor === 'initialize' && (
            <p>
              <strong>Initialize:</strong> This code runs once when the node starts. 
              Use it to set up variables, connect to services, or perform one-time setup.
            </p>
          )}
          {activeEditor === 'finalize' && (
            <p>
              <strong>Finalize:</strong> This code runs when the node is stopped or redeployed. 
              Use it to clean up resources, close connections, or save state.
            </p>
          )}
        </div>
      </div>

      {/* Code editor */}
      <div>
        <CodeEditor
          value={currentCode}
          onChange={(value) => updateCode(activeEditor, value)}
          language="javascript"
          height="400px"
          showPrettyButton={true}
        />
      </div>

      {/* Quick reference */}
      <details
        className="p-3 rounded border"
        style={{
          borderColor: 'var(--color-node-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <summary
          className="cursor-pointer text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Quick Reference
        </summary>
        <div className="mt-3 text-xs space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
          <div>
            <strong>msg:</strong> The message object containing payload, topic, etc.
          </div>
          <div>
            <strong>msg.payload:</strong> The message payload (can be any type)
          </div>
          <div>
            <strong>msg.topic:</strong> The message topic (string)
          </div>
          <div>
            <strong>context:</strong> Access flow/global context with <code>context.get()</code> and <code>context.set()</code>
          </div>
          <div>
            <strong>global:</strong> Access global context with <code>global.get()</code> and <code>global.set()</code>
          </div>
          <div>
            <strong>node:</strong> Access node-specific context with <code>node.context()</code>
          </div>
          <div>
            <strong>Return:</strong> Return <code>msg</code> or <code>[msg1, msg2]</code> to send to outputs
          </div>
        </div>
      </details>
    </div>
  )
}

