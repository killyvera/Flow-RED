/**
 * ReactStrategy.js - REACT (Reason → Act) Strategy Implementation
 * 
 * Implements the core REACT loop:
 * 1. Send prompt to model
 * 2. Validate model response
 * 3. Execute tool if action is 'tool'
 * 4. Check stop conditions
 * 5. Repeat until max iterations or completion
 * 
 * @module lib/ReactStrategy
 */

class ReactStrategy {
  /**
   * @param {object} options - Strategy options
   * @param {number} options.maxIterations - Maximum iterations
   * @param {string[]} options.allowedTools - Allowed tool names
   * @param {StopCondition[]} options.stopConditions - Stop conditions
   * @param {boolean} options.debug - Debug mode
   */
  constructor(options) {
    this.maxIterations = options.maxIterations || 5;
    this.allowedTools = options.allowedTools || [];
    this.stopConditions = options.stopConditions || [];
    this.debug = options.debug || false;
  }

  /**
   * Generate model prompt with available tools
   * 
   * @param {AgentEnvelope} envelope
   * @param {string} customTemplate - Custom prompt template
   * @returns {string} Formatted prompt
   */
  generatePrompt(envelope, customTemplate) {
    const toolsList = this.allowedTools.map(tool => `- ${tool}`).join('\n');
    
    const defaultPrompt = `You are an execution agent.

You must decide ONE action per iteration.

Available tools:
${toolsList}

Current state:
- Iteration: ${envelope.state.iteration}
- Last action: ${envelope.state.lastAction || 'none'}
- Tool history: ${envelope.tools.history.length} executions

Rules:
- Use only the provided tools
- If you have enough information, return a FINAL action
- Always respond in valid JSON
- Do NOT explain your reasoning

Output format:
{
  "action": "tool" | "final",
  "tool": "tool_name_if_any",
  "input": {},
  "confidence": number,
  "message": "optional"
}

User input:
${JSON.stringify(envelope.input, null, 2)}

Tool history:
${JSON.stringify(envelope.tools.history, null, 2)}`;

    // Use custom template if provided
    if (customTemplate) {
      return customTemplate
        .replace('{{tools}}', toolsList)
        .replace('{{iteration}}', envelope.state.iteration)
        .replace('{{input}}', JSON.stringify(envelope.input, null, 2))
        .replace('{{history}}', JSON.stringify(envelope.tools.history, null, 2));
    }

    return defaultPrompt;
  }

  /**
   * Check if any stop condition is met
   * 
   * @param {AgentEnvelope} envelope
   * @returns {boolean} True if should stop
   */
  checkStopConditions(envelope) {
    for (const condition of this.stopConditions) {
      switch (condition.type) {
        case 'final_answer':
          if (envelope.state.lastAction === 'final') {
            return true;
          }
          break;

        case 'confidence_threshold':
          if (envelope.model.lastResponse && 
              envelope.model.lastResponse.confidence >= condition.value) {
            return true;
          }
          break;

        case 'iteration_limit':
          if (envelope.state.iteration >= condition.value) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Execute REACT strategy
   * 
   * @param {AgentEnvelope} envelope - Agent envelope
   * @param {object} callbacks - Callback functions
   * @param {function} callbacks.sendToModel - Send message to model
   * @param {function} callbacks.sendToTool - Send message to tool
   * @param {function} callbacks.onComplete - Called when execution completes
   * @param {function} callbacks.onError - Called on error
   * @param {function} callbacks.log - Logging function
   */
  async execute(envelope, callbacks) {
    const { sendToModel, sendToTool, onComplete, onError, log } = callbacks;

    try {
      log(`Starting REACT strategy with max ${this.maxIterations} iterations`);

      // Main REACT loop
      for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
        envelope.state.iteration = iteration;
        log(`Iteration ${iteration}/${this.maxIterations}`);

        // Generate prompt
        const prompt = this.generatePrompt(envelope);
        log(`Generated prompt (${prompt.length} chars)`);

        // Send to model (output 0)
        const modelMsg = {
          payload: {
            prompt,
            envelope: {
              traceId: envelope.observability.traceId,
              iteration: envelope.state.iteration
            }
          },
          _agentCore: {
            type: 'model_request',
            traceId: envelope.observability.traceId,
            iteration: envelope.state.iteration
          }
        };

        sendToModel(modelMsg);

        // In a real implementation, we would wait for model response
        // For now, we simulate completion
        log(`Waiting for model response...`);

        // TODO: Implement proper async handling with model response
        // This requires Node-RED flow to wire model output back to agent-core
        // For now, we'll complete after first iteration
        break;
      }

      // Check if max iterations reached
      if (envelope.state.iteration >= this.maxIterations && !envelope.state.completed) {
        log(`Max iterations (${this.maxIterations}) reached without completion`);
        envelope.observability.events.push({
          iteration: envelope.state.iteration,
          action: 'max_iterations_reached'
        });
      }

      // Complete execution
      onComplete(envelope);

    } catch (error) {
      log(`Error in REACT strategy: ${error.message}`);
      envelope.observability.events.push({
        iteration: envelope.state.iteration,
        action: 'error',
        error: error.message
      });
      onError(error);
    }
  }

  /**
   * Handle model response (called when model output is wired back)
   * 
   * @param {AgentEnvelope} envelope
   * @param {any} modelResponse - Raw model response
   * @param {ModelValidator} validator - Model validator
   * @returns {ModelResponse} Validated response
   */
  handleModelResponse(envelope, modelResponse, validator) {
    // Validate response
    const validated = validator.parseAndValidate(modelResponse);

    // Update envelope
    envelope.model.lastResponse = validated;
    envelope.state.lastAction = validated.action;

    // Add observability event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'model_response',
      confidence: validated.confidence,
      tool: validated.tool
    });

    return validated;
  }

  /**
   * Execute tool (called when tool action is decided)
   * 
   * @param {AgentEnvelope} envelope
   * @param {string} toolName - Tool name
   * @param {any} toolInput - Tool input
   * @returns {object} Tool message to send
   */
  executeTool(envelope, toolName, toolInput) {
    const toolMsg = {
      payload: toolInput,
      _agentCore: {
        type: 'tool_request',
        traceId: envelope.observability.traceId,
        iteration: envelope.state.iteration,
        tool: toolName
      }
    };

    envelope.state.lastTool = toolName;

    // Add observability event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'tool_request',
      tool: toolName
    });

    return toolMsg;
  }

  /**
   * Handle tool response (called when tool output is wired back)
   * 
   * @param {AgentEnvelope} envelope
   * @param {any} toolResponse - Tool response
   * @param {number} durationMs - Execution duration
   */
  handleToolResponse(envelope, toolResponse, durationMs) {
    const success = !toolResponse.error;

    // Add to tool history
    envelope.tools.history.push({
      iteration: envelope.state.iteration,
      tool: envelope.state.lastTool,
      input: toolResponse.input,
      output: toolResponse.output,
      durationMs,
      success,
      error: toolResponse.error
    });

    // Add observability event
    envelope.observability.events.push({
      iteration: envelope.state.iteration,
      action: 'tool_response',
      tool: envelope.state.lastTool,
      durationMs,
      error: toolResponse.error
    });
  }
}

module.exports = ReactStrategy;
