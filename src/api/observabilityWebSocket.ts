/**
 * Cliente WebSocket para el plugin node-red-runtime-observability
 * 
 * Se conecta al endpoint /observability que expone el Execution Contract v1
 */

import { getNodeRedBaseUrl } from './client'
import { wsLogger } from '@/utils/logger'
import type {
  ObservabilityEvent,
  ConnectedEvent,
  HeartbeatEvent,
  FrameStartEvent,
  NodeInputEvent,
  NodeOutputEvent,
  FrameEndEvent,
} from '@/types/observability'

export type ObservabilityEventHandler = (event: ObservabilityEvent) => void

/**
 * Obtiene la URL del WebSocket de observability
 */
export function getObservabilityWebSocketUrl(): string {
  const baseUrl = getNodeRedBaseUrl()
  try {
    const url = new URL(baseUrl)
    // Convertir HTTP/HTTPS a WS/WSS
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    
    // El plugin expone el endpoint /observability
    // Si hay httpAdminRoot configurado, puede estar en /admin/observability
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/observability'
    } else {
      // Si hay un pathname, agregar /observability al final
      url.pathname = url.pathname.endsWith('/') 
        ? `${url.pathname}observability` 
        : `${url.pathname}/observability`
    }
    
    return url.toString()
  } catch (error) {
    // Fallback si la URL no es válida
    const wsUrl = baseUrl.replace(/^http/, 'ws')
    return `${wsUrl}/observability`
  }
}

/**
 * Verifica si el plugin de observability está disponible
 */
