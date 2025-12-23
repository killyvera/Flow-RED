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

        // Determinar el prompt del sistema según si hay tools disponibles
        const hasTools = this.allowedTools && this.allowedTools.length > 0;
        
        // Si no hay tools, el modelo actúa como asistente conversacional
        // Si hay tools, actúa como execution agent
        const systemPrompt = hasTools
          ? `You are an execution agent. You must decide ONE action per iteration.

Available tools:
${this.allowedTools.map(tool => `- ${tool}`).join('\n')}

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
}`
          : `You are a helpful AI assistant. Respond naturally and conversationally to the user's message.

Rules:
- Respond directly to the user in a friendly and helpful manner
- If the user greets you, greet them back and offer your assistance
- Always respond in valid JSON format
- Do NOT explain your reasoning

Output format:
{
  "action": "final",
  "tool": null,
  "input": {},
  "confidence": 1.0,
  "message": "Your response to the user"
}`;

        // Send to model (output 0) - formato esperado por Azure OpenAI Model
        const modelMsg = {
          payload: {
            systemPrompt: systemPrompt,
            userPrompt: hasTools
              ? `User input:
${JSON.stringify(envelope.input, null, 2)}

Tool history:
${JSON.stringify(envelope.tools.history, null, 2)}`
              : `User message: ${typeof envelope.input === 'string' ? envelope.input : JSON.stringify(envelope.input, null, 2)}`,
            tools: this.allowedTools.map(tool => ({ name: tool })),
            traceId: envelope.observability.traceId
          },
          _agentCore: {
            type: 'model_request',
            traceId: envelope.observability.traceId,
            iteration: envelope.state.iteration
          }
        };

        sendToModel(modelMsg);

        // Wait for model response - the model will wire back to agent-core input
        // and continueLoop will be called to continue the iteration
        log(`Waiting for model response... (iteration ${envelope.state.iteration})`);
        
        // Don't break - wait for model response to come back via continueLoop
        // The loop will continue when the model response is received
        return;
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
   * Continue REACT loop after receiving model response
   * 
   * @param {AgentEnvelope} envelope - Current envelope
   * @param {object} callbacks - Callback functions
   * @param {ModelResponse} modelResponse - Validated model response
   */
  async continueLoop(envelope, callbacks, modelResponse) {
    const { sendToModel, sendToTool, onComplete, onError, log } = callbacks;

    try {
      // Update envelope with model response
      envelope.model.lastResponse = modelResponse;
      envelope.state.lastAction = modelResponse.action;

      // Add observability event
      envelope.observability.events.push({
        iteration: envelope.state.iteration,
        action: 'model_response',
        confidence: modelResponse.confidence,
        tool: modelResponse.tool
      });

      // Check if final answer
      if (modelResponse.action === 'final') {
        log(`Final answer received at iteration ${envelope.state.iteration}`);
        envelope.state.completed = true;
        onComplete(envelope);
        return;
      }

      // Check if tool action
      if (modelResponse.action === 'tool' && modelResponse.tool) {
        // Validate tool is allowed
        if (!this.allowedTools.includes(modelResponse.tool)) {
          throw new Error(`Tool "${modelResponse.tool}" is not in allowedTools list`);
        }

        // Execute tool
        const toolMsg = this.executeTool(envelope, modelResponse.tool, modelResponse.input);
        sendToTool(toolMsg);
        
        // For now, complete after tool execution (tool response handling will be implemented later)
        log(`Tool "${modelResponse.tool}" requested at iteration ${envelope.state.iteration}`);
        envelope.state.completed = true;
        onComplete(envelope);
        return;
      }

      // Check stop conditions
      if (this.checkStopConditions(envelope)) {
        log(`Stop condition met at iteration ${envelope.state.iteration}`);
        envelope.state.completed = true;
        onComplete(envelope);
        return;
      }

      // Check max iterations
      if (envelope.state.iteration >= this.maxIterations) {
        log(`Max iterations (${this.maxIterations}) reached`);
        envelope.observability.events.push({
          iteration: envelope.state.iteration,
          action: 'max_iterations_reached'
        });
        envelope.state.completed = true;
        onComplete(envelope);
        return;
      }

      // Continue to next iteration
      envelope.state.iteration++;
      log(`Continuing to iteration ${envelope.state.iteration}`);

      // Generate prompt for next iteration
      const prompt = this.generatePrompt(envelope);
      
      // Determinar el prompt del sistema según si hay tools disponibles
      const hasTools = this.allowedTools && this.allowedTools.length > 0;
      
      // Si no hay tools, el modelo actúa como asistente conversacional
      // Si hay tools, actúa como execution agent
      const systemPrompt = hasTools
        ? `You are an execution agent. Continue from iteration ${envelope.state.iteration}.

Available tools:
${this.allowedTools.map(tool => `- ${tool}`).join('\n')}

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
}`
        : `You are a helpful AI assistant. Respond naturally and conversationally to the user's message.

Rules:
- Respond directly to the user in a friendly and helpful manner
- If the user greets you, greet them back and offer your assistance
- Always respond in valid JSON format
- Do NOT explain your reasoning

Output format:
{
  "action": "final",
  "tool": null,
  "input": {},
  "confidence": 1.0,
  "message": "Your response to the user"
}`;

      // Send to model for next iteration - formato esperado por Azure OpenAI Model
      const modelMsg = {
        payload: {
          systemPrompt: systemPrompt,
          userPrompt: hasTools
            ? `User input:
${JSON.stringify(envelope.input, null, 2)}

Tool history:
${JSON.stringify(envelope.tools.history, null, 2)}`
            : `User message: ${typeof envelope.input === 'string' ? envelope.input : JSON.stringify(envelope.input, null, 2)}`,
          tools: this.allowedTools.map(tool => ({ name: tool })),
          traceId: envelope.observability.traceId
        },
        _agentCore: {
          type: 'model_request',
          traceId: envelope.observability.traceId,
          iteration: envelope.state.iteration
        }
      };

      sendToModel(modelMsg);

    } catch (error) {
      log(`Error in continueLoop: ${error.message}`);
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
