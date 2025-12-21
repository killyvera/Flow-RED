/**
 * Cliente WebSocket para eventos en tiempo real de Node-RED
 * 
 * Se conecta al endpoint /comms de Node-RED para recibir eventos de runtime:
 * - status: estados de nodos (running, error, idle, warning)
 * - debug: mensajes de debug
 * - nodes-started: cuando se inician nodos
 * - nodes-stopped: cuando se detienen nodos
 */

import { getNodeRedBaseUrl } from './client'
import { wsLogger } from '@/utils/logger'

export interface NodeRedStatusEvent {
  id: string
  status?: {
    fill: 'red' | 'green' | 'yellow' | 'blue' | 'grey' | 'gray'
    shape: 'dot' | 'ring'
    text?: string
  }
}

export interface NodeRedWebSocketEvent {
  topic: string
  data?: any
  payload?: NodeRedStatusEvent
}

export type WebSocketEventHandler = (event: NodeRedWebSocketEvent) => void

/**
 * Obtiene la URL del WebSocket desde la URL base de Node-RED
 * 
 * Node-RED puede tener httpAdminRoot configurado, pero por defecto
 * el endpoint es /comms o /admin/comms dependiendo de la configuración.
 * Intentamos primero /comms y si falla, intentamos /admin/comms
 */
export function getWebSocketUrl(): string {
  const baseUrl = getNodeRedBaseUrl()
  try {
    const url = new URL(baseUrl)
    // Convertir HTTP/HTTPS a WS/WSS
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    
    // Node-RED por defecto usa /comms, pero puede estar en /admin/comms
    // si httpAdminRoot está configurado. Intentamos primero /comms
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/comms'
    } else {
      // Si hay un pathname, agregar /comms al final
      url.pathname = url.pathname.endsWith('/') 
        ? `${url.pathname}comms` 
        : `${url.pathname}/comms`
    }
    
    return url.toString()
  } catch (error) {
    // Fallback si la URL no es válida
    const wsUrl = baseUrl.replace(/^http/, 'ws')
    return `${wsUrl}/comms`
  }
}

/**
 * Cliente WebSocket con reconexión automática
 */
