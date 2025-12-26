/**
 * Nodo de Chat para Agent Core
 * 
 * Permite enviar mensajes al Agent Core y recibir respuestas del modelo
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Handle, Position, NodeResizeControl, useReactFlow } from '@xyflow/react'
import type { BaseNodeProps } from '@/canvas/nodes/types'
import { ChatWindow, ChatMessageData } from './ChatWindow'
import { getObservabilityWebSocketClient } from '@/api/observabilityWebSocket'
import { nodeRedRequest } from '@/api/client'
import { useCanvasStore } from '@/state/canvasStore'
import { MessageSquare } from 'lucide-react'

export const ChatNode = memo(({ data, selected, id }: BaseNodeProps) => {
  const { setNodes, getNodes } = useReactFlow()
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
  // Rastrear si ya procesamos el puerto 4 para un frame específico
  // Esto evita que el puerto 3 sobrescriba el puerto 4
  const processedPort4Frames = useRef<Set<string>>(new Set())

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
      // Log TODOS los eventos node:output para debugging
      // IMPORTANTE: Loggear también eventos que NO sean node:output para ver qué está llegando
      if (event.event === 'node:output') {
        console.log('[ChatNode] 🔔 Handler ejecutado - node:output:', {
          event: event.event,
          nodeId: event.nodeId,
          agentCoreNodeRedId: currentAgentCoreId,
          matches: event.nodeId === currentAgentCoreId,
          currentState: agentCoreNodeRedId, // Estado actual (puede haber cambiado)
          timestamp: new Date().toISOString(),
        })
        
        // Log adicional para verificar si el evento es del Agent Core
        if (event.nodeId === currentAgentCoreId) {
          console.log('[ChatNode] ✅ Evento MATCH - es del Agent Core configurado')
        } else {
          // Solo loggear si NO es un nodo de modelo (para reducir spam)
          const nodeType = (event.data as any)?.nodeType
          if (nodeType && !nodeType.includes('model') && !nodeType.includes('azure')) {
            console.log('[ChatNode] ⚠️ Evento NO MATCH - nodeId diferente:', {
              eventNodeId: event.nodeId,
              expectedNodeId: currentAgentCoreId,
              eventNodeType: nodeType
            })
          }
        }
      } else {
        // Loggear otros eventos para debugging (solo en desarrollo)
        if (import.meta.env.DEV && (event.event === 'node:input' || event.event === 'frame:end')) {
          console.log('[ChatNode] 📨 Otro evento recibido:', {
            event: event.event,
            nodeId: event.nodeId,
            matches: event.nodeId === currentAgentCoreId
          })
        }
      }
      
      // IMPORTANTE: El sistema de observability solo envía previews truncados para las tabs
      // Para obtener el mensaje completo, debemos obtenerlo del backend del Chat Node
      // que ya tiene el mensaje completo en messageHistory
      // Usar el sistema de observability solo como trigger para detectar nuevos mensajes
      
      // Buscar eventos de output del Agent Core
      // El evento de observability tiene estructura: { event: 'node:output', nodeId: ..., data: { outputs: [...] } }
      // IMPORTANTE: event.nodeId es el ID de Node-RED, no el ID de React Flow
      // Usar el valor capturado en el closure, no el estado actual
      // NOTA: El Agent Core puede enviar múltiples eventos (output 3 y output 4)
      // Cuando detectamos un nuevo mensaje, obtener el mensaje completo del backend del Chat Node
      if (event.event === 'node:output' && event.nodeId === currentAgentCoreId) {
        const eventData = event.data as any
        
        // Log para ver qué puertos tiene este evento
        const portsInEvent = eventData?.outputs?.map((o: any) => o.port) || []
        const frameId = (event as any).frameId
        console.log('[ChatNode] 📨 Evento del Agent Core recibido con puertos:', portsInEvent, 'frameId:', frameId)
        
        // Ignorar eventos con solo puerto 0 (model) - no son relevantes para el chat
        if (portsInEvent.length === 1 && portsInEvent[0] === 0) {
          console.log('[ChatNode] ⏭️ Ignorando evento con solo puerto 0 (model)')
          return
        }
        
        // Verificar si el evento fue filtrado por sampling
        if (eventData?.sampled === false || (Array.isArray(eventData?.outputs) && eventData.outputs.length === 0)) {
          console.warn('[ChatNode] ⚠️ Evento del Agent Core filtrado por sampling o sin outputs:', {
            sampled: eventData?.sampled,
            outputsCount: eventData?.outputs?.length,
            hasOutputs: Array.isArray(eventData?.outputs)
          })
          // No procesar eventos filtrados por sampling
          return
        }
        
        // Verificar si este evento tiene puerto 3 y ya procesamos puerto 4 para este frame
        const hasPort3 = portsInEvent.includes(3)
        const hasPort4 = portsInEvent.includes(4)
        if (hasPort3 && !hasPort4 && frameId && processedPort4Frames.current.has(frameId)) {
          console.log('[ChatNode] ⏭️ Ignorando evento con puerto 3 porque ya procesamos puerto 4 para este frame:', frameId)
          return
        }
        
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
          // Este output tiene el objeto completo con agentResult
          let outputToUse = eventData.outputs.find((output: any) => output.port === 4)
          
          if (outputToUse) {
            console.log('[ChatNode] ✅ Encontrado output 4 (model_response) - tiene agentResult completo')
            // Marcar que ya procesamos puerto 4 para este frame
            if (frameId) {
              processedPort4Frames.current.add(frameId)
              // Limpiar frames antiguos (mantener solo los últimos 100)
              if (processedPort4Frames.current.size > 100) {
                const framesArray = Array.from(processedPort4Frames.current)
                processedPort4Frames.current = new Set(framesArray.slice(-100))
              }
            }
          } else {
            // Prioridad 2: Si no hay output 4, buscar en output 3 (result) que contiene el resultado final
            // ADVERTENCIA: output 3 puede no tener agentResult completo
            console.log('[ChatNode] ⚠️ No se encontró output 4 en este evento, buscando en output 3 (result)...')
            console.log('[ChatNode] ⚠️ Puertos disponibles en este evento:', eventData.outputs.map((o: any) => o.port))
            outputToUse = eventData.outputs.find((output: any) => output.port === 3)
            if (outputToUse) {
              console.log('[ChatNode] ⚠️ Encontrado output 3 (result) - puede no tener agentResult completo')
              console.log('[ChatNode] ⚠️ Este evento solo tiene output 3, el output 4 debe estar en otro evento')
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
          
          // Log CRÍTICO: Verificar el payload completo que llega
          if (outputToUse && outputToUse.payload) {
            console.log('[ChatNode] 🔴 PAYLOAD COMPLETO QUE LLEGA:', {
              payloadKeys: Object.keys(outputToUse.payload),
              hasPreview: !!outputToUse.payload.preview,
              hasAgentResult: !!outputToUse.payload.agentResult,
              hasFullMessage: !!outputToUse.payload.fullMessage,
              hasCompletePayload: !!outputToUse.payload.completePayload,
              payloadString: JSON.stringify(outputToUse.payload, null, 2).substring(0, 2000)
            });
          }
          
          if (outputToUse && outputToUse.payload) {
            // El payload del observability viene en payload.preview
            // Estructura: { payload: { preview: { ...mensaje real... }, type, size, truncated, agentResult? } }
            // IMPORTANTE: Para casos especiales, agentResult está en payload.agentResult (no en preview)
            // Esto permite tener el mensaje completo además del preview truncado
            let payload = outputToUse.payload.preview || outputToUse.payload
            const isTruncated = outputToUse.payload.truncated === true
            
            // Para casos especiales, agentResult puede estar en el nivel superior del payload
            // (no solo en el preview) para tener el mensaje completo
            const fullPayload = outputToUse.payload
            const agentResultFromPayload = fullPayload.agentResult || payload?.agentResult
            
            console.log('[ChatNode] Payload extraído:', {
              port: outputToUse.port,
              hasPreview: !!outputToUse.payload.preview,
              hasPayload: !!payload,
              isTruncated: isTruncated,
              hasAgentCore: !!payload?._agentCore,
              agentCoreType: payload?._agentCore?.type,
              hasPayloadField: !!payload?.payload,
              hasAgentResult: !!agentResultFromPayload,
              agentResultInPreview: !!payload?.agentResult,
              agentResultInPayload: !!fullPayload.agentResult,
              payloadKeys: payload ? Object.keys(payload) : [],
              fullPayloadKeys: fullPayload ? Object.keys(fullPayload) : [],
            })
            
            // Verificar si tiene _agentCore metadata (viene del Agent Core)
            // O si tiene agentResult (estructura alternativa)
            const hasAgentCore = payload && payload._agentCore && payload._agentCore.type === 'model_response'
            const hasAgentResult = payload && payload.agentResult && payload.agentResult.message
            
            console.log('[ChatNode] Verificando estructura del payload:', {
              hasAgentCore,
              hasAgentResult,
              isTruncated,
              agentCoreType: payload?._agentCore?.type,
              hasPayloadField: !!payload?.payload,
              hasAgentResultField: !!payload?.agentResult,
              payloadKeys: payload ? Object.keys(payload) : [],
            })
            
            // Intentar extraer el mensaje de cualquier estructura posible
            let modelMessage = null
            let messageSource = 'unknown'
            
            // Prioridad 1: fullMessage (mensaje completo sin truncar, disponible en payload.fullMessage)
            // Este es el campo más directo para obtener el mensaje completo del Agent Core puerto 4
            if (outputToUse.payload.fullMessage && typeof outputToUse.payload.fullMessage === 'string') {
              modelMessage = outputToUse.payload.fullMessage
              messageSource = 'payload.fullMessage'
              console.log('[ChatNode] ✅ Mensaje completo extraído de payload.fullMessage (no truncado):', {
                length: modelMessage.length,
                preview: modelMessage.substring(0, 100),
                isTruncated: isTruncated,
                source: messageSource
              })
            }
            
            // Prioridad 2: agentResult.message (estructura directa del Agent Core)
            // IMPORTANTE: Si el payload está truncado, SIEMPRE usar agentResult.message si existe
            // porque contiene el mensaje completo sin truncar
            // agentResult puede estar en payload.agentResult (nivel superior) o en preview.agentResult
            if (!modelMessage) {
              const agentResult = agentResultFromPayload || payload?.agentResult
              if (agentResult && agentResult.message) {
                modelMessage = agentResult.message
                messageSource = agentResultFromPayload ? 'payload.agentResult' : 'preview.agentResult'
                console.log('[ChatNode] ✅ Mensaje completo extraído de agentResult.message (no truncado):', {
                  length: modelMessage.length,
                  preview: modelMessage.substring(0, 100),
                  isTruncated: isTruncated,
                  agentResultKeys: Object.keys(agentResult || {}),
                  source: messageSource
                })
              }
            }
            // Si el payload está truncado pero no encontramos agentResult, buscar más profundamente
            // PERO si no lo encontramos, continuar con las siguientes condiciones
            if (!modelMessage && isTruncated && typeof payload === 'object') {
              // Buscar agentResult en cualquier nivel del objeto
              const findAgentResult = (obj: any, depth = 0): string | null => {
                if (depth > 3) return null // Evitar recursión infinita
                if (!obj || typeof obj !== 'object') return null
                
                if (obj.agentResult && obj.agentResult.message) {
                  return obj.agentResult.message
                }
                
                // Buscar recursivamente
                for (const key of Object.keys(obj)) {
                  const result = findAgentResult(obj[key], depth + 1)
                  if (result) return result
                }
                return null
              }
              
              const foundMessage = findAgentResult(payload)
              if (foundMessage) {
                modelMessage = foundMessage
                console.log('[ChatNode] ✅ Mensaje completo encontrado recursivamente en payload truncado')
              }
            }
            // Prioridad 3: completePayload.message (mensaje completo del payload original)
            // Este campo contiene el payload completo sin truncar para casos especiales
            if (!modelMessage && outputToUse.payload.completePayload && outputToUse.payload.completePayload.message) {
              modelMessage = outputToUse.payload.completePayload.message
              messageSource = 'payload.completePayload.message'
              console.log('[ChatNode] ✅ Mensaje completo extraído de payload.completePayload.message (no truncado):', {
                length: modelMessage.length,
                preview: modelMessage.substring(0, 100),
                isTruncated: isTruncated,
                source: messageSource
              })
            }
            
            // Prioridad 4: payload.message si el payload es un objeto con message (estructura validated)
            // IMPORTANTE: Si el mensaje está truncado, buscar agentResult primero, sino usar el mensaje truncado
            if (!modelMessage && payload && typeof payload === 'object' && payload.message && typeof payload.message === 'string') {
              // El payload puede ser el objeto validated directamente con {action, message, tool, etc}
              // Si está truncado, buscar agentResult en el output completo
              if (isTruncated) {
                // Buscar agentResult en el output completo (no solo en el preview)
                const fullPayload = outputToUse?.payload
                
                // Buscar agentResult en el preview primero
                if (payload.agentResult && payload.agentResult.message) {
                  modelMessage = payload.agentResult.message
                  console.log('[ChatNode] ✅ Mensaje completo encontrado en payload.agentResult.message (en preview):', {
                    length: modelMessage.length
                  })
                }
                // Si no está en el preview, buscar en el payload completo
                else if (fullPayload && fullPayload.agentResult && fullPayload.agentResult.message) {
                  modelMessage = fullPayload.agentResult.message
                  console.log('[ChatNode] ✅ Mensaje completo encontrado en payload.agentResult.message (fuera del preview):', {
                    length: modelMessage.length
                  })
                } else {
                  // Usar el mensaje del payload aunque esté truncado como último recurso
                  modelMessage = payload.message
                  console.log('[ChatNode] ⚠️ Usando payload.message (truncado, agentResult no disponible):', {
                    length: modelMessage.length,
                    isTruncated: isTruncated,
                    payloadKeys: Object.keys(payload),
                    fullPayloadKeys: fullPayload ? Object.keys(fullPayload) : []
                  })
                }
              } else {
                modelMessage = payload.message
                console.log('[ChatNode] ✅ Mensaje extraído de payload.message (no truncado)')
              }
            }
            // Prioridad 5: payload.payload.message (estructura anidada)
            if (!modelMessage && payload.payload) {
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
            // Prioridad 6: payload directamente si es string
            if (!modelMessage && typeof payload === 'string') {
              modelMessage = payload
              messageSource = 'payload_direct_string'
              console.log('[ChatNode] ✅ Mensaje extraído de payload (string directo)')
            }
            // Prioridad 7: Buscar en cualquier campo que pueda contener el mensaje
            if (!modelMessage && payload && typeof payload === 'object') {
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
              source: messageSource,
              hasFullMessage: !!outputToUse.payload.fullMessage,
              hasCompletePayload: !!outputToUse.payload.completePayload,
              hasAgentResult: !!agentResultFromPayload || !!payload?.agentResult
            })

            // IMPORTANTE: El sistema de observability solo envía previews truncados para las tabs
            // Para obtener el mensaje completo, debemos obtenerlo del backend del Chat Node
            // que ya tiene el mensaje completo en messageHistory (obtenido directamente del Agent Core)
            // Usar el evento de observability solo como trigger para detectar nuevos mensajes
            if (outputToUse && (outputToUse.port === 4 || outputToUse.port === 3)) {
              console.log('[ChatNode] 🔔 Evento de observability detectado (puerto', outputToUse.port, ') - Obteniendo mensaje completo del backend del Chat Node')
              
              // Obtener el historial completo del backend del Chat Node
              // El backend ya tiene el mensaje completo en messageHistory porque lo recibió directamente del Agent Core
              nodeRedRequest(`/chat-node/${nodeId}/history`)
                .then((response: any) => {
                  if (response && response.history && Array.isArray(response.history)) {
                    // Obtener el último mensaje del agente del historial
                    const lastAgentMessage = response.history
                      .filter((m: any) => m.type === 'agent')
                      .slice(-1)[0]
                    
                    if (lastAgentMessage) {
                      console.log('[ChatNode] ✅ Mensaje completo obtenido del backend:', {
                        messageId: lastAgentMessage.id,
                        contentLength: lastAgentMessage.content.length,
                        preview: lastAgentMessage.content.substring(0, 100)
                      })
                      
                      // Actualizar estado con el mensaje completo
                      setMessages((prev) => {
                        // Evitar duplicados verificando si ya existe un mensaje con el mismo ID
                        const existingMessage = prev.find(m => m.id === lastAgentMessage.id)
                        if (existingMessage) {
                          console.log('[ChatNode] Mensaje ya existe en el estado, ignorando')
                          return prev
                        }
                        console.log('[ChatNode] ✅ Agregando mensaje completo del backend, nuevo total:', prev.length + 1)
                        return [...prev, lastAgentMessage]
                      })
                      
                      setIsWaiting(false)
                    } else {
                      console.warn('[ChatNode] ⚠️ No se encontró mensaje del agente en el historial del backend')
                      setIsWaiting(false)
                    }
                  } else {
                    console.warn('[ChatNode] ⚠️ Respuesta del backend no tiene historial válido')
                    setIsWaiting(false)
                  }
                })
                .catch((error: any) => {
                  console.error('[ChatNode] ❌ Error al obtener historial del backend:', error)
                  // Fallback: usar el mensaje truncado si está disponible
                  if (modelMessage) {
                    console.log('[ChatNode] ⚠️ Usando mensaje truncado como fallback')
                    const agentMessage: ChatMessageData = {
                      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      type: 'agent',
                      content: modelMessage,
                      timestamp: Date.now(),
                      traceId: payload._agentCore?.traceId || payload.agentResult?.traceId || undefined,
                      iteration: payload._agentCore?.iteration || payload.agentResult?.iteration || undefined,
                    }
                    setMessages((prev) => {
                      const recentMessage = prev.find(m => 
                        m.type === 'agent' && 
                        m.content === modelMessage && 
                        Date.now() - m.timestamp < 1000
                      )
                      if (recentMessage) {
                        return prev
                      }
                      return [...prev, agentMessage]
                    })
                  }
                  setIsWaiting(false)
                })
            } else if (modelMessage) {
              // Fallback: si no es puerto 3 o 4, usar el mensaje extraído (puede estar truncado)
              console.log('[ChatNode] ⚠️ Usando mensaje del preview (puede estar truncado)')
              const agentMessage: ChatMessageData = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                content: modelMessage,
                timestamp: Date.now(),
                traceId: payload._agentCore?.traceId || payload.agentResult?.traceId || undefined,
                iteration: payload._agentCore?.iteration || payload.agentResult?.iteration || undefined,
              }
              
              setMessages((prev) => {
                const recentMessage = prev.find(m => 
                  m.type === 'agent' && 
                  m.content === modelMessage && 
                  Date.now() - m.timestamp < 1000
                )
                if (recentMessage) {
                  console.log('[ChatNode] Mensaje duplicado detectado, ignorando')
                  return prev
                }
                return [...prev, agentMessage]
              })
              
              setIsWaiting(false)
            } else {
              console.warn('[ChatNode] ⚠️ No se pudo extraer el mensaje del payload')
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
        width: '320px',
        height: '400px',
      }}
    >
      {/* Control de redimensionamiento */}
      <NodeResizeControl
        style={{
          background: 'transparent',
          border: 'none',
        }}
        minWidth={320}
        minHeight={400}
        position="bottom-right"
        onResizeStart={() => {
          // Deshabilitar arrastre durante el resize
          setNodes((nds) =>
            nds.map((node) =>
              node.id === id ? { ...node, draggable: false } : node
            )
          )
        }}
        onResize={(_: any, params: { width: number; height: number }) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === id
                ? {
                    ...node,
                    width: params.width,
                    height: params.height,
                  }
                : node
            )
          )
        }}
        onResizeEnd={() => {
          // Rehabilitar arrastre después del resize
          setNodes((nds) =>
            nds.map((node) =>
              node.id === id ? { ...node, draggable: true } : node
            )
          )
        }}
      />
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

      {/* Estilos para el handle de resize */}
      <style>{`
        [data-id="${id}"] .react-flow__resize-control [data-handleid]:not([data-handleid="se"]) {
          display: none !important;
        }
        [data-id="${id}"] .react-flow__resize-control [data-handleid="se"] {
          width: 16px !important;
          height: 16px !important;
          border-radius: 50% !important;
          background-color: var(--color-accent-primary) !important;
          border: 2px solid var(--color-bg-primary) !important;
          box-shadow: var(--shadow-node-hover) !important;
          opacity: 0.8 !important;
          pointer-events: auto !important;
          cursor: nwse-resize !important;
          transition: opacity 0.2s !important;
        }
        [data-id="${id}"]:hover .react-flow__resize-control [data-handleid="se"] {
          opacity: 1 !important;
        }
        [data-id="${id}"] .react-flow__resize-control-line {
          display: none !important;
        }
      `}</style>
    </div>
  )
})

ChatNode.displayName = 'ChatNode'

