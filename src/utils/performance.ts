/**
 * Performance Monitor - Utilidades para medir rendimiento
 * 
 * Mide:
 * - Render time (tiempo de renderizado)
 * - Event processing rate (tasa de procesamiento de eventos)
 * - Node/Edge counts
 * - Queue size (desde backpressure)
 */

export interface PerformanceMetrics {
  renderTime: number // ms
  eventProcessingRate: number // events/sec
  nodeCount: number
  edgeCount: number
  queueSize: number
}

/**
 * Monitor de performance para medir render time y event rate
 */
export class PerformanceMonitor {
  private renderStartTime: number = 0
  private eventCount: number = 0
  // private _eventWindowStart: number = Date.now() // No usado actualmente
  private eventWindowDuration: number = 1000 // 1 segundo
  private eventTimestamps: number[] = []

  /**
   * Inicia la medición de tiempo de render
   */
  startRender(): void {
    this.renderStartTime = performance.now()
  }

  /**
   * Finaliza la medición de tiempo de render
   * @returns Tiempo de render en milisegundos
   */
  endRender(): number {
    if (this.renderStartTime === 0) {
      return 0
    }
    const renderTime = performance.now() - this.renderStartTime
    this.renderStartTime = 0
    return renderTime
  }

  /**
   * Registra un evento procesado
   */
  recordEvent(): void {
    this.eventCount++
    this.eventTimestamps.push(Date.now())
    
    // Limpiar timestamps fuera de la ventana
    const now = Date.now()
    const cutoff = now - this.eventWindowDuration
    this.eventTimestamps = this.eventTimestamps.filter(ts => ts > cutoff)
  }

  /**
   * Obtiene la tasa de procesamiento de eventos (eventos por segundo)
   */
  getEventProcessingRate(): number {
    const now = Date.now()
    const cutoff = now - this.eventWindowDuration
    const recentEvents = this.eventTimestamps.filter(ts => ts > cutoff)
    
    if (recentEvents.length === 0) {
      return 0
    }
    
    const oldestEvent = Math.min(...recentEvents)
    const windowDuration = (now - oldestEvent) / 1000 // en segundos
    
    if (windowDuration <= 0) {
      return 0
    }
    
    return recentEvents.length / windowDuration
  }

  /**
   * Obtiene todas las métricas
   */
  getMetrics(
    nodeCount: number,
    edgeCount: number,
    queueSize: number
  ): PerformanceMetrics {
    return {
      renderTime: this.renderStartTime > 0 
        ? performance.now() - this.renderStartTime 
        : 0,
      eventProcessingRate: this.getEventProcessingRate(),
      nodeCount,
      edgeCount,
      queueSize,
    }
  }

  /**
   * Resetea todas las métricas
   */
  reset(): void {
    this.renderStartTime = 0
    this.eventCount = 0
    // this._eventWindowStart = Date.now() // No usado actualmente
    this.eventTimestamps = []
  }
}

/**
 * Instancia global del monitor (solo en dev mode)
 */
let globalMonitor: PerformanceMonitor | null = null

/**
 * Obtiene o crea la instancia global del monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor()
  }
  return globalMonitor
}

/**
 * Resetea el monitor global
 */
export function resetPerformanceMonitor(): void {
  if (globalMonitor) {
    globalMonitor.reset()
  }
}

