/**
 * Agent Core Node - REACT Strategy Orchestrator
 * 
 * This is the Node-RED node implementation file.
 * The corresponding HTML editor file is agent-core.html
 * 
 * @module agent-core
 */

const AgentCoreNode = require('./lib/AgentCoreNode');

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
   * Optional: Register custom HTTP endpoints for agent-core
   * (if needed for debugging or monitoring)
   */
  RED.httpAdmin.get('/agent-core/schema', function(req, res) {
    try {
      const schema = require('./schemas/agent-core.react.schema.json');
      res.json(schema);
    } catch (err) {
      res.status(500).json({ error: 'Schema not found' });
    }
  });

  // Log successful registration
  RED.log.info('[agent-core] Plugin loaded successfully');
};