export async function isObservabilityAvailable(): Promise<boolean> {
  try {
    const baseUrl = getNodeRedBaseUrl()
    // Intentar conectar al WebSocket brevemente para verificar disponibilidad
    // O hacer un request HTTP al endpoint si existe
    const url = getObservabilityWebSocketUrl()
    
    // Crear una conexión de prueba (timeout corto)
    return new Promise((resolve) => {
      const testWs = new WebSocket(url)
      const timeout = setTimeout(() => {
        testWs.close()
        resolve(false)
      }, 2000) // 2 segundos de timeout
      
      testWs.onopen = () => {
        clearTimeout(timeout)
        testWs.close()
        resolve(true)
      }
      
      testWs.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  } catch {
    return false
  }
}

/**
 * Cliente WebSocket para observability con reconexión automática
 */
export class ObservabilityWebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private baseUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = Infinity
  private reconnectDelay = 2000 // 2 segundos inicial
  private maxReconnectDelay = 30000 // 30 segundos máximo
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isManualClose = false
  private eventHandlers: Set<ObservabilityEventHandler> = new Set()
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
  private pathAttempts = ['/observability', '/admin/observability'] // Intentar diferentes paths
  private currentPathIndex = 0

  constructor() {
    this.baseUrl = getNodeRedBaseUrl()
    this.url = this.buildWebSocketUrl(this.pathAttempts[0])
  }
  
  /**
   * Construye la URL del WebSocket con un path específico
   */
  private buildWebSocketUrl(path: string): string {
    try {
      const url = new URL(this.baseUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.pathname = path
      return url.toString()
    } catch (error) {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws')
      return `${wsUrl}${path}`
    }
  }

  /**
   * Conecta al WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      wsLogger('[Observability] WebSocket ya está conectado')
      return
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      wsLogger('[Observability] WebSocket ya está conectando...')
      return
    }

    this.isManualClose = false
    this.connectionState = 'connecting'
    wsLogger('[Observability] Conectando a:', this.url)

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        wsLogger('[Observability] ✅ WebSocket conectado')
        console.log('[Observability] ✅ WebSocket conectado, URL:', this.url, {
          handlersCount: this.eventHandlers.size,
        })
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        this.reconnectDelay = 2000
        this.onConnect()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Log TODOS los eventos node:output para debugging
          if (data.event === 'node:output') {
            console.log('[Observability] 📥 Mensaje WebSocket recibido (raw) - node:output:', {
              event: data.event,
              nodeId: data.nodeId,
              nodeType: data.data?.nodeType,
              hasData: !!data.data,
              hasOutputs: Array.isArray(data.data?.outputs),
              outputsCount: data.data?.outputs?.length,
              outputPorts: data.data?.outputs?.map((o: any) => o.port),
              handlersCount: this.eventHandlers.size,
            })
          }
          // También log node:input para debugging
          if (data.event === 'node:input') {
            console.log('[Observability] 📥 Mensaje WebSocket recibido (raw) - node:input:', {
              event: data.event,
              nodeId: data.nodeId,
              hasData: !!data.data,
              handlersCount: this.eventHandlers.size,
            })
          }
          this.handleMessage(data)
        } catch (error) {
          wsLogger('[Observability] Error al parsear mensaje:', error)
          console.error('❌ [Observability] Error al parsear mensaje:', error, 'Data:', event.data)
        }
      }

      this.ws.onerror = () => {
        wsLogger('[Observability] Error en WebSocket (se intentará reconectar automáticamente)')
        this.connectionState = 'disconnected'
      }

      this.ws.onclose = (event) => {
        const isAbnormalClose = event.code === 1006 || event.code === 1001
        
        if (isAbnormalClose && !this.isManualClose) {
          // Si el path actual falla, intentar el siguiente
          if (this.currentPathIndex < this.pathAttempts.length - 1) {
            this.currentPathIndex++
            const newPath = this.pathAttempts[this.currentPathIndex]
            this.url = this.buildWebSocketUrl(newPath)
            wsLogger(`[Observability] Intentando path alternativo: ${newPath}`)
          } else {
            // Resetear al primer path después de intentar todos
            this.currentPathIndex = 0
            this.url = this.buildWebSocketUrl(this.pathAttempts[0])
            if (this.reconnectAttempts % 10 === 0) {
              wsLogger(`[Observability] WebSocket no disponible (código ${event.code}). Reintentando...`)
            }
          }
        } else if (!isAbnormalClose) {
          wsLogger('[Observability] WebSocket desconectado:', { code: event.code, reason: event.reason || 'Sin razón' })
        }
        
        this.connectionState = 'disconnected'
        this.ws = null

        if (!this.isManualClose) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      wsLogger('[Observability] Error al crear WebSocket:', error)
      this.connectionState = 'disconnected'
      this.scheduleReconnect()
    }
  }

  /**
   * Desconecta el WebSocket
   */
  disconnect(): void {
    this.isManualClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectionState = 'disconnected'
  }

  /**
   * Agrega un handler de eventos
   */
  onEvent(handler: ObservabilityEventHandler): () => void {
    this.eventHandlers.add(handler)
    console.log('[Observability] ✅ Handler agregado, total handlers:', this.eventHandlers.size, {
      isConnected: this.isConnected(),
      connectionState: this.connectionState,
    })
    return () => {
      this.eventHandlers.delete(handler)
      console.log('[Observability] 🗑️ Handler eliminado, total handlers:', this.eventHandlers.size)
    }
  }

  /**
   * Obtiene el estado de conexión
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Obtiene el estado de conexión como string
   */
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState
  }

  /**
   * Programa la reconexión con backoff exponencial
   */
  private scheduleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        wsLogger(`[Observability] Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`)
      }
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)
    
    // Limitar intentos a 10 para no saturar si el WebSocket no está disponible
    if (this.reconnectAttempts > 10) {
      if (this.reconnectAttempts % 10 === 0) {
        wsLogger(`[Observability] WebSocket no disponible después de ${this.reconnectAttempts} intentos. Reintentando cada 30s.`)
      }
      const finalDelay = this.maxReconnectDelay
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, finalDelay)
    } else {
      if (this.reconnectAttempts <= 3) {
        wsLogger(`[Observability] Reintentando conexión en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})`)
      }
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, delay)
    }
  }

  /**
   * Maneja mensajes recibidos
   */
  private handleMessage(data: any): void {
    // El plugin envía eventos en formato ObservabilityEvent
    const event: ObservabilityEvent = {
      event: data.event || 'unknown',
      ts: data.ts || Date.now(),
      frameId: data.frameId,
      nodeId: data.nodeId,
      data: data.data,
      message: data.message,
      connections: data.connections,
    }

    // Log para debugging (solo eventos importantes)
    if (event.event === 'node:output' || event.event === 'node:input') {
      console.log('[Observability] 📨 Evento recibido:', {
        event: event.event,
        nodeId: event.nodeId,
        handlersCount: this.eventHandlers.size,
        hasData: !!event.data,
      })
    }

    // Notificar a todos los handlers
    if (this.eventHandlers.size === 0) {
      console.warn('[Observability] ⚠️ Evento recibido pero no hay handlers suscritos:', {
        event: event.event,
        nodeId: event.nodeId,
      })
    }

    this.eventHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        wsLogger('[Observability] Error en handler de evento:', error)
        console.error('❌ [Observability] Error en handler:', error, {
          event: event.event,
          nodeId: event.nodeId,
        })
      }
    })
  }

  /**
   * Callback cuando se conecta
   */
  private onConnect(): void {
    wsLogger('[Observability] Listo para recibir eventos del plugin')
  }
}

// Instancia singleton del cliente
let observabilityClientInstance: ObservabilityWebSocketClient | null = null

/**
 * Obtiene la instancia singleton del cliente WebSocket de observability
 */
export function getObservabilityWebSocketClient(): ObservabilityWebSocketClient {
  if (!observabilityClientInstance) {
    observabilityClientInstance = new ObservabilityWebSocketClient()
  }
  return observabilityClientInstance
}

