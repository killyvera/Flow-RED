/**
 * Agent Core Node - REACT Strategy Orchestrator
 * 
 * This is the Node-RED node implementation file.
 * The corresponding HTML editor file is agent-core.html
 * 
 * @module agent-core
 */

const AgentCoreNode = require('./lib/AgentCoreNode');
const AzureOpenAIModelNode = require('./models/azure-openai-model/azure-openai-model');
const { registerTestEndpoint } = require('./lib/test-connection');

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
   * Register HTTP endpoint for testing Azure OpenAI connection
   */
  registerTestEndpoint(RED);

  /**
   * Register endpoint to get node credentials from Redflow storage
   * This allows nodes to read credentials from our custom storage system
   * instead of depending on Node-RED's credential system
   */
  RED.httpAdmin.get('/agent-core/node-credentials/:nodeId', function(req, res) {
    try {
      const nodeId = req.params.nodeId;
      if (!nodeId) {
        return res.status(400).json({ error: 'nodeId is required' });
      }

      // Leer desde redflow-persistent-storage
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const userDir = RED.settings.userDir || path.join(os.homedir(), '.node-red');
      const storageFile = path.join(userDir, 'redflow-persistent-storage.json');
      
      if (!fs.existsSync(storageFile)) {
        return res.status(404).json({ error: 'Storage file not found' });
      }

      const storageData = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      
      // Buscar credenciales del nodo
      // Las credenciales se almacenan con la clave: node-credentials:{nodeId}
      const credentialKey = `node-credentials:${nodeId}`;
      let credentialData = storageData[credentialKey];
      
      // Si no se encuentra, buscar también con prefijo encrypted (para compatibilidad)
      if (!credentialData) {
        const encryptedKey = `encrypted:node-credentials:${nodeId}`;
        credentialData = storageData[encryptedKey];
      }
      
      if (!credentialData) {
        // También buscar en node-config (puede tener credentialId)
        const nodeConfigKey = `node-config:${nodeId}`;
        let nodeConfig = storageData[nodeConfigKey];
        
        // Si no se encuentra, buscar con prefijo encrypted
        if (!nodeConfig) {
          const encryptedConfigKey = `encrypted:node-config:${nodeId}`;
          nodeConfig = storageData[encryptedConfigKey];
        }
        
        if (nodeConfig) {
          // nodeConfig puede ser un objeto con estructura { nodeId, nodeType, config, updatedAt }
          // o directamente el config
          const config = nodeConfig.config || nodeConfig;
          
          if (config && config.credentialId) {
            // Si el nodo tiene un credentialId, buscar la credencial centralizada
            const credentialId = config.credentialId;
            const centralCredentialKey = `credential:${credentialId}`;
            let centralCredential = storageData[centralCredentialKey];
            
            // Si no se encuentra, buscar con prefijo encrypted
            if (!centralCredential) {
              const encryptedCredentialKey = `encrypted:credential:${credentialId}`;
              centralCredential = storageData[encryptedCredentialKey];
            }
            
            if (centralCredential) {
              // centralCredential puede ser un objeto con estructura { id, name, type, data, ... }
              // o directamente los datos
              const credentialData = centralCredential.data || centralCredential;
              
              // Retornar los datos de la credencial centralizada
              return res.json({
                nodeId: nodeId,
                credentialId: credentialId,
                data: credentialData
              });
            }
          }
        }
        
        return res.status(404).json({ error: 'Credentials not found for node' });
      }

      // Retornar las credenciales
      // credentialData puede ser directamente el objeto de credenciales o estar envuelto
      const credentials = credentialData.value || credentialData;
      
      res.json({
        nodeId: nodeId,
        data: credentials
      });
    } catch (err) {
      RED.log.error(`[agent-core] Error al obtener credenciales del nodo: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

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