export class NodeRedWebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private baseUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = Infinity
  private reconnectDelay = 1000 // 1 segundo inicial
  private maxReconnectDelay = 30000 // 30 segundos máximo
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isManualClose = false
  private eventHandlers: Set<WebSocketEventHandler> = new Set()
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
  private pathAttempts = ['/comms', '/admin/comms'] // Intentar diferentes paths
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
      wsLogger('WebSocket ya está conectado')
      return
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      wsLogger('WebSocket ya está conectando...')
      return
    }

    this.isManualClose = false
    this.connectionState = 'connecting'
    wsLogger('Conectando a WebSocket:', this.url)

    try {
      // Intentar conectar al WebSocket
      // Nota: Si Node-RED está configurado con autenticación o CORS estricto,
      // la conexión puede fallar. La aplicación funcionará sin WebSocket,
      // pero sin actualizaciones en tiempo real.
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        wsLogger('WebSocket conectado')
        // console.log('🔌 [WebSocket] ✅ CONECTADO a:', this.url)
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        
        // Node-RED puede requerir suscripción a topics después de conectarse
        // Por ahora, no enviamos nada y esperamos que Node-RED envíe eventos automáticamente
        // Si Node-RED requiere autenticación, se manejará en el primer mensaje
        
        // console.log('🔌 [WebSocket] Llamando onConnect(), handlers registrados:', this.eventHandlers.size)
        this.onConnect()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // console.log('📨 [WebSocket] Mensaje recibido (raw):', data)
          
          // Node-RED puede enviar arrays de eventos o un solo evento
          if (Array.isArray(data)) {
            // console.log('📦 [WebSocket] Array de eventos recibido, procesando', data.length, 'eventos')
            data.forEach((item) => {
              // console.log(`📨 [WebSocket] Evento recibido:`, item)
              this.handleMessage(item)
            })
          } else {
            // console.log('📨 [WebSocket] Evento único recibido:', {
            //   topic: data.topic || data.type || 'unknown',
            //   payload: data.payload || data.data,
            //   raw: data
            // })
            this.handleMessage(data)
          }
        } catch (error) {
          wsLogger('Error al parsear mensaje WebSocket:', error)
          console.error('❌ [WebSocket] Error al parsear mensaje:', error, 'Data:', event.data)
        }
      }

      this.ws.onerror = () => {
        // Solo loguear el error, no hacer nada más aquí
        // El onclose se encargará de la reconexión
        wsLogger('Error en WebSocket (se intentará reconectar automáticamente):', this.url)
        this.connectionState = 'disconnected'
      }

      this.ws.onclose = (event) => {
        // Códigos de cierre comunes:
        // 1006: Conexión cerrada anormalmente (sin código de cierre)
        // 1000: Cierre normal
        // 1001: El endpoint se va (por ejemplo, servidor apagado)
        const isAbnormalClose = event.code === 1006 || event.code === 1001
        
        if (isAbnormalClose && !this.isManualClose) {
          // Si el path actual falla, intentar el siguiente
          if (this.currentPathIndex < this.pathAttempts.length - 1) {
            this.currentPathIndex++
            const newPath = this.pathAttempts[this.currentPathIndex]
            this.url = this.buildWebSocketUrl(newPath)
            wsLogger(`Intentando path alternativo: ${newPath}`)
          } else {
            // Resetear al primer path después de intentar todos
            this.currentPathIndex = 0
            this.url = this.buildWebSocketUrl(this.pathAttempts[0])
            // Solo loguear cada 10 intentos para no saturar
            if (this.reconnectAttempts % 10 === 0) {
              wsLogger(`WebSocket no disponible (código ${event.code}). La aplicación funciona sin tiempo real. Node-RED en ${this.baseUrl}`)
            }
          }
        } else if (!isAbnormalClose) {
          wsLogger('WebSocket desconectado:', { code: event.code, reason: event.reason || 'Sin razón' })
        }
        
        this.connectionState = 'disconnected'
        this.ws = null

        if (!this.isManualClose) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      wsLogger('Error al crear WebSocket:', error)
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
  onEvent(handler: WebSocketEventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => {
      this.eventHandlers.delete(handler)
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
   * 
   * Nota: Si Node-RED tiene disableEditor: true o httpAdminRoot: false,
   * el WebSocket no estará disponible. En ese caso, limitamos los intentos
   * para no saturar la consola.
   */
  private scheduleReconnect(): void {
    if (this.isManualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        wsLogger(`Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts}). El WebSocket no está disponible. La aplicación funciona sin tiempo real.`)
      }
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)
    
    // Limitar intentos a 10 para no saturar si el WebSocket no está disponible
    // Si Node-RED tiene disableEditor: true, el WebSocket nunca estará disponible
    if (this.reconnectAttempts > 10) {
      // Después de 10 intentos, solo reintentar cada 30 segundos
      if (this.reconnectAttempts % 10 === 0) {
        wsLogger(`WebSocket no disponible después de ${this.reconnectAttempts} intentos. Verifica que Node-RED tenga el editor habilitado (disableEditor: false). Reintentando cada 30s.`)
      }
      // Usar delay máximo después de 10 intentos
      const finalDelay = this.maxReconnectDelay
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, finalDelay)
    } else {
      // Solo loguear los primeros intentos
      if (this.reconnectAttempts <= 3) {
        wsLogger(`Reintentando conexión WebSocket en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})`)
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
    // Node-RED puede enviar mensajes de autenticación primero
    if (data.auth === 'ok') {
      wsLogger('Autenticación WebSocket exitosa')
      return
    }
    
    if (data.auth === 'fail') {
      wsLogger('Autenticación WebSocket falló - continuando sin autenticación')
      // Continuar sin autenticación si es posible
      return
    }
    
    // Node-RED envía eventos en formato {topic, data} o {topic, payload}
    const event: NodeRedWebSocketEvent = {
      topic: data.topic || data.type || 'unknown',
      data: data.data,
      payload: data.payload || data.data,
    }

    // console.log('🔄 [WebSocket] Procesando evento:', {
    //   topic: event.topic,
    //   hasPayload: !!event.payload,
    //   hasData: !!event.data,
    //   handlersCount: this.eventHandlers.size
    // })

    // Notificar a todos los handlers
    this.eventHandlers.forEach((handler) => {
      try {
        // console.log('📤 [WebSocket] Enviando evento a handler:', event.topic)
        handler(event)
      } catch (error) {
        wsLogger('Error en handler de evento:', error)
        console.error('❌ [WebSocket] Error en handler:', error)
      }
    })
  }

  /**
   * Callback cuando se conecta
   */
  private onConnect(): void {
    // Node-RED no requiere suscripción explícita, envía todos los eventos automáticamente
    wsLogger('Listo para recibir eventos de Node-RED')
  }
}

// Instancia singleton del cliente
let wsClientInstance: NodeRedWebSocketClient | null = null

/**
 * Obtiene la instancia singleton del cliente WebSocket
 */
export function getWebSocketClient(): NodeRedWebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new NodeRedWebSocketClient()
  }
  return wsClientInstance
}

