/**
 * CodeEditor Component - Generic CodeMirror 6 Wrapper
 * 
 * Wrapper genérico para CodeMirror 6 con soporte para múltiples lenguajes,
 * syntax highlighting, linting, y pretty-printing.
 */

import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { xml } from '@codemirror/lang-xml'
import { linter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { Wand2, Copy, Check } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'json' | 'javascript' | 'xml' | 'text'
  readOnly?: boolean
  height?: string
  showPrettyButton?: boolean
  validateJson?: boolean
  onValidationError?: (error: string | null) => void
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '300px',
  showPrettyButton = true,
  validateJson = true,
  onValidationError,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [copied, setCopied] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { isDarkMode } = useTheme()

  // Configurar extensiones según el lenguaje
  const getLanguageExtensions = () => {
    const extensions: any[] = []
    
    switch (language) {
      case 'json':
        extensions.push(json())
        if (validateJson) {
          extensions.push(linter(jsonParseLinter()))
        }
        break
      case 'javascript':
        extensions.push(javascript())
        break
      case 'xml':
        extensions.push(xml())
        break
    }
    
    return extensions
  }

  // Inicializar CodeMirror
  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      lineNumbers(),
      keymap.of([...defaultKeymap, indentWithTab]),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      // Aplicar tema dark solo si está en modo oscuro
      ...(isDarkMode ? [oneDark] : []),
      ...getLanguageExtensions(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          onChange(newValue)
          
          // Validar JSON si está habilitado
          if (language === 'json' && validateJson) {
            try {
              JSON.parse(newValue)
              setValidationError(null)
              onValidationError?.(null)
            } catch (err) {
              const error = err instanceof Error ? err.message : 'Invalid JSON'
              setValidationError(error)
              onValidationError?.(error)
            }
          }
        }
      }),
    ]

    // Placeholder support could be added here if needed
    // Currently handled by the component's UI

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, readOnly, validateJson, isDarkMode]) // Incluir isDarkMode para reaccionar a cambios de tema

  // Actualizar valor cuando cambia desde afuera
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString()
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value }
        })
      }
    }
  }, [value])

  // Pretty-print JSON
  const handlePrettyPrint = () => {
    if (language !== 'json' || !viewRef.current) return

    try {
      const currentValue = viewRef.current.state.doc.toString()
      const parsed = JSON.parse(currentValue)
      const formatted = JSON.stringify(parsed, null, 2)
      
      viewRef.current.dispatch({
        changes: { from: 0, to: currentValue.length, insert: formatted }
      })
      
      setValidationError(null)
      onValidationError?.(null)
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Invalid JSON'
      setValidationError(error)
      onValidationError?.(error)
    }
  }

  // Copy to clipboard
  const handleCopy = async () => {
    if (!viewRef.current) return

    try {
      const text = viewRef.current.state.doc.toString()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="code-editor-wrapper">
      <div 
        className="code-editor-toolbar flex items-center justify-between mb-2 px-2 py-1 rounded-t"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-node-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-xs uppercase font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {language}
          </span>
          {validationError && (
            <span 
              className="text-xs"
              style={{ color: 'var(--color-status-error)' }}
            >
              {validationError}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showPrettyButton && language === 'json' && !readOnly && (
            <button
              onClick={handlePrettyPrint}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }}
              title="Format JSON"
            >
              <Wand2 className="w-3 h-3" />
              Pretty
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-node-hover)'
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      
      <div 
        ref={editorRef} 
        className="code-editor-container rounded-b overflow-hidden"
        style={{ 
          height,
          border: '1px solid var(--color-node-border)',
        }}
      />

      <style>{`
        .code-editor-container .cm-editor {
          height: 100%;
          background-color: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        
        .code-editor-container .cm-scroller {
          font-family: var(--font-family-mono);
          font-size: 13px;
        }

        .code-editor-container .cm-gutters {
          background-color: var(--color-bg-secondary);
          border-right: 1px solid var(--color-node-border);
        }

        .code-editor-container .cm-lineNumbers .cm-gutterElement {
          min-width: 3em;
          color: var(--color-text-tertiary);
        }

        .code-editor-container .cm-lint-marker-error {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23f87171"/></svg>');
        }

        .code-editor-container .cm-content {
          color: var(--color-text-primary);
        }

        .code-editor-container .cm-focused {
          outline: none;
        }
      `}</style>
    </div>
  )
}
