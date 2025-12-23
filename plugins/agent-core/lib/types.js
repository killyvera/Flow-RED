/**
 * TypeScript-style type definitions for Agent Core
 * (Using JSDoc for runtime JavaScript)
 */

/**
 * @typedef {Object} AgentEnvelope
 * @property {any} input - Original input data
 * @property {AgentState} state - Current agent state
 * @property {ModelInfo} [model] - Model interaction info
 * @property {ToolsInfo} tools - Tools information
 * @property {Record<string, any>} [memory] - Optional memory storage
 * @property {ObservabilityInfo} observability - Tracing and events
 */

/**
 * @typedef {Object} AgentState
 * @property {number} iteration - Current iteration number
 * @property {'tool'|'final'} [lastAction] - Last action taken
 * @property {string} [lastTool] - Last tool executed
 * @property {boolean} completed - Whether agent has completed
 */

/**
 * @typedef {Object} ModelInfo
 * @property {string} [lastPrompt] - Last prompt sent to model
 * @property {any} [lastResponse] - Last response from model
 */

/**
 * @typedef {Object} ToolsInfo
 * @property {string[]} available - Available tool names
 * @property {ToolExecution[]} history - Tool execution history
 */

/**
 * @typedef {Object} ToolExecution
 * @property {number} iteration - Iteration when tool was executed
 * @property {string} tool - Tool name
 * @property {any} input - Tool input
 * @property {any} output - Tool output
 * @property {number} durationMs - Execution duration
 * @property {boolean} success - Whether execution succeeded
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} ObservabilityInfo
 * @property {string} traceId - Unique trace ID
 * @property {string} startedAt - ISO timestamp of start
 * @property {ObservabilityEvent[]} events - List of events
 */

/**
 * @typedef {Object} ObservabilityEvent
 * @property {number} iteration - Iteration number
 * @property {string} action - Action type
 * @property {string} [tool] - Tool name if applicable
 * @property {number} [durationMs] - Duration in milliseconds
 * @property {number} [confidence] - Confidence score 0-1
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} ModelResponse
 * @property {'tool'|'final'} action - Action to take
 * @property {string} [tool] - Tool name if action is 'tool'
 * @property {any} [input] - Input for tool or final result
 * @property {number} confidence - Confidence score 0-1
 * @property {string} [message] - Optional message
 */

/**
 * @typedef {Object} StopCondition
 * @property {'final_answer'|'confidence_threshold'|'iteration_limit'} type
 * @property {any} value - Condition value
 */

module.exports = {
  // Export types are only for documentation
  // No runtime exports needed
};

