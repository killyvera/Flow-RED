/**
 * Cliente WebSocket para el plugin node-red-runtime-observability
 * 
 * Se conecta al endpoint /observability para recibir eventos de ejecución en tiempo real:
 * - frame:start: Inicio de una nueva ejecución
 * - node:input: Un nodo recibe un mensaje
 * - node:output: Un nodo envía mensaje(s)
 * - frame:end: Fin de la ejecución con estadísticas
 * 
 * Proporciona Input/Output real por nodo, semantics automáticas, y timing preciso.
 */

import { getNodeRedBaseUrl } from './client'
import { wsLogger } from '@/utils/logger'
import type { ObservabilityEvent } from '@/types/executionFrames'

export type ObservabilityEventHandler = (event: ObservabilityEvent) => void

/**
 * Cliente WebSocket para observability con reconexión automática
 */
export class ObservabilityWebSocketClient {
  private ws: WebSocket | null = null
  private baseUrl: string
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = Infinity
  private reconnectDelay = 2000 // 2 segundos inicial
  private maxReconnectDelay = 30000 // 30 segundos máximo
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isManualClose = false
  private eventHandlers: Set<ObservabilityEventHandler> = new Set()
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
  private lastHeartbeat: number = 0

  constructor() {
    this.baseUrl = getNodeRedBaseUrl()
    this.url = this.buildWebSocketUrl()
  }
  
  /**
   * Construye la URL del WebSocket para /observability
   */
  private buildWebSocketUrl(): string {
    try {
      const url = new URL(this.baseUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      
      // El plugin usa /observability como endpoint
      // Respetar httpAdminRoot si está configurado
      if (!url.pathname || url.pathname === '/') {
        url.pathname = '/observability'
      } else {
        // Si hay un pathname (httpAdminRoot), agregar /observability al final
        url.pathname = url.pathname.endsWith('/') 
          ? `${url.pathname}observability` 
          : `${url.pathname}/observability`
      }
      
      return url.toString()
    } catch (error) {
      // Fallback si la URL no es válida
      const wsUrl = this.baseUrl.replace(/^http/, 'ws')
      return `${wsUrl}/observability`
    }
  }

  /**
   * Conecta al WebSocket de observability
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
    wsLogger('[Observability] Conectando a WebSocket:', this.url)

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        wsLogger('[Observability] ✅ WebSocket conectado')
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        this.reconnectDelay = 2000
        this.lastHeartbeat = Date.now()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ObservabilityEvent
          this.handleMessage(data)
        } catch (error) {
          wsLogger('[Observability] Error al parsear mensaje:', error)
        }
      }

      this.ws.onerror = () => {
        // Solo loguear el error, onclose se encargará de la reconexión
        wsLogger('[Observability] Error en WebSocket (se intentará reconectar)')
        this.connectionState = 'disconnected'
      }

      this.ws.onclose = (event) => {
        const isAbnormalClose = event.code === 1006 || event.code === 1001
        
        if (!isAbnormalClose) {
          wsLogger('[Observability] WebSocket desconectado:', { 
            code: event.code, 
            reason: event.reason || 'Sin razón' 
          })
        } else if (this.reconnectAttempts % 10 === 0) {
          // Solo loguear cada 10 intentos para no saturar
          wsLogger('[Observability] Plugin no disponible. Verifica que node-red-runtime-observability esté instalado.')
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
   * Registra un handler para eventos de observability
   * @returns Función para desregistrar el handler
   */
  onEvent(handler: ObservabilityEventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => {
      this.eventHandlers.delete(handler)
    }
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Obtiene el estado de conexión
   */
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState
  }

  /**
   * Obtiene el timestamp del último heartbeat recibido
   */
  getLastHeartbeat(): number {
    return this.lastHeartbeat
  }

  /**
   * Programa la reconexión con backoff exponencial
   */
  private scheduleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        wsLogger('[Observability] Máximo de intentos de reconexión alcanzado')
      }
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 
      this.maxReconnectDelay
    )
    
    // Después de 10 intentos, usar delay máximo y reducir logs
    if (this.reconnectAttempts > 10) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, this.maxReconnectDelay)
    } else {
      if (this.reconnectAttempts <= 3) {
        wsLogger(`[Observability] Reintentando en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})`)
      }
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, delay)
    }
  }

  /**
   * Maneja mensajes recibidos del WebSocket
   */
  private handleMessage(event: ObservabilityEvent): void {
    // Actualizar heartbeat si es un evento de heartbeat
    if (event.event === 'heartbeat') {
      this.lastHeartbeat = Date.now()
    }

    // Notificar a todos los handlers
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        wsLogger('[Observability] Error en handler de evento:', error)
      }
    })
  }
}

// Instancia singleton del cliente
let observabilityClientInstance: ObservabilityWebSocketClient | null = null

/**
 * Obtiene la instancia singleton del cliente WebSocket de observability
 */
export function getObservabilityClient(): ObservabilityWebSocketClient {
  if (!observabilityClientInstance) {
    observabilityClientInstance = new ObservabilityWebSocketClient()
  }
  return observabilityClientInstance
}

/**
 * Resetea la instancia singleton (útil para testing)
 */
export function resetObservabilityClient(): void {
  if (observabilityClientInstance) {
    observabilityClientInstance.disconnect()
    observabilityClientInstance = null
  }
}

