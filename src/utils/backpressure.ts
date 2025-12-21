/**
 * Sistema de backpressure para WebSocket events
 * 
 * Implementa:
 * - BoundedQueue: Cola acotada para eventos
 * - EventCoalescer: Coalescencia de eventos por nodo dentro de un tick
 */

import type { NodeRedWebSocketEvent } from '@/api/websocket'

/**
 * Cola acotada para eventos
 * 
 * Si la cola está llena, descarta el evento más antiguo (FIFO).
 */
export class BoundedQueue<T> {
  private queue: T[] = []
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  /**
   * Agrega un elemento a la cola
   * @returns true si se agregó, false si la cola estaba llena
   */
  enqueue(item: T): boolean {
    if (this.queue.length >= this.maxSize) {
      // Descartar el elemento más antiguo
      this.queue.shift()
    }
    this.queue.push(item)
    return true
  }

  /**
   * Remueve y retorna el elemento más antiguo
   */
  dequeue(): T | undefined {
    return this.queue.shift()
  }

  /**
   * Retorna el tamaño actual de la cola
   */
  size(): number {
    return this.queue.length
  }

  /**
   * Limpia la cola
   */
  clear(): void {
    this.queue = []
  }

  /**
   * Retorna todos los elementos sin removerlos
   */
  peekAll(): T[] {
    return [...this.queue]
  }
}

/**
 * Coalesced event con metadata
 */
export interface CoalescedEvent {
  nodeId: string
  latestEvent: NodeRedWebSocketEvent
  timestamp: number
}

/**
 * Coalescedor de eventos por nodo
 * 
 * Dentro de un "tick" (16ms), mantiene solo el último evento por nodo.
 * Procesa eventos coalescidos en batch usando requestAnimationFrame.
 */
export class EventCoalescer {
  private nodeEvents: Map<string, NodeRedWebSocketEvent> = new Map()
  private rafId: number | null = null
  private processCallback: ((events: NodeRedWebSocketEvent[]) => void) | null = null

  /**
   * Establece el callback que procesará los eventos coalescidos
   */
  setProcessCallback(callback: (events: NodeRedWebSocketEvent[]) => void): void {
    this.processCallback = callback
  }

  /**
   * Agrega un evento para coalescer
   * 
   * Si ya existe un evento para el mismo nodo, lo reemplaza.
   * Programa el procesamiento en el siguiente frame.
   */
  addEvent(nodeId: string, event: NodeRedWebSocketEvent): void {
    this.nodeEvents.set(nodeId, event)
    this.scheduleProcess()
  }

  /**
   * Programa el procesamiento de eventos en el siguiente frame
   */
  private scheduleProcess(): void {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.processEvents()
        this.rafId = null
      })
    }
  }

  /**
   * Procesa todos los eventos coalescidos
   */
  private processEvents(): void {
    if (this.nodeEvents.size === 0) {
      return
    }

    // Obtener todos los eventos coalescidos
    const events = Array.from(this.nodeEvents.values())
    
    // Limpiar el mapa
    this.nodeEvents.clear()

    // Llamar al callback si está definido
    if (this.processCallback) {
      this.processCallback(events)
    }
  }

  /**
   * Fuerza el procesamiento inmediato de eventos pendientes
   */
  flush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.processEvents()
  }

  /**
   * Limpia todos los eventos pendientes
   */
  clear(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.nodeEvents.clear()
  }

  /**
   * Retorna el número de eventos pendientes
   */
  size(): number {
    return this.nodeEvents.size
  }
}

/**
 * Extrae el nodeId de un evento de WebSocket
 */
export function extractNodeIdFromEvent(event: NodeRedWebSocketEvent): string | null {
  // Node-RED envía eventos de status con topic 'status/nodeId'
  if (event.topic.startsWith('status/')) {
    return event.topic.replace('status/', '')
  }

  // Para eventos de debug, el nodeId puede estar en data.id
  if (event.data?.id) {
    return event.data.id
  }

  // Para otros eventos, intentar extraer de topic o payload
  if (event.topic && event.topic !== 'unknown') {
    // Intentar extraer ID del topic si tiene formato conocido
    const match = event.topic.match(/(?:^|\/)([a-zA-Z0-9_-]+)$/)
    if (match) {
      return match[1]
    }
  }

  return null
}

