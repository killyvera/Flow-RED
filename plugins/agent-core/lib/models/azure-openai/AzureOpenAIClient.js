const https = require('https');
const http = require('http');

/**
 * Cliente HTTP para Azure OpenAI Chat Completions API
 * 
 * Este cliente maneja la comunicación con Azure OpenAI, construyendo
 * requests con formato JSON estricto y manejando timeouts.
 */
class AzureOpenAIClient {
  /**
   * @param {Object} config - Configuración del cliente
   * @param {string} config.endpoint - Azure OpenAI endpoint (https://xxx.openai.azure.com)
   * @param {string} config.deployment - Nombre del deployment
   * @param {string} config.apiVersion - Versión de la API
   * @param {number} config.temperature - Temperature (0-1)
   * @param {number} config.maxTokens - Máximo de tokens
   * @param {number} config.timeoutMs - Timeout en milisegundos
   */
  constructor(config) {
    // Normalizar endpoint: remover barras finales y espacios
    this.endpoint = (config.endpoint || '').trim().replace(/\/+$/, '');
    this.deployment = config.deployment;
    this.apiVersion = config.apiVersion || '2024-12-01-preview';
    this.temperature = config.temperature !== undefined ? config.temperature : 0;
    this.maxTokens = config.maxTokens || 800;
    this.timeoutMs = config.timeoutMs || 15000;
    
    // API key: primero desde config, luego desde variable de entorno
    this.apiKey = config.apiKey || process.env.AZURE_OPENAI_API_KEY;

    if (!this.apiKey) {
      throw new Error('API key is required. Configure it in the node settings or set AZURE_OPENAI_API_KEY environment variable');
    }
    
    // Validar que el endpoint sea válido
    if (!this.endpoint) {
      throw new Error('Endpoint is required');
    }
    
    // Validar formato del endpoint
    if (!this.endpoint.startsWith('http://') && !this.endpoint.startsWith('https://')) {
      throw new Error('Endpoint must start with http:// or https://');
    }
  }

  /**
   * Construye la URL del endpoint
   * @returns {string} URL completa
   */
  buildUrl() {
    // Normalizar endpoint: remover barras finales y espacios
    let normalizedEndpoint = this.endpoint.trim().replace(/\/+$/, '');
    
    // Asegurar que no tenga protocolo duplicado o paths incorrectos
    // Si el endpoint ya incluye /openai, no agregarlo de nuevo
    if (normalizedEndpoint.includes('/openai')) {
      // El endpoint ya tiene el path /openai, usar tal cual
      return `${normalizedEndpoint}/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    }
    
    // Construir URL estándar de Azure OpenAI
    return `${normalizedEndpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
  }

  /**
   * Envía un request a Azure OpenAI Chat Completions
   * 
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {Array} tools - Array de tools (opcional)
   * @param {string} traceId - Trace ID para observabilidad
   * @returns {Promise<Object>} Respuesta con content, metadata y traceId
   * @throws {Error} En caso de timeout, HTTP error o JSON inválido
   */
  async sendChatCompletion(systemPrompt, userPrompt, tools, traceId) {
    const startTime = Date.now();

    const requestBody = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: {
        type: 'json_object'
      }
    };

    const url = this.buildUrl();
    const parsedUrl = new URL(url);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        timeout: this.timeoutMs
      };

      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const durationMs = Date.now() - startTime;

          if (res.statusCode !== 200) {
            // Intentar parsear el error para dar un mensaje más descriptivo
            let errorMessage = `HTTP ${res.statusCode}: ${data}`;
            try {
              const errorData = JSON.parse(data);
              if (res.statusCode === 404) {
                errorMessage = `Deployment "${this.deployment}" not found. ` +
                  `Please verify:\n` +
                  `1. The deployment name is correct in your Azure OpenAI resource\n` +
                  `2. The endpoint is correct: ${this.endpoint}\n` +
                  `3. The deployment exists and is active\n` +
                  `Error details: ${errorData.error?.message || data}`;
              } else if (res.statusCode === 401) {
                errorMessage = `Authentication failed. Please verify your API key is correct.`;
              } else if (res.statusCode === 403) {
                errorMessage = `Access forbidden. Please verify your API key has the correct permissions.`;
              } else if (errorData.error?.message) {
                errorMessage = `HTTP ${res.statusCode}: ${errorData.error.message}`;
              }
            } catch (parseError) {
              // Si no se puede parsear, usar el mensaje original
            }
            
            return reject({
              code: 'AZURE_OPENAI_HTTP_ERROR',
              message: errorMessage,
              statusCode: res.statusCode,
              traceId,
              durationMs,
              deployment: this.deployment,
              endpoint: this.endpoint
            });
          }

          try {
            const response = JSON.parse(data);
            const content = response.choices?.[0]?.message?.content;

            if (!content) {
              return reject({
                code: 'AZURE_OPENAI_MISSING_CONTENT',
                message: 'No content in response',
                traceId,
                durationMs
              });
            }

            const metadata = {
              model: 'azure-openai',
              deployment: this.deployment,
              promptTokens: response.usage?.prompt_tokens || 0,
              completionTokens: response.usage?.completion_tokens || 0,
              totalTokens: response.usage?.total_tokens || 0,
              durationMs,
              traceId
            };

            resolve({
              content,
              metadata
            });
          } catch (error) {
            reject({
              code: 'AZURE_OPENAI_JSON_PARSE_ERROR',
              message: `Failed to parse response: ${error.message}`,
              traceId,
              durationMs
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          code: 'AZURE_OPENAI_TIMEOUT',
          message: `Request timeout after ${this.timeoutMs}ms`,
          traceId,
          durationMs: this.timeoutMs
        });
      });

      req.on('error', (error) => {
        reject({
          code: 'AZURE_OPENAI_REQUEST_ERROR',
          message: error.message,
          traceId,
          durationMs: Date.now() - startTime
        });
      });

      req.write(JSON.stringify(requestBody));
      req.end();
    });
  }
}

module.exports = AzureOpenAIClient;

