/**
 * EnvelopeManager.js - Agent Envelope Management
 * 
 * Manages the AgentEnvelope structure that flows through the REACT loop.
 * The envelope contains all state, history, and observability data.
 * 
 * @module lib/EnvelopeManager
 */

const { v4: uuidv4 } = require('crypto').webcrypto || require('crypto');

/**
 * Agent Envelope Manager
 * 
 * @class
 */
class EnvelopeManager {
  constructor() {
    // No state needed
  }

  /**
   * Initialize a new agent envelope from an incoming message
   * 
   * @param {object} msg - Node-RED message
   * @returns {object} Agent envelope
   */
  initialize(msg) {
    const traceId = this._generateTraceId();
    const startedAt = new Date().toISOString();

    /**
     * @typedef {object} AgentEnvelope
     * @property {*} input - Original input data
     * @property {object} state - Agent state
     * @property {number} state.iteration - Current iteration number
     * @property {string} [state.lastAction] - Last action taken ("tool" | "final")
     * @property {string} [state.lastTool] - Last tool executed
     * @property {boolean} state.completed - Whether agent has completed
     * @property {string} [state.completionReason] - Reason for completion
     * @property {object} [model] - Model interaction data
     * @property {string} [model.lastPrompt] - Last prompt sent to model
     * @property {object} [model.lastResponse] - Last response from model
     * @property {object} tools - Tool-related data
     * @property {string[]} tools.available - Available tool names
     * @property {object[]} tools.history - Tool execution history
     * @property {object} [memory] - Memory store (optional)
     * @property {object} observability - Observability data
     * @property {string} observability.traceId - Unique trace ID
     * @property {string} observability.startedAt - ISO timestamp of start
     * @property {object[]} observability.events - Event timeline
     */
    const envelope = {
      input: msg.payload || {},
      state: {
        iteration: 0,
        lastAction: undefined,
        lastTool: undefined,
        completed: false,
        completionReason: undefined
      },
      model: {
        lastPrompt: undefined,
        lastResponse: undefined
      },
      tools: {
        available: [],
        history: []
      },
      memory: {},
      observability: {
        traceId: traceId,
        startedAt: startedAt,
        events: []
      }
    };

    return envelope;
  }

  /**
   * Record an event in the envelope's observability timeline
   * 
   * @param {object} envelope - Agent envelope
   * @param {object} event - Event data
   * @param {string} event.action - Action type
   * @param {string} [event.tool] - Tool name (if applicable)
   * @param {number} [event.durationMs] - Duration in milliseconds
   * @param {number} [event.confidence] - Confidence score
   */
  recordEvent(envelope, event) {
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      timestamp: new Date().toISOString(),
      ...event
    });
  }

  /**
   * Update envelope with model response
   * 
   * @param {object} envelope - Agent envelope
   * @param {string} prompt - Prompt sent to model
   * @param {object} response - Response from model
   */
  updateWithModelResponse(envelope, prompt, response) {
    envelope.model.lastPrompt = prompt;
    envelope.model.lastResponse = response;
    envelope.state.lastAction = response.action;
  }

  /**
   * Update envelope with tool result
   * 
   * @param {object} envelope - Agent envelope
   * @param {string} toolName - Tool name
   * @param {object} input - Tool input
   * @param {object} output - Tool output
   * @param {number} durationMs - Execution duration
   */
  updateWithToolResult(envelope, toolName, input, output, durationMs) {
    envelope.state.lastTool = toolName;
    envelope.tools.history.push({
      tool: toolName,
      input: input,
      output: output,
      iteration: envelope.state.iteration,
      durationMs: durationMs,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate a unique trace ID
   * 
   * @private
   * @returns {string} UUID trace ID
   */
  _generateTraceId() {
    // Simple UUID generation fallback
    if (typeof uuidv4 === 'function') {
      return uuidv4();
    }
    
    // Fallback: timestamp + random
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = EnvelopeManager;

