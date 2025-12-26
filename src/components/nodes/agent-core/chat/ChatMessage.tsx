import React from 'react'
import { User, Bot, Loader2 } from 'lucide-react'

export interface ChatMessageData {
  id: string
  type: 'user' | 'agent' | 'loading'
  content: string
  timestamp: number
  traceId?: string
  iteration?: number
}

export interface ChatMessageProps {
  message: ChatMessageData
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user'
  const isLoading = message.type === 'loading'

  return (
    <div
      className={`flex gap-2 px-2 py-2 rounded-lg transition-all duration-200 ${
        isUser
          ? 'bg-accent-primary/10 ml-2'
          : isLoading
          ? 'bg-bg-secondary mr-2'
          : 'bg-bg-secondary mr-2'
      }`}
    >
      {/* Avatar, nombre y fecha en una sola línea */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {/* Icono */}
        <div
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-accent-primary text-white'
              : isLoading
              ? 'bg-text-tertiary text-bg-primary animate-pulse'
              : 'bg-purple-500 text-white'
          }`}
        >
          {isUser ? (
            <User className="w-3 h-3" strokeWidth={2.5} />
          ) : isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
          ) : (
            <Bot className="w-3 h-3" strokeWidth={2.5} />
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Nombre y fecha en la misma línea */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold"
              style={{ color: isUser ? 'var(--accent-primary)' : 'var(--text-primary)' }}
            >
              {isUser ? 'Tú' : isLoading ? 'Agente pensando...' : 'Agente'}
            </span>
            {message.timestamp && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          {/* Mensaje */}
          <div
            className="text-sm whitespace-pre-wrap break-words"
            style={{ color: 'var(--text-primary)' }}
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

