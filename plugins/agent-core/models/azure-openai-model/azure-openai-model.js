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
    // Node-RED espera que la función constructora modifique 'this' directamente
    // No debe retornar una nueva instancia, sino inicializar 'this'
    AzureOpenAIModelNode.call(this, RED, config);
  }

  // Registrar el nodo
  // NOTA: Si el nodo ya está registrado (por ejemplo, si Node-RED lo detectó automáticamente
  // desde el archivo .html), Node-RED lanzará un error. Esto es normal y se puede ignorar.
  RED.nodes.registerType('model.azure.openai', AzureOpenAIModelNodeWrapper);
  
  RED.log.info('[agent-core] Nodo model.azure.openai registrado exitosamente');
};

