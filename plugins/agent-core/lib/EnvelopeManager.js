/**
 * EnvelopeManager.js - Manages AgentEnvelope lifecycle
 * 
 * Responsible for:
 * - Creating new envelopes
 * - Updating envelope state
 * - Tracking tool history
 * - Managing observability events
 * 
 * @module lib/EnvelopeManager
 */

/**
 * Generate a simple trace ID
 */
function generateTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class EnvelopeManager {
  /**
   * Create a new AgentEnvelope
   * 
   * @param {any} input - Original input data
   * @param {string[]} allowedTools - List of allowed tool names
   * @returns {AgentEnvelope} New envelope
   */
  createEnvelope(input, allowedTools = []) {
    return {
      input,
      state: {
        iteration: 0,
        lastAction: undefined,
        lastTool: undefined,
        completed: false
      },
      model: {
        lastPrompt: undefined,
        lastResponse: undefined
      },
      tools: {
        available: allowedTools,
        history: []
      },
      memory: {},
      observability: {
        traceId: generateTraceId(),
        startedAt: new Date().toISOString(),
        events: []
      }
    };
  }

  /**
   * Update envelope after model response
   * 
   * @param {AgentEnvelope} envelope
   * @param {string} prompt - Prompt sent to model
   * @param {ModelResponse} response - Model response
   */
  updateWithModelResponse(envelope, prompt, response) {
    envelope.model.lastPrompt = prompt;
    envelope.model.lastResponse = response;
    envelope.state.lastAction = response.action;

    // Add observability event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'model_response',
      confidence: response.confidence,
      tool: response.tool
    });
  }

  /**
   * Update envelope after tool execution
   * 
   * @param {AgentEnvelope} envelope
   * @param {string} toolName - Tool name
   * @param {any} input - Tool input
   * @param {any} output - Tool output
   * @param {number} durationMs - Execution duration
   * @param {boolean} success - Whether execution succeeded
   * @param {string} [error] - Error message if failed
   */
  updateWithToolResult(envelope, toolName, input, output, durationMs, success, error) {
    envelope.state.lastTool = toolName;

    // Add to tool history
    envelope.tools.history.push({
      iteration: envelope.state.iteration,
      tool: toolName,
      input,
      output,
      durationMs,
      success,
      error
    });

    // Add observability event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'tool_execution',
      tool: toolName,
      durationMs,
      error
    });
  }

  /**
   * Mark envelope as completed
   * 
   * @param {AgentEnvelope} envelope
   * @param {any} finalResult - Final result
   */
  markCompleted(envelope, finalResult) {
    envelope.state.completed = true;
    envelope.state.lastAction = 'final';
    
    // Add final event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'completed',
      durationMs: Date.now() - new Date(envelope.observability.startedAt).getTime()
    });
  }

  /**
   * Add error event to envelope
   * 
   * @param {AgentEnvelope} envelope
   * @param {string} error - Error message
   */
  addError(envelope, error) {
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'error',
      error
    });
  }

  /**
   * Increment iteration counter
   * 
   * @param {AgentEnvelope} envelope
   */
  incrementIteration(envelope) {
    envelope.state.iteration++;
  }

  /**
   * Get current iteration
   * 
   * @param {AgentEnvelope} envelope
   * @returns {number} Current iteration
   */
  getCurrentIteration(envelope) {
    return envelope.state.iteration;
  }

  /**
   * Check if envelope is completed
   * 
   * @param {AgentEnvelope} envelope
   * @returns {boolean} True if completed
   */
  isCompleted(envelope) {
    return envelope.state.completed;
  }

  /**
   * Get tool history
   * 
   * @param {AgentEnvelope} envelope
   * @returns {ToolExecution[]} Tool history
   */
  getToolHistory(envelope) {
    return envelope.tools.history;
  }

  /**
   * Get observability events
   * 
   * @param {AgentEnvelope} envelope
   * @returns {ObservabilityEvent[]} Events
   */
  getEvents(envelope) {
    return envelope.observability.events;
  }
}

module.exports = EnvelopeManager;
