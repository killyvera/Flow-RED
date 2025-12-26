/**
 * Nodo de Chat para Agent Core
 * 
 * Permite enviar mensajes al Agent Core y recibir respuestas del modelo
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Handle, Position } from '@xyflow/react'
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

  // Encontrar el Agent Core conectado (buscar automáticamente en el mismo flow)
  // IMPORTANTE: Usar el ID de Node-RED, no el ID de React Flow
  // Usar estado en lugar de ref para que el useEffect se re-ejecute cuando cambie
  const [agentCoreNodeRedId, setAgentCoreNodeRedId] = useState<string | null>(null)
  const nodes = useCanvasStore((state) => state.nodes)
  const agentCoreNodeRedIdRef = useRef<string | null>(null) // Ref para comparar sin causar re-renders
  
  useEffect(() => {
    // Buscar Agent Core automáticamente:
    // 1. Primero intentar por edge (si hay conexión visual)
    const outgoingEdge = edges.find(edge => edge.source === id)
    if (outgoingEdge) {
      const targetNode = nodes.find(n => n.id === outgoingEdge.target)
      const targetNodeType = (targetNode?.data as any)?.nodeRedNode?.type || (targetNode?.data as any)?.nodeRedType
      if (targetNodeType === 'agent-core') {
        // Usar el ID de Node-RED del Agent Core
        const targetNodeRedId = (targetNode?.data as any)?.nodeRedNode?.id || outgoingEdge.target
        // Solo actualizar si cambió para evitar re-renders innecesarios
        if (agentCoreNodeRedIdRef.current !== targetNodeRedId) {
          console.log('[ChatNode] ✅ Agent Core conectado por edge:', {
            reactFlowId: outgoingEdge.target,
            nodeRedId: targetNodeRedId,
            previousId: agentCoreNodeRedIdRef.current,
          })
          agentCoreNodeRedIdRef.current = targetNodeRedId
          setAgentCoreNodeRedId(targetNodeRedId)
        }
        return
      }
    }
    
    // 2. Si no hay edge, buscar cualquier Agent Core en el mismo flow
    const chatNodeFlowId = (nodeRedNode as any)?.z
    if (chatNodeFlowId) {
      const agentCoreNode = nodes.find(n => {
        const nodeRedNodeData = (n.data as any)?.nodeRedNode
        const nodeType = nodeRedNodeData?.type || (n.data as any)?.nodeRedType
        const nodeFlowId = nodeRedNodeData?.z
        return nodeType === 'agent-core' && nodeFlowId === chatNodeFlowId
      })
      
      if (agentCoreNode) {
        // Usar el ID de Node-RED del Agent Core
        const agentCoreNodeRedIdValue = (agentCoreNode.data as any)?.nodeRedNode?.id || agentCoreNode.id
        // Solo actualizar si cambió para evitar re-renders innecesarios
        if (agentCoreNodeRedIdRef.current !== agentCoreNodeRedIdValue) {
          console.log('[ChatNode] ✅ Agent Core encontrado automáticamente en el mismo flow:', {
            reactFlowId: agentCoreNode.id,
            nodeRedId: agentCoreNodeRedIdValue,
            previousId: agentCoreNodeRedIdRef.current,
          })
          agentCoreNodeRedIdRef.current = agentCoreNodeRedIdValue
          setAgentCoreNodeRedId(agentCoreNodeRedIdValue)
        }
      } else {
        // Solo actualizar si cambió
        if (agentCoreNodeRedIdRef.current !== null) {
          console.warn('[ChatNode] ⚠️ No se encontró Agent Core en el mismo flow')
          agentCoreNodeRedIdRef.current = null
          setAgentCoreNodeRedId(null)
        }
      }
    } else {
      // Solo actualizar si cambió
      if (agentCoreNodeRedIdRef.current !== null) {
        agentCoreNodeRedIdRef.current = null
        setAgentCoreNodeRedId(null)
      }
    }
  }, [edges, id, nodes, nodeRedNode]) // Remover agentCoreNodeRedId de dependencias para evitar loops

  // Escuchar mensajes del Agent Core a través del observability WebSocket
  useEffect(() => {
    if (!agentCoreNodeRedId) {
      console.log('[ChatNode] No hay Agent Core ID, no suscribiendo a eventos')
      // Limpiar suscripción anterior si existe
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      return
    }

    const client = getObservabilityWebSocketClient()
    observabilityClientRef.current = client

    // Conectar el cliente si no está conectado
    if (!client.isConnected()) {
      console.log('[ChatNode] Conectando cliente WebSocket...')
      client.connect()
    }

    console.log('[ChatNode] ✅ Suscribiéndose a eventos del Agent Core:', agentCoreNodeRedId)

    // Limpiar suscripción anterior si existe
    if (unsubscribeRef.current) {
      console.log('[ChatNode] Limpiando suscripción anterior...')
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Suscribirse a eventos de observability para detectar respuestas del modelo
    // IMPORTANTE: Capturar el valor actual de agentCoreNodeRedId en el closure
    const currentAgentCoreId = agentCoreNodeRedId
    console.log('[ChatNode] 🔔 Creando suscripción con Agent Core ID:', currentAgentCoreId, {
      timestamp: new Date().toISOString(),
      currentState: agentCoreNodeRedId,
    })
    
    const unsubscribe = client.onEvent((event) => {
      // Log TODOS los eventos node:output para debugging (reducir spam de otros eventos)
      if (event.event === 'node:output') {
        console.log('[ChatNode] 🔔 Handler ejecutado - node:output:', {
          event: event.event,
          nodeId: event.nodeId,
          agentCoreNodeRedId: currentAgentCoreId,
          matches: event.nodeId === currentAgentCoreId,
          currentState: agentCoreNodeRedId, // Estado actual (puede haber cambiado)
          timestamp: new Date().toISOString(),
        })
      }
      
      // Buscar eventos de output del Agent Core
      // El evento de observability tiene estructura: { event: 'node:output', nodeId: ..., data: { outputs: [...] } }
      // IMPORTANTE: event.nodeId es el ID de Node-RED, no el ID de React Flow
      // Usar el valor capturado en el closure, no el estado actual
      if (event.event === 'node:output' && event.nodeId === currentAgentCoreId) {
        const eventData = event.data as any
        
        // Log detallado expandido
        const logData = {
          hasData: !!eventData,
          hasOutputs: Array.isArray(eventData?.outputs),
          outputsCount: eventData?.outputs?.length,
          outputPorts: eventData?.outputs?.map((o: any) => o.port),
          allOutputs: eventData?.outputs?.map((o: any) => ({
            port: o.port,
            hasPayload: !!o.payload,
            sampled: o.sampled,
            payloadKeys: o.payload ? Object.keys(o.payload) : [],
            payloadType: typeof o.payload,
            payloadPreview: o.payload?.preview ? JSON.stringify(o.payload.preview).substring(0, 500) : (o.payload ? JSON.stringify(o.payload).substring(0, 500) : null),
            fullPayload: o.payload ? JSON.stringify(o.payload, null, 2).substring(0, 2000) : null,
          })),
          sampled: eventData?.sampled,
          fullEventData: JSON.stringify(eventData, null, 2).substring(0, 3000),
        }
        console.log('[ChatNode] 📥 Evento node:output del Agent Core (MATCH):', logData)
        // También loggear el objeto completo expandido
        console.log('[ChatNode] 📥 Evento completo (expandido):', eventData)
        
        // El evento tiene un array de outputs, necesitamos buscar el output 4 (port === 4)
        // que es donde el Agent Core envía las respuestas del modelo
        // También podemos buscar en output 3 (result) que contiene el resultado final
        if (eventData && Array.isArray(eventData.outputs)) {
          console.log('[ChatNode] 🔍 Buscando outputs disponibles:', {
            totalOutputs: eventData.outputs.length,
            ports: eventData.outputs.map((o: any) => o.port),
            allOutputs: eventData.outputs.map((o: any) => ({
              port: o.port,
              hasPayload: !!o.payload,
              hasPreview: !!o.payload?.preview,
              previewKeys: o.payload?.preview ? Object.keys(o.payload.preview).slice(0, 10) : [],
            })),
          })
          
          // Prioridad 1: Buscar el output con port === 4 (model_response output)
          let outputToUse = eventData.outputs.find((output: any) => output.port === 4)
          
          // Prioridad 2: Si no hay output 4, buscar en output 3 (result) que contiene el resultado final
          if (!outputToUse) {
            console.log('[ChatNode] ⚠️ No se encontró output 4, buscando en output 3 (result)...')
            outputToUse = eventData.outputs.find((output: any) => output.port === 3)
            if (outputToUse) {
              console.log('[ChatNode] ✅ Encontrado output 3 (result)')
            }
          }
          
          // Prioridad 3: Si no hay output 3 o 4, buscar en cualquier output que tenga un mensaje
          if (!outputToUse) {
            console.log('[ChatNode] ⚠️ No se encontró output 3 o 4, buscando en otros outputs...')
            // Buscar cualquier output que tenga un payload con mensaje
            outputToUse = eventData.outputs.find((output: any) => {
              if (!output || !output.payload) return false
              const payload = output.payload.preview || output.payload
              return payload && (
                payload.message || 
                payload.agentResult?.message || 
                payload.payload?.message ||
                (payload.agentResult && payload.agentResult.completed === true) // Resultado final completado
              )
            })
            if (outputToUse) {
              console.log('[ChatNode] ✅ Encontrado output alternativo en puerto:', outputToUse.port)
            }
          }
          
          const outputLog = {
            hasOutput: !!outputToUse,
            port: outputToUse?.port,
            hasPayload: !!outputToUse?.payload,
            payloadType: typeof outputToUse?.payload,
            payloadKeys: outputToUse?.payload ? Object.keys(outputToUse.payload) : [],
            fullOutput: outputToUse ? JSON.stringify(outputToUse, null, 2).substring(0, 2000) : null,
          }
          console.log('[ChatNode] Output encontrado:', outputLog)
          // También loggear el objeto completo expandido
          console.log('[ChatNode] Output completo (expandido):', outputToUse)
          
          if (outputToUse && outputToUse.payload) {
            // El payload del observability viene en payload.preview
            // Estructura: { payload: { preview: { ...mensaje real... }, type, size, truncated } }
            let payload = outputToUse.payload.preview || outputToUse.payload
            
            console.log('[ChatNode] Payload extraído:', {
              port: outputToUse.port,
              hasPreview: !!outputToUse.payload.preview,
              hasPayload: !!payload,
              hasAgentCore: !!payload?._agentCore,
              agentCoreType: payload?._agentCore?.type,
              hasPayloadField: !!payload?.payload,
              hasAgentResult: !!payload?.agentResult,
              payloadKeys: payload ? Object.keys(payload) : [],
            })
            
            // Verificar si tiene _agentCore metadata (viene del Agent Core)
            // O si tiene agentResult (estructura alternativa)
            const hasAgentCore = payload && payload._agentCore && payload._agentCore.type === 'model_response'
            const hasAgentResult = payload && payload.agentResult && payload.agentResult.message
            
            console.log('[ChatNode] Verificando estructura del payload:', {
              hasAgentCore,
              hasAgentResult,
              agentCoreType: payload?._agentCore?.type,
              hasPayloadField: !!payload?.payload,
              hasAgentResultField: !!payload?.agentResult,
              payloadKeys: payload ? Object.keys(payload) : [],
            })
            
            // Intentar extraer el mensaje de cualquier estructura posible
            let modelMessage = null
            
            // Prioridad 1: agentResult.message (estructura directa del Agent Core)
            if (payload.agentResult && payload.agentResult.message) {
              modelMessage = payload.agentResult.message
              console.log('[ChatNode] ✅ Mensaje extraído de agentResult.message:', modelMessage.substring(0, 100))
            }
            // Prioridad 2: payload.payload.message (estructura anidada)
            else if (payload.payload) {
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
                console.log('[ChatNode] ✅ Mensaje extraído de payload.payload (string)')
              } else if (msgPayload.message) {
                modelMessage = msgPayload.message
                console.log('[ChatNode] ✅ Mensaje extraído de payload.payload.message')
              } else if (msgPayload.content) {
                modelMessage = msgPayload.content
                console.log('[ChatNode] ✅ Mensaje extraído de payload.payload.content')
              } else if (msgPayload.action === 'final' && msgPayload.message) {
                modelMessage = msgPayload.message
                console.log('[ChatNode] ✅ Mensaje extraído de payload.payload (action=final)')
              } else if (msgPayload.action === 'final' && msgPayload.input?.message) {
                modelMessage = msgPayload.input.message
                console.log('[ChatNode] ✅ Mensaje extraído de payload.payload.input.message')
              }
            }
            // Prioridad 3: payload directamente si es string
            else if (typeof payload === 'string') {
              modelMessage = payload
              console.log('[ChatNode] ✅ Mensaje extraído de payload (string directo)')
            }
            // Prioridad 4: Buscar en cualquier campo que pueda contener el mensaje
            else if (payload && typeof payload === 'object') {
              // Intentar encontrar cualquier campo que contenga texto
              for (const key of Object.keys(payload)) {
                const value = payload[key]
                if (typeof value === 'string' && value.length > 10) {
                  modelMessage = value
                  console.log(`[ChatNode] ✅ Mensaje extraído de payload.${key}`)
                  break
                } else if (value && typeof value === 'object' && value.message && typeof value.message === 'string') {
                  modelMessage = value.message
                  console.log(`[ChatNode] ✅ Mensaje extraído de payload.${key}.message`)
                  break
                }
              }
            }

            console.log('[ChatNode] Resultado de extracción:', {
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
                traceId: payload._agentCore?.traceId || payload.agentResult?.traceId || undefined,
                iteration: payload._agentCore?.iteration || payload.agentResult?.iteration || undefined,
              }
              
              console.log('[ChatNode] ✅ Agregando mensaje del agente al chat:', {
                messageId: agentMessage.id,
                contentLength: agentMessage.content.length,
              })
              
              // Actualizar estado de forma segura
              setMessages((prev) => {
                // Evitar duplicados verificando si ya existe un mensaje con el mismo contenido reciente
                const recentMessage = prev.find(m => 
                  m.type === 'agent' && 
                  m.content === modelMessage && 
                  Date.now() - m.timestamp < 1000 // Dentro del último segundo
                )
                if (recentMessage) {
                  console.log('[ChatNode] Mensaje duplicado detectado, ignorando')
                  return prev
                }
                console.log('[ChatNode] ✅ Actualizando mensajes, nuevo total:', prev.length + 1)
                return [...prev, agentMessage]
              })
              
              console.log('[ChatNode] ✅ Cambiando isWaiting a false')
              setIsWaiting(false)
            } else {
              console.warn('[ChatNode] ⚠️ No se pudo extraer el mensaje del payload:', {
                payload: payload,
                payloadString: JSON.stringify(payload, null, 2).substring(0, 1000),
              })
              // Aún así, quitar el estado de "pensando" si pasó mucho tiempo
              console.log('[ChatNode] Cambiando isWaiting a false (sin mensaje)')
              setIsWaiting(false)
            }
          } else {
            // Debug: Log si no hay output 4
            console.log('[ChatNode] ⚠️ Evento del Agent Core pero no hay output válido:', {
              outputsCount: eventData.outputs?.length,
              outputPorts: eventData.outputs?.map((o: any) => o.port),
              allOutputs: eventData.outputs?.map((o: any) => ({
                port: o.port,
                hasPayload: !!o.payload,
                sampled: o.sampled,
              })),
            })
            
            // Si el evento tiene outputs pero están vacíos (filtrados por sampling),
            // intentar usar el evento completo como fallback
            if (eventData.outputs && eventData.outputs.length > 0 && eventData.outputs.every((o: any) => !o.payload || o.sampled === false)) {
              console.log('[ChatNode] ⚠️ Todos los outputs fueron filtrados por sampling, el evento llegó pero sin datos')
            }
          }
        }
      }
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      console.log('[ChatNode] Limpiando suscripción de eventos (cleanup)')
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [agentCoreNodeRedId]) // Ahora depende del estado, no del ref

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isWaiting || !agentCoreNodeRedId) {
        if (!agentCoreNodeRedId) {
          console.warn('[ChatNode] No hay Agent Core conectado, no se puede enviar mensaje')
        }
        return
      }

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
        // El backend del chat-node buscará automáticamente el Agent Core conectado
        // No requiere edge físico - busca automáticamente en el mismo flow
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
    [isWaiting, nodeId, id, edges, agentCoreNodeRedId]
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
      {/* Input Handle (Izquierda) - OCULTO - Recibe respuestas del Agent Core output-4 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-0 !h-0 !opacity-0 !pointer-events-none"
        style={{
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      {/* Output Handle (Derecha) - VISIBLE - Envía mensajes al Agent Core input */}
      {/* Similar al modelo Azure OpenAI: handle visible para conectar al Agent Core */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation()
          // Emitir evento personalizado para abrir paleta
          const event = new CustomEvent('handleDoubleClick', {
            detail: {
              nodeId: id,
              handleId: 'output-0',
              handleType: 'source',
              position: { x: e.clientX, y: e.clientY },
            },
          })
          window.dispatchEvent(event)
        }}
        style={{
          position: 'absolute',
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          zIndex: 10,
        }}
      >
        <Handle
          type="source"
          position={Position.Right}
          id="output-0"
          className="!w-2.5 !h-2.5 !bg-node-default dark:!bg-node-default !border-2 !border-node-border hover:!bg-accent-primary hover:!border-accent-primary transition-all duration-200"
          style={{
            right: 0,
            top: '50%',
          }}
        />
      </div>

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

