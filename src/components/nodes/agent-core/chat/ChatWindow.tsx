import React, { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { ChatMessage, ChatMessageData } from './ChatMessage'

export interface ChatWindowProps {
  messages: ChatMessageData[]
  onSendMessage: (message: string) => void
  isWaiting?: boolean
  maxHeight?: string
}

export function ChatWindow({
  messages,
  onSendMessage,
  isWaiting = false,
  maxHeight = '400px',
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll al final cuando hay nuevos mensajes
  // IMPORTANTE: Usar block: 'nearest' para evitar que scrollIntoView afecte el canvas
  useEffect(() => {
    if (messagesEndRef.current) {
      // Solo hacer scroll dentro del contenedor de mensajes, no afectar el canvas
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest', // No forzar scroll si el elemento ya está visible
        inline: 'nearest'
      })
    }
  }, [messages])

  // Focus en input cuando se monta (sin desplazar el canvas)
  useEffect(() => {
    if (inputRef.current) {
      // Usar preventScroll para evitar que el focus cause desplazamiento del canvas
      inputRef.current.focus({ preventScroll: true })
    }
  }, [])

  const handleSend = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isWaiting) return

    onSendMessage(trimmed)
    setInputValue('')
    // IMPORTANTE: Usar preventScroll para evitar que el focus cause desplazamiento del canvas
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight }}>
      {/* Historial de mensajes */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          backgroundColor: 'var(--background-primary)',
          scrollbarWidth: 'thin',
        }}
      >
        {messages.length === 0 ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <p>Inicia una conversación con el agente</p>
            <p className="text-xs mt-2">Escribe un mensaje y presiona Enter o haz clic en enviar</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isWaiting && (
              <ChatMessage
                message={{
                  id: 'loading',
                  type: 'loading',
                  content: '',
                  timestamp: Date.now(),
                }}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input y botón de envío */}
      <div
        className="border-t p-3 flex gap-2"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--background-secondary)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje..."
          disabled={isWaiting}
          className="flex-1 px-3 py-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
          style={{
            backgroundColor: 'var(--background-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            cursor: isWaiting ? 'not-allowed' : 'text',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isWaiting}
          className="px-4 py-2 rounded border flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              !inputValue.trim() || isWaiting
                ? 'var(--background-tertiary)'
                : 'var(--accent-primary)',
            borderColor: 'var(--border-color)',
            color: !inputValue.trim() || isWaiting ? 'var(--text-tertiary)' : 'var(--text-on-accent)',
            cursor: !inputValue.trim() || isWaiting ? 'not-allowed' : 'pointer',
          }}
          title={isWaiting ? 'Esperando respuesta...' : 'Enviar mensaje (Enter)'}
        >
          {isWaiting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}

