/**
 * Agent Core Node - REACT Strategy Orchestrator
 * 
 * This is the main entry point for the agent-core plugin for Node-RED.
 * 
 * The Agent Core node is an orchestrator that implements the REACT (Reason → Act) strategy
 * for AI agent workflows. It does NOT call APIs, execute SQL, or store data directly.
 * It ONLY orchestrates, validates, and routes messages between nodes.
 * 
 * @module agent-core
 */

const AgentCoreNode = require('./lib/AgentCoreNode');
const AzureOpenAIModelNode = require('./models/azure-openai-model/azure-openai-model');

module.exports = function(RED) {
  /**
   * Register the agent-core node type with Node-RED
   * 
   * This makes the node available in the Node-RED palette and allows
   * users to add it to their flows.
   */
  function AgentCoreNodeWrapper(config) {
    AgentCoreNode.call(this, RED, config);
  }
  
  RED.nodes.registerType('agent-core', AgentCoreNodeWrapper);

  /**
   * Register Azure OpenAI Model Node as a subtool of agent-core
   * 
   * This model node is part of the agent-core plugin and provides
   * Azure OpenAI integration for the agent system.
   */
  AzureOpenAIModelNode(RED);

  /**
   * Optional: Register custom HTTP endpoints for agent-core
   * (if needed for debugging or monitoring)
   */
  RED.httpAdmin.get('/agent-core/schema', function(req, res) {
    const schema = require('./schemas/agent-core.react.schema.json');
    res.json(schema);
  });

  // Log successful registration
  RED.log.info('[agent-core] Plugin loaded successfully');
};

