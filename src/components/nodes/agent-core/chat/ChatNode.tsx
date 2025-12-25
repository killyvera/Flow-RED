/**
 * Nodo de Chat para Agent Core
 * 
 * Permite enviar mensajes al Agent Core y recibir respuestas del modelo
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { BaseNodeProps } from '@/canvas/nodes/types'
import { ChatWindow, ChatMessageData } from './ChatWindow'
import { getObservabilityWebSocketClient } from '@/api/observabilityWebSocket'
import { nodeRedRequest } from '@/api/client'
import { useCanvasStore } from '@/state/canvasStore'
import { MessageSquare } from 'lucide-react'

export const ChatNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const nodeData = (data.data || data) as any
  const nodeRedNode = nodeData.nodeRedNode
  const label = nodeData.label || nodeRedNode?.name || 'Chat'
  const maxHistory = nodeData.maxHistory || nodeRedNode?.maxHistory || 100
  
  // IMPORTANTE: Usar el ID de Node-RED si está disponible, sino usar el ID de React Flow
  // El ID de React Flow debería ser el mismo que el de Node-RED, pero por seguridad
  // usamos nodeRedNode.id si está disponible
  const nodeId = (nodeRedNode && nodeRedNode.id) ? nodeRedNode.id : id
  
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [isWaiting, setIsWaiting] = useState(false)
  const edges = useCanvasStore((state) => state.edges)
  const observabilityClientRef = useRef<ReturnType<typeof getObservabilityWebSocketClient> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Encontrar el Agent Core conectado (debe estar conectado al output del chat)
  const agentCoreNodeId = useRef<string | null>(null)
  
  useEffect(() => {
    // Buscar edge que conecta este nodo (chat) al Agent Core
    const outgoingEdge = edges.find(edge => edge.source === id)
    if (outgoingEdge) {
      agentCoreNodeId.current = outgoingEdge.target
      console.log('[ChatNode] Agent Core conectado:', agentCoreNodeId.current)
    }
  }, [edges, id])

  // Escuchar mensajes del Agent Core a través del observability WebSocket
  useEffect(() => {
    if (!agentCoreNodeId.current) return

    const client = getObservabilityWebSocketClient()
    observabilityClientRef.current = client

    // Conectar el cliente si no está conectado
    if (!client.isConnected()) {
      client.connect()
    }

    // Suscribirse a eventos de observability para detectar respuestas del modelo
    const unsubscribe = client.onEvent((event) => {
      // Buscar eventos de output del Agent Core
      // El evento de observability tiene estructura: { event: 'node:output', nodeId: ..., data: { outputs: [...] } }
      if (event.event === 'node:output' && event.nodeId === agentCoreNodeId.current) {
        const eventData = event.data as any
        
        console.log('[ChatNode] 📥 Evento node:output del Agent Core:', {
          hasData: !!eventData,
          hasOutputs: Array.isArray(eventData?.outputs),
          outputsCount: eventData?.outputs?.length,
          outputPorts: eventData?.outputs?.map((o: any) => o.port),
        })
        
        // El evento tiene un array de outputs, necesitamos buscar el output 4 (port === 4)
        // que es donde el Agent Core envía las respuestas del modelo
        if (eventData && Array.isArray(eventData.outputs)) {
          // Buscar el output con port === 4 (model_response output)
          const output4 = eventData.outputs.find((output: any) => output.port === 4)
          
          console.log('[ChatNode] Output 4 encontrado:', {
            hasOutput4: !!output4,
            hasPayload: !!output4?.payload,
            payloadType: typeof output4?.payload,
            payloadKeys: output4?.payload ? Object.keys(output4.payload) : [],
          })
          
          if (output4 && output4.payload) {
            // El payload del observability puede estar estructurado de diferentes maneras:
            // 1. payload.preview (preview truncado)
            // 2. payload directamente (objeto completo)
            // 3. payload puede ser un string
            let payload = output4.payload
            
            // Si hay preview, intentar usarlo primero, pero puede estar truncado
            // Necesitamos el payload completo, no el preview
            if (payload.preview && typeof payload.preview === 'object') {
              // El preview puede tener la estructura completa
              payload = payload.preview
            }
            
            console.log('[ChatNode] Payload extraído:', {
              hasAgentCore: !!payload?._agentCore,
              agentCoreType: payload?._agentCore?.type,
              hasPayload: !!payload?.payload,
              hasAgentResult: !!payload?.agentResult,
              payloadKeys: payload ? Object.keys(payload) : [],
            })
            
            // Verificar si tiene _agentCore metadata (viene del Agent Core)
            if (payload && payload._agentCore && payload._agentCore.type === 'model_response') {
              console.log('[ChatNode] ✅ Detectada respuesta del modelo en output 4')
              
              let modelMessage = null
              
              // Intentar extraer el mensaje de diferentes lugares
              // El payload puede estar en payload.payload (el mensaje real del Agent Core)
              if (payload.payload) {
                const msgPayload = payload.payload
                console.log('[ChatNode] msgPayload:', {
                  type: typeof msgPayload,
                  isString: typeof msgPayload === 'string',
                  hasMessage: !!msgPayload?.message,
                  hasContent: !!msgPayload?.content,
                  hasAction: !!msgPayload?.action,
                  keys: typeof msgPayload === 'object' ? Object.keys(msgPayload) : [],
                })
                
                if (typeof msgPayload === 'string') {
                  modelMessage = msgPayload
                } else if (msgPayload.message) {
                  modelMessage = msgPayload.message
                } else if (msgPayload.content) {
                  modelMessage = msgPayload.content
                } else if (msgPayload.action === 'final' && msgPayload.message) {
                  modelMessage = msgPayload.message
                } else {
                  // Si es un objeto con action: 'final', intentar extraer message
                  modelMessage = JSON.stringify(msgPayload, null, 2)
                }
              } else if (payload.agentResult && payload.agentResult.message) {
                modelMessage = payload.agentResult.message
              } else if (typeof payload === 'string') {
                modelMessage = payload
              }

              console.log('[ChatNode] Mensaje extraído:', {
                hasMessage: !!modelMessage,
                messageLength: modelMessage?.length,
                messagePreview: modelMessage?.substring(0, 100),
              })

              if (modelMessage) {
                const agentMessage: ChatMessageData = {
                  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: 'agent',
                  content: modelMessage,
                  timestamp: Date.now(),
                  traceId: payload._agentCore.traceId,
                  iteration: payload._agentCore.iteration,
                }
                
                console.log('[ChatNode] ✅ Agregando mensaje del agente al chat')
                setMessages((prev) => [...prev, agentMessage])
                setIsWaiting(false)
              } else {
                console.warn('[ChatNode] ⚠️ No se pudo extraer el mensaje del payload:', {
                  payload: payload,
                  payloadString: JSON.stringify(payload, null, 2).substring(0, 500),
                })
              }
            } else {
              console.log('[ChatNode] Output 4 no tiene _agentCore.type === "model_response":', {
                hasAgentCore: !!payload?._agentCore,
                agentCoreType: payload?._agentCore?.type,
              })
            }
          } else {
            // Debug: Log si no hay output 4
            console.log('[ChatNode] Evento del Agent Core pero no hay output 4:', {
              outputsCount: eventData.outputs?.length,
              outputPorts: eventData.outputs?.map((o: any) => o.port),
            })
          }
        }
      }
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      unsubscribe()
    }
  }, [agentCoreNodeId.current])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isWaiting || !agentCoreNodeId.current) return

      // Crear mensaje de usuario
      const userMessage: ChatMessageData = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      // Agregar mensaje de usuario al historial
      setMessages((prev) => [...prev, userMessage])

      // Mostrar indicador de carga
      setIsWaiting(true)

      try {
        // Enviar mensaje al Agent Core usando la API de Node-RED
        // El mensaje se envía al input del Agent Core a través del chat node
        // Buscar el edge que conecta el chat al Agent Core
        const edgeToAgentCore = edges.find(edge => edge.source === id && edge.target === agentCoreNodeId.current)
        
        if (!edgeToAgentCore) {
          throw new Error('No hay conexión al Agent Core. Conecta el output del chat al input del Agent Core.')
        }

        // Enviar mensaje al nodo chat-node en Node-RED
        // El backend del chat-node lo reenviará al Agent Core
        // Usar nodeId (ID de Node-RED) en lugar de id (ID de React Flow)
        console.log(`[ChatNode] Enviando mensaje al nodo ${nodeId}...`)
        const response = await nodeRedRequest(`/chat-node/${nodeId}/send`, {
          method: 'POST',
          body: JSON.stringify({
            message: content.trim(),
            chatMessage: userMessage,
          }),
        })

        console.log('[ChatNode] ✅ Mensaje enviado al Agent Core:', response)

        // La respuesta llegará a través del observability WebSocket
        // No necesitamos hacer nada más aquí, el useEffect se encargará de recibirla
      } catch (error) {
        console.error('[ChatNode] ❌ Error al enviar mensaje:', error)
        setIsWaiting(false)

        // Extraer mensaje de error más descriptivo
        let errorMessage = 'Error desconocido'
        if (error instanceof Error) {
          errorMessage = error.message
          // Si es un error 503 (Service Unavailable), el nodo no está desplegado aún
          if (errorMessage.includes('503') || errorMessage.includes('not deployed')) {
            errorMessage = 'El nodo no está desplegado aún. Por favor, guarda el flow primero.'
          } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            errorMessage = 'El nodo no se encontró. Asegúrate de que el flow esté guardado y desplegado.'
          }
        }

        // Agregar mensaje de error
        const errorChatMessage: ChatMessageData = {
          id: `msg-error-${Date.now()}`,
          type: 'agent',
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorChatMessage])
      }
    },
    [isWaiting, nodeId, id, edges, agentCoreNodeId]
  )

  return (
    <div
      className={`
        relative bg-node-default border-2 rounded-lg shadow-node
        transition-all duration-200
        ${selected ? 'ring-2 ring-accent-primary ring-opacity-50 border-node-border-selected shadow-node-selected' : 'border-node-border hover:border-node-border-hover hover:shadow-node-hover'}
      `}
      style={{
        minWidth: '320px',
        minHeight: '400px',
        maxWidth: '500px',
        maxHeight: '600px',
        width: '320px',
        height: '400px',
      }}
    >
      {/* Input Handle (Izquierda) - Recibe respuestas del Agent Core */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
        style={{
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Output Handle (Derecha) - Envía mensajes al Agent Core */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-0"
        className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
        style={{
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-lg flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
          color: '#ffffff',
        }}
      >
        <MessageSquare className="w-4 h-4" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[11px] truncate">{label}</div>
          <div className="text-[9px] opacity-80">
            {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Ventana de chat */}
      <div className="flex-1 min-h-0 overflow-hidden bg-node-default" style={{ height: 'calc(100% - 60px)' }}>
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isWaiting={isWaiting}
          maxHeight="100%"
        />
      </div>
    </div>
  )
})

ChatNode.displayName = 'ChatNode'

