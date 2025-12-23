/**
 * ReactStrategy.js - REACT Loop Implementation
 * 
 * Implements the REACT (Reason → Act) orchestration strategy.
 * One model call per iteration, one tool call per iteration.
 * Fully deterministic and auditable.
 * 
 * @module lib/ReactStrategy
 */

/**
 * REACT Strategy Class
 * 
 * @class
 */
class ReactStrategy {
  /**
   * @param {object} config - Strategy configuration
   * @param {number} config.maxIterations - Maximum iterations
   * @param {string[]} config.allowedTools - Allowed tool names
   * @param {object[]} config.stopConditions - Stop conditions
   * @param {boolean} config.debug - Debug mode
   */
  constructor(config) {
    this.maxIterations = config.maxIterations;
    this.allowedTools = config.allowedTools;
    this.stopConditions = config.stopConditions;
    this.debug = config.debug;
  }

  /**
   * Execute the REACT loop
   * 
   * @param {object} envelope - Agent envelope
   * @param {object} context - Execution context (node, send, modelValidator)
   * @param {function} callback - Callback(err, result)
   */
  execute(envelope, context, callback) {
    const { node, send, modelValidator } = context;

    this._runIteration(envelope, context, 1, (err, finalEnvelope) => {
      if (err) {
        return callback(err);
      }

      // Prepare final output
      const output = {
        payload: finalEnvelope.input,
        envelope: finalEnvelope,
        completed: finalEnvelope.state.completed,
        iterations: finalEnvelope.state.iteration
      };

      callback(null, output);
    });
  }

  /**
   * Run a single iteration of the REACT loop
   * 
   * @private
   * @param {object} envelope - Agent envelope
   * @param {object} context - Execution context
   * @param {number} iteration - Current iteration number
   * @param {function} callback - Callback(err, envelope)
   */
  _runIteration(envelope, context, iteration, callback) {
    const { node, modelValidator } = context;

    // Check iteration limit
    if (iteration > this.maxIterations) {
      envelope.state.completed = true;
      envelope.state.completionReason = 'iteration_limit';
      return callback(null, envelope);
    }

    // Update envelope state
    envelope.state.iteration = iteration;

    if (this.debug) {
      node.log(`[agent-core] Starting iteration ${iteration}`);
    }

    // TODO: Call model node
    // TODO: Validate model response
    // TODO: Execute tool if needed
    // TODO: Check stop conditions
    // TODO: Recurse or complete

    // PLACEHOLDER: Mark as completed for now
    envelope.state.completed = true;
    envelope.state.completionReason = 'placeholder';

    callback(null, envelope);
  }

  /**
   * Check if any stop condition is met
   * 
   * @private
   * @param {object} envelope - Agent envelope
   * @returns {boolean} True if should stop
   */
  _checkStopConditions(envelope) {
    for (const condition of this.stopConditions) {
      if (condition.type === 'final_answer' && envelope.state.lastAction === 'final') {
        return true;
      }

      if (condition.type === 'confidence_threshold') {
        const threshold = condition.value || 0.95;
        if (envelope.model?.lastResponse?.confidence >= threshold) {
          return true;
        }
      }

      if (condition.type === 'iteration_limit') {
        const limit = condition.value || this.maxIterations;
        if (envelope.state.iteration >= limit) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = ReactStrategy;

