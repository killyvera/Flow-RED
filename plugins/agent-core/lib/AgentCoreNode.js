/**
 * AgentCoreNode.js - Main Agent Core Node Implementation
 * 
 * This node orchestrates AI agent workflows using the REACT strategy.
 * It does NOT execute actions directly - it only routes, validates, and orchestrates.
 * 
 * @module lib/AgentCoreNode
 */

const ReactStrategy = require('./ReactStrategy');
const EnvelopeManager = require('./EnvelopeManager');
const ModelValidator = require('./ModelValidator');

/**
 * Generate a simple UUID for tracing
 */
function generateTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Agent Core Node Constructor
 * 
 * @param {object} RED - Node-RED runtime object
 * @param {object} config - Node configuration from the flow editor
 * @constructor
 */
function AgentCoreNode(RED, config) {
  RED.nodes.createNode(this, config);
  const node = this;

  // Configuration
  node.strategy = (config && config.strategy) || 'react';
  node.maxIterations = parseInt((config && config.maxIterations) || 5);
  node.allowedTools = (config && config.allowedTools) || [];
  node.stopConditions = (config && config.stopConditions) || [];
  node.debug = (config && config.debug) || false;
  node.modelPromptTemplate = (config && config.modelPromptTemplate) || '';

  // Initialize strategy
  node.reactStrategy = new ReactStrategy({
    maxIterations: node.maxIterations,
    allowedTools: node.allowedTools,
    stopConditions: node.stopConditions,
    debug: node.debug
  });

  // Initialize managers
  node.envelopeManager = new EnvelopeManager();
  node.modelValidator = new ModelValidator(node.allowedTools);

  // Track active executions
  node.activeExecutions = new Map();

  /**
   * Handle incoming messages
   * 
   * @param {object} msg - Node-RED message object
   * @param {function} send - Send function for outputs
   * @param {function} done - Done callback for completion
   */
  node.on('input', function(msg, send, done) {
    try {
      if (node.debug) {
        node.log('[agent-core] Received input message');
      }

      // Check if this is a model response (has _agentCore metadata)
      if (msg._agentCore && msg._agentCore.type === 'model_response') {
        // This is a response from the model - continue existing execution
        const traceId = msg._agentCore.traceId;
        const execution = node.activeExecutions.get(traceId);
        
        if (!execution) {
          node.error(`[agent-core] Received model response for unknown traceId: ${traceId}`, msg);
          if (done) done();
          return;
        }

        // Handle model response and continue REACT loop
        const modelResponse = msg.payload;
        const validated = node.modelValidator.parseAndValidate(modelResponse);
        
        // Update envelope with model response
        execution.envelope.model.lastResponse = validated;
        execution.envelope.state.lastAction = validated.action;
        execution.envelope.observability.events.push({
          iteration: execution.envelope.state.iteration,
          action: 'model_response',
          confidence: validated.confidence,
          tool: validated.tool
        });

        // Continue REACT loop
        node.reactStrategy.continueLoop(execution.envelope, {
          sendToModel: (modelMsg) => {
            send([modelMsg, null, null, null]);
          },
          sendToTool: (toolMsg) => {
            send([null, toolMsg, null, null]);
          },
          sendToMemory: (memoryMsg) => {
            send([null, null, memoryMsg, null]);
          },
          onComplete: (finalEnvelope) => {
            // Extraer el mensaje del modelo si existe
            const modelMessage = finalEnvelope.model?.lastResponse?.message || 
                                 finalEnvelope.model?.lastResponse?.input?.message ||
                                 null;
            
            const resultMsg = {
              ...msg,
              // Si hay un mensaje del modelo, usarlo como payload principal
              // Si no, usar el envelope completo
              payload: modelMessage || finalEnvelope,
              // Preservar el envelope completo en una propiedad separada
              envelope: finalEnvelope,
              agentResult: {
                completed: finalEnvelope.state.completed,
                iterations: finalEnvelope.state.iteration,
                traceId: finalEnvelope.observability.traceId,
                message: modelMessage
              }
            };
            send([null, null, null, resultMsg]);
            node.activeExecutions.delete(traceId);
            if (done) done();
          },
          onError: (error) => {
            node.error(`[agent-core] Execution error: ${error.message}`, msg);
            node.activeExecutions.delete(traceId);
            if (done) done(error);
          },
          log: (message) => {
            if (node.debug) {
              node.log(`[agent-core] ${message}`);
            }
          }
        }, validated);
        
        return;
      }

      // This is a new input - initialize new execution
      const envelope = node.envelopeManager.createEnvelope(msg.payload, node.allowedTools);
      
      // Store execution context
      const executionId = envelope.observability.traceId;
      node.activeExecutions.set(executionId, {
        envelope,
        send,
        done,
        startedAt: Date.now()
      });

      // Start REACT loop
      node.reactStrategy.execute(envelope, {
        sendToModel: (modelMsg) => {
          // Output 0: model
          send([modelMsg, null, null, null]);
        },
        sendToTool: (toolMsg) => {
          // Output 1: tool
          send([null, toolMsg, null, null]);
        },
        sendToMemory: (memoryMsg) => {
          // Output 2: memory
          send([null, null, memoryMsg, null]);
        },
        onComplete: (finalEnvelope) => {
          // Output 3: result
          // Extraer el mensaje del modelo si existe
          const modelMessage = finalEnvelope.model?.lastResponse?.message || 
                               finalEnvelope.model?.lastResponse?.input?.message ||
                               null;
          
          const resultMsg = {
            ...msg,
            // Si hay un mensaje del modelo, usarlo como payload principal
            // Si no, usar el envelope completo
            payload: modelMessage || finalEnvelope,
            // Preservar el envelope completo en una propiedad separada
            envelope: finalEnvelope,
            agentResult: {
              completed: finalEnvelope.state.completed,
              iterations: finalEnvelope.state.iteration,
              traceId: finalEnvelope.observability.traceId,
              message: modelMessage
            }
          };
          send([null, null, null, resultMsg]);
          
          // Cleanup
          node.activeExecutions.delete(executionId);
          
          if (done) {
            done();
          }
        },
        onError: (error) => {
          node.error(`[agent-core] Execution error: ${error.message}`, msg);
          node.activeExecutions.delete(executionId);
          
          if (done) {
            done(error);
          }
        },
        log: (message) => {
          if (node.debug) {
            node.log(`[agent-core] ${message}`);
          }
        }
      });

    } catch (err) {
      if (done) {
        done(err);
      } else {
        node.error(err, msg);
      }
    }
  });

  /**
   * Cleanup on node close
   */
  node.on('close', function() {
    // Cleanup active executions
    node.activeExecutions.clear();
    
    if (node.debug) {
      node.log('[agent-core] Node closing');
    }
  });
}

module.exports = AgentCoreNode;
