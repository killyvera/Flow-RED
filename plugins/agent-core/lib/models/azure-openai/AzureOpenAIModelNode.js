const AzureOpenAIClient = require('./AzureOpenAIClient');
const ResponseValidator = require('./ResponseValidator');

/**
 * Nodo Model para Azure OpenAI
 * 
 * Este nodo representa SOLO un modelo de lenguaje. NO orquesta, NO ejecuta tools,
 * NO maneja memoria. Solo recibe prompts del Agent Core y retorna respuestas JSON estrictas.
 * 
 * INPUT CONTRACT (Agent Core → Model):
 * {
 *   systemPrompt: string,
 *   userPrompt: string,
 *   tools: Array<{ name: string, description?: string, inputSchema: object }>,
 *   traceId: string
 * }
 * 
 * OUTPUT CONTRACT (Model → Agent Core):
 * {
 *   action: "tool" | "final",
 *   tool: string | null,
 *   input: object,
 *   confidence: number (0-1),
 *   message: string
 * }
 */
class AzureOpenAIModelNode {
  constructor(RED, config) {
    RED.nodes.createNode(this, config);

    this.config = {
      endpoint: config.endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion || '2024-02-15-preview',
      apiKey: config.apiKey, // API key desde configuración (opcional, puede venir de env var)
      temperature: config.temperature !== undefined ? config.temperature : 0,
      maxTokens: config.maxTokens || 800,
      timeoutMs: config.timeoutMs || 15000
    };

    // Validar configuración
    if (!this.config.endpoint) {
      this.error('Missing required config: endpoint');
      return;
    }
    if (!this.config.deployment) {
      this.error('Missing required config: deployment');
      return;
    }

    // Inicializar cliente
    try {
      this.client = new AzureOpenAIClient(this.config);
    } catch (error) {
      this.error(`Failed to initialize Azure OpenAI client: ${error.message}`);
      return;
    }

    // Manejar mensajes entrantes
    this.on('input', async (msg, send, done) => {
      try {
        // Validar que el mensaje venga del Agent Core
        const input = msg.payload;

        if (!input || typeof input !== 'object') {
          throw new Error('Invalid input: payload must be an object');
        }

        // Extraer ModelInput
        const systemPrompt = input.systemPrompt;
        const userPrompt = input.userPrompt;
        const tools = input.tools || [];
        const traceId = input.traceId || `trace-${Date.now()}`;

        if (!systemPrompt || !userPrompt) {
          throw new Error('Missing required fields: systemPrompt and userPrompt');
        }

        // Validar tools
        if (!ResponseValidator.validateTools(tools)) {
          throw new Error('Invalid tools format');
        }

        // Log inicio (sin contenido de prompts)
        this.log(`[${traceId}] Sending request to Azure OpenAI (deployment: ${this.config.deployment})`);

        // Enviar request a Azure OpenAI
        const response = await this.client.sendChatCompletion(
          systemPrompt,
          userPrompt,
          tools,
          traceId
        );

        // Validar respuesta
        const validatedResponse = ResponseValidator.validate(response.content, traceId);

        // Emitir metadata para observabilidad (sin contenido de prompts)
        this.log(`[${traceId}] Request completed: ${response.metadata.durationMs}ms, ${response.metadata.totalTokens} tokens`);

        // Preparar mensaje de salida
        const outputMsg = {
          payload: validatedResponse,
          metadata: response.metadata,
          _msgid: msg._msgid
        };

        // Enviar respuesta
        send(outputMsg);
        done();

      } catch (error) {
        // Manejar errores estructurados
        const errorMsg = {
          code: error.code || 'AZURE_OPENAI_ERROR',
          message: error.message || 'Unknown error',
          traceId: error.traceId || 'unknown',
          durationMs: error.durationMs,
          statusCode: error.statusCode
        };

        this.error(`[${errorMsg.traceId}] ${errorMsg.code}: ${errorMsg.message}`, msg);

        // Emitir error como mensaje (para que el Agent Core pueda manejarlo)
        const errorOutputMsg = {
          payload: {
            error: errorMsg
          },
          _msgid: msg._msgid
        };

        send(errorOutputMsg);
        done();
      }
    });

    this.on('close', () => {
      // Cleanup si es necesario
    });
  }
}

module.exports = AzureOpenAIModelNode;

