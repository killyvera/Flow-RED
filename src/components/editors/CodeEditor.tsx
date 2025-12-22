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
      oneDark,
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
  }, [language, readOnly, validateJson]) // Solo recrear si cambian estas props

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
      <div className="code-editor-toolbar flex items-center justify-between mb-2 px-2 py-1 bg-zinc-800 rounded-t">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 uppercase font-medium">
            {language}
          </span>
          {validationError && (
            <span className="text-xs text-red-400">
              {validationError}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showPrettyButton && language === 'json' && !readOnly && (
            <button
              onClick={handlePrettyPrint}
              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
              title="Format JSON"
            >
              <Wand2 className="w-3 h-3" />
              Pretty
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
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
        className="code-editor-container rounded-b overflow-hidden border border-zinc-700"
        style={{ height }}
      />

      <style>{`
        .code-editor-container .cm-editor {
          height: 100%;
        }
        
        .code-editor-container .cm-scroller {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
          font-size: 13px;
        }

        .code-editor-container .cm-gutters {
          background-color: #1e1e1e;
          border-right: 1px solid #3f3f3f;
        }

        .code-editor-container .cm-lineNumbers .cm-gutterElement {
          min-width: 3em;
          color: #858585;
        }

        .code-editor-container .cm-lint-marker-error {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23f87171"/></svg>');
        }
      `}</style>
    </div>
  )
}
