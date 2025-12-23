/**
 * Azure OpenAI Model Node
 * Entry point del plugin para Node-RED
 * 
 * Este nodo es un componente del sistema de agentes Redflow.
 * Representa SOLO un modelo de lenguaje que recibe prompts y retorna decisiones JSON.
 */

const AzureOpenAIModelNode = require('../../lib/models/azure-openai/AzureOpenAIModelNode');

module.exports = function(RED) {
  function AzureOpenAIModelNodeWrapper(config) {
    return new AzureOpenAIModelNode(RED, config);
  }

  RED.nodes.registerType('model.azure.openai', AzureOpenAIModelNodeWrapper);
};

