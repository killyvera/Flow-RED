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
  node.strategy = config.strategy || 'react';
  node.maxIterations = parseInt(config.maxIterations) || 5;
  node.allowedTools = config.allowedTools || [];
  node.stopConditions = config.stopConditions || [];
  node.debug = config.debug || false;

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

      // Initialize agent envelope
      const envelope = node.envelopeManager.initialize(msg);

      // Execute REACT strategy
      node.reactStrategy.execute(envelope, {
        node: node,
        send: send,
        modelValidator: node.modelValidator
      }, (err, result) => {
        if (err) {
          node.error(`[agent-core] Execution error: ${err.message}`, msg);
          done(err);
          return;
        }

        // Send final output
        send([result, null]); // [data output, debug output]
        done();
      });

    } catch (err) {
      node.error(`[agent-core] Unexpected error: ${err.message}`, msg);
      done(err);
    }
  });

  /**
   * Handle node close
   */
  node.on('close', function() {
    // Cleanup resources
    if (node.debug) {
      node.log('[agent-core] Node closing');
    }
  });
}

module.exports = AgentCoreNode;

