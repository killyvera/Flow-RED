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
        node.log('[agent-core] Message keys: ' + Object.keys(msg).join(', '));
        node.log('[agent-core] _agentCore: ' + JSON.stringify(msg._agentCore));
      }

      // Check if this is a model response (has _agentCore metadata)
      if (msg._agentCore && msg._agentCore.type === 'model_response') {
        if (node.debug) {
          node.log('[agent-core] Detected model response, traceId: ' + msg._agentCore.traceId);
        }
        // This is a response from the model - continue existing execution
        const traceId = msg._agentCore.traceId;
        const execution = node.activeExecutions.get(traceId);
        
        if (!execution) {
          // La ejecución ya se completó o no existe
          // Esto puede suceder si:
          // 1. La ejecución se completó antes de que llegara esta respuesta (mensaje duplicado/tardío)
          // 2. El mensaje viene de una ejecución anterior que ya terminó
          // 3. Hay un loop en las conexiones que está reenviando mensajes
          
          // Verificar si el mensaje tiene chatEvent para evitar procesarlo como respuesta del modelo
          if (msg.chatEvent === 'message_sent') {
            // Este es un mensaje nuevo del chat, no una respuesta del modelo
            // Continuar con el flujo normal de nuevo input
            if (node.debug) {
              node.log('[agent-core] Ignoring model_response with chatEvent (likely duplicate/loop)');
            }
          } else {
            // Es una respuesta del modelo que llegó tarde o duplicada
            // Log pero no error (para no saturar los logs)
            if (node.debug) {
              node.log(`[agent-core] Received model response for unknown traceId: ${traceId} (execution already completed or not found)`);
              node.log(`[agent-core] Active executions: ${Array.from(node.activeExecutions.keys()).join(', ')}`);
            }
          }
          if (done) done();
          return;
        }

        // Check if the payload contains an error (from model node)
        if (msg.payload && typeof msg.payload === 'object' && msg.payload.error) {
          const error = msg.payload.error;
          node.error(`[agent-core] Model node returned error: ${error.code || 'UNKNOWN'}: ${error.message || 'Unknown error'}`, msg);
          
          // Stop execution and send error to output
          const errorMsg = {
            ...msg,
            payload: {
              error: error,
              envelope: execution.envelope
            },
            agentResult: {
              completed: false,
              iterations: execution.envelope.state.iteration,
              traceId: execution.envelope.observability.traceId,
              error: error
            }
          };
          // Output 3: result (error también va al resultado)
          // Output 4: model_response (también enviar el error como respuesta del modelo)
          send([null, null, null, errorMsg, errorMsg]);
          node.activeExecutions.delete(traceId);
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

        // IMPORTANTE: Enviar la respuesta del modelo al output 4 (model_response)
        // Esto permite conectar la respuesta del modelo directamente a debug/webhook/http nodes
        const modelResponseMsg = {
          ...msg,
          payload: validated,
          envelope: execution.envelope,
          agentResult: {
            iteration: execution.envelope.state.iteration,
            traceId: execution.envelope.observability.traceId,
            action: validated.action,
            tool: validated.tool,
            confidence: validated.confidence,
            message: validated.message || validated.input?.message || null
          }
        };
        // Output 4: model_response (nueva salida para respuestas del modelo)
        send([null, null, null, null, modelResponseMsg]);

        // Continue REACT loop
        node.reactStrategy.continueLoop(execution.envelope, {
          sendToModel: (modelMsg) => {
            // Output 0: model
            send([modelMsg, null, null, null, null]);
          },
          sendToTool: (toolMsg) => {
            // Output 1: tool
            send([null, toolMsg, null, null, null]);
          },
          sendToMemory: (memoryMsg) => {
            // Output 2: memory
            send([null, null, memoryMsg, null, null]);
          },
          onComplete: (finalEnvelope) => {
            // Output 3: result (resultado final del agent)
            // Extraer el mensaje del modelo si existe
            const modelMessage = finalEnvelope.model?.lastResponse?.message || 
                                 finalEnvelope.model?.lastResponse?.input?.message ||
                                 finalEnvelope.model?.lastResponse?.payload?.message ||
                                 null;
            
            const resultMsg = {
              ...msg,
              // Si hay un mensaje del modelo, usarlo como payload principal
              // Si no, usar el envelope completo
              payload: modelMessage || finalEnvelope.model?.lastResponse || finalEnvelope,
              // Preservar el envelope completo en una propiedad separada
              envelope: finalEnvelope,
              agentResult: {
                completed: finalEnvelope.state.completed,
                iterations: finalEnvelope.state.iteration,
                traceId: finalEnvelope.observability.traceId,
                message: modelMessage,
                finalAction: finalEnvelope.state.lastAction
              }
            };
            send([null, null, null, resultMsg, null]);
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
          send([modelMsg, null, null, null, null]);
        },
        sendToTool: (toolMsg) => {
          // Output 1: tool
          send([null, toolMsg, null, null, null]);
        },
        sendToMemory: (memoryMsg) => {
          // Output 2: memory
          send([null, null, memoryMsg, null, null]);
        },
        onComplete: (finalEnvelope) => {
          // Output 3: result (resultado final del agent)
          // Extraer el mensaje del modelo si existe
          const modelMessage = finalEnvelope.model?.lastResponse?.message || 
                               finalEnvelope.model?.lastResponse?.input?.message ||
                               finalEnvelope.model?.lastResponse?.payload?.message ||
                               null;
          
          const resultMsg = {
            ...msg,
            // Si hay un mensaje del modelo, usarlo como payload principal
            // Si no, usar el envelope completo
            payload: modelMessage || finalEnvelope.model?.lastResponse || finalEnvelope,
            // Preservar el envelope completo en una propiedad separada
            envelope: finalEnvelope,
            agentResult: {
              completed: finalEnvelope.state.completed,
              iterations: finalEnvelope.state.iteration,
              traceId: finalEnvelope.observability.traceId,
              message: modelMessage,
              finalAction: finalEnvelope.state.lastAction
            }
          };
          send([null, null, null, resultMsg, null]);
          
          // Cleanup
          node.activeExecutions.delete(executionId);
          
          if (done) {
            done();
          }
        },
        onError: (error) => {
          node.error(`[agent-core] Execution error: ${error.message}`, msg);
          
          // Enviar error a output 3 (result) y output 4 (model_response)
          const errorMsg = {
            ...msg,
            payload: {
              error: {
                code: 'EXECUTION_ERROR',
                message: error.message
              },
              envelope: envelope
            },
            agentResult: {
              completed: false,
              iterations: envelope.state.iteration,
              traceId: envelope.observability.traceId,
              error: error.message
            }
          };
          send([null, null, null, errorMsg, errorMsg]);
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
