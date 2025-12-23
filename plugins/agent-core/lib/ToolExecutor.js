/**
 * ToolExecutor.js - Tool Execution Manager
 * 
 * Handles routing tool requests to appropriate tool nodes
 * and collecting their responses.
 * 
 * NOTE: In Node-RED, actual tool execution happens in separate nodes.
 * This class is responsible for:
 * - Formatting tool requests
 * - Tracking tool execution state
 * - Validating tool responses
 * 
 * @module lib/ToolExecutor
 */

class ToolExecutor {
  constructor() {
    // Track pending tool executions
    this.pendingExecutions = new Map();
  }

  /**
   * Format tool request message
   * 
   * @param {string} toolName - Tool name
   * @param {any} input - Tool input
   * @param {string} traceId - Trace ID
   * @param {number} iteration - Current iteration
   * @returns {object} Formatted tool message
   */
  formatToolRequest(toolName, input, traceId, iteration) {
    const executionId = `${traceId}-${iteration}-${toolName}`;

    const toolMsg = {
      payload: input,
      _agentCore: {
        type: 'tool_request',
        traceId,
        iteration,
        tool: toolName,
        executionId,
        timestamp: new Date().toISOString()
      }
    };

    // Track execution
    this.pendingExecutions.set(executionId, {
      toolName,
      input,
      startedAt: Date.now()
    });

    return toolMsg;
  }

  /**
   * Validate tool response
   * 
   * @param {object} toolResponse - Raw tool response
   * @returns {object} Validated response
   */
  validateToolResponse(toolResponse) {
    if (!toolResponse || typeof toolResponse !== 'object') {
      throw new Error('Tool response must be a valid object');
    }

    // Check for agent core metadata
    if (!toolResponse._agentCore || !toolResponse._agentCore.executionId) {
      throw new Error('Tool response missing agent core metadata');
    }

    const executionId = toolResponse._agentCore.executionId;
    const pending = this.pendingExecutions.get(executionId);

    if (!pending) {
      throw new Error(`No pending execution found for ${executionId}`);
    }

    // Calculate duration
    const durationMs = Date.now() - pending.startedAt;

    // Clean up
    this.pendingExecutions.delete(executionId);

    return {
      tool: pending.toolName,
      input: pending.input,
      output: toolResponse.payload,
      durationMs,
      success: !toolResponse.error,
      error: toolResponse.error
    };
  }

  /**
   * Check if tool execution is pending
   * 
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if pending
   */
  isPending(executionId) {
    return this.pendingExecutions.has(executionId);
  }

  /**
   * Get pending execution count
   * 
   * @returns {number} Number of pending executions
   */
  getPendingCount() {
    return this.pendingExecutions.size;
  }

  /**
   * Clear all pending executions
   */
  clearPending() {
    this.pendingExecutions.clear();
  }

  /**
   * Get execution info
   * 
   * @param {string} executionId - Execution ID
   * @returns {object|null} Execution info or null
   */
  getExecutionInfo(executionId) {
    return this.pendingExecutions.get(executionId) || null;
  }
}

module.exports = ToolExecutor;
