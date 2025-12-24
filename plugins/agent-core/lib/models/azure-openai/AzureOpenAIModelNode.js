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
function AzureOpenAIModelNode(RED, config) {
  // Node-RED requiere que se llame a createNode en el contexto de 'this'
  RED.nodes.createNode(this, config);
  
  // Guardar referencia a RED para acceder a getCredentials más tarde
  this.RED = RED;
  this.nodeId = this.id;

  // Función helper para obtener credenciales desde nuestro sistema de almacenamiento (síncrona)
  const getCredentialsFromRedflowStorageSync = () => {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const userDir = RED.settings.userDir || path.join(os.homedir(), '.node-red');
      const storageFile = path.join(userDir, 'redflow-persistent-storage.json');
      
      if (!fs.existsSync(storageFile)) {
        return {};
      }

      const storageData = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      
      // Buscar credenciales del nodo
      const credentialKey = `node-credentials:${this.nodeId}`;
      let credentialData = storageData[credentialKey];
      
      // Si no se encuentra, buscar también con prefijo encrypted (para compatibilidad)
      if (!credentialData) {
        const encryptedKey = `encrypted:node-credentials:${this.nodeId}`;
        credentialData = storageData[encryptedKey];
      }
      
      if (!credentialData) {
        // También buscar en node-config (puede tener credentialId)
        const nodeConfigKey = `node-config:${this.nodeId}`;
        let nodeConfig = storageData[nodeConfigKey];
        
        // Si no se encuentra, buscar con prefijo encrypted
        if (!nodeConfig) {
          const encryptedConfigKey = `encrypted:node-config:${this.nodeId}`;
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
              credentialData = centralCredential.data || centralCredential;
            }
          }
        }
      }

      // Retornar las credenciales
      // credentialData puede ser directamente el objeto de credenciales o estar envuelto
      return credentialData ? (credentialData.value || credentialData) : {};
    } catch (err) {
      this.warn(`Error al obtener credenciales desde Redflow storage: ${err.message}`);
      return {};
    }
  };

  // Función helper para obtener credenciales desde nuestro sistema de almacenamiento (asíncrona, para uso en on('input'))
  const getCredentialsFromRedflowStorage = async () => {
    try {
      const http = require('http');
      const url = require('url');
      
      const adminUrl = RED.settings.httpAdminRoot || '/';
      const baseUrl = `http://localhost:${RED.settings.uiPort || 1880}${adminUrl}`;
      const credentialsUrl = `${baseUrl}agent-core/node-credentials/${this.nodeId}`;
      
      return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(credentialsUrl);
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.path,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                resolve(result.data || {});
              } catch (err) {
                reject(new Error(`Failed to parse credentials response: ${err.message}`));
              }
            } else if (res.statusCode === 404) {
              // No hay credenciales en nuestro sistema, retornar objeto vacío
              resolve({});
            } else {
              reject(new Error(`Failed to get credentials: HTTP ${res.statusCode}`));
            }
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.end();
      });
    } catch (err) {
      this.warn(`Error al obtener credenciales desde Redflow storage: ${err.message}`);
      return {};
    }
  };

  // Obtener credenciales: primero desde nuestro sistema (síncrono), luego desde Node-RED, luego variable de entorno
  const redflowCredentials = getCredentialsFromRedflowStorageSync();
  
  // Obtener credenciales del sistema de credenciales de Node-RED (fallback)
  const nodeRedCredentials = this.credentials || {};

  this.config = {
    endpoint: config.endpoint,
    deployment: config.deployment,
    apiVersion: config.apiVersion || '2024-12-01-preview',
    // Prioridad: Redflow storage > Node-RED credentials > variable de entorno
    apiKey: redflowCredentials.apiKey || nodeRedCredentials.apiKey || process.env.AZURE_OPENAI_API_KEY || '',
    temperature: config.temperature !== undefined ? config.temperature : 0,
    maxTokens: config.maxTokens || 800,
    timeoutMs: config.timeoutMs || 15000
  };
  
  // Log si se encontraron credenciales en nuestro sistema
  if (redflowCredentials.apiKey) {
    this.log('Credentials loaded from Redflow storage');
  }

  // Validar configuración
  if (!this.config.endpoint) {
    this.error('Missing required config: endpoint');
    return;
  }
  if (!this.config.deployment) {
    this.error('Missing required config: deployment');
    return;
  }

  // Inicializar cliente (permitir inicialización sin API key si se proporcionará después)
  // El cliente se inicializará cuando se reciba el primer mensaje si no hay API key ahora
  try {
    if (this.config.apiKey) {
      this.client = new AzureOpenAIClient(this.config);
    } else {
      // No inicializar el cliente aún, se inicializará en el primer input si hay API key
      this.client = null;
      this.warn('Azure OpenAI client not initialized: API key not found. Will attempt to initialize on first message.');
    }
  } catch (error) {
    this.error(`Failed to initialize Azure OpenAI client: ${error.message}`);
    this.client = null;
  }

  // Manejar mensajes entrantes
  this.on('input', async (msg, send, done) => {
      try {
        // Si el cliente no está inicializado, intentar inicializarlo ahora
        if (!this.client) {
          // Prioridad: Redflow storage > Node-RED credentials > variable de entorno
          let apiKey = '';
          
          try {
            // Método 1: Intentar obtener desde nuestro sistema de almacenamiento
            const redflowCreds = await getCredentialsFromRedflowStorage();
            if (redflowCreds && redflowCreds.apiKey) {
              apiKey = redflowCreds.apiKey;
              this.log('Retrieved API key from Redflow storage');
            }
          } catch (redflowErr) {
            // Continuar con otros métodos
            this.warn(`Could not retrieve credentials from Redflow storage: ${redflowErr.message}`);
          }
          
          // Método 2: Intentar obtener desde Node-RED credentials (fallback)
          if (!apiKey) {
            try {
              if (this.RED && this.RED.nodes) {
                // RED.nodes.getCredentials (si está disponible)
                if (typeof this.RED.nodes.getCredentials === 'function') {
                  try {
                    const updatedCredentials = this.RED.nodes.getCredentials(this.id);
                    if (updatedCredentials && updatedCredentials.apiKey) {
                      apiKey = updatedCredentials.apiKey;
                      this.log('Retrieved API key from Node-RED credentials (via getCredentials)');
                    }
                  } catch (getCredsErr) {
                    // Continuar con otros métodos
                  }
                }
                
                // Acceder directamente a las credenciales del nodo
                if (!apiKey && this.credentials && this.credentials.apiKey) {
                  apiKey = this.credentials.apiKey;
                  this.log('Retrieved API key from node credentials (cached)');
                }
              }
            } catch (err) {
              // Si falla, usar variable de entorno
              this.warn('Could not retrieve updated credentials from Node-RED runtime');
            }
          }
          
          // Fallback a variable de entorno
          if (!apiKey) {
            apiKey = process.env.AZURE_OPENAI_API_KEY || '';
          }
          
          if (apiKey) {
            this.config.apiKey = apiKey;
            try {
              this.client = new AzureOpenAIClient(this.config);
              this.log('Azure OpenAI client initialized successfully on first message');
            } catch (error) {
              this.error(`Failed to initialize Azure OpenAI client: ${error.message}`);
              const errorOutputMsg = {
                ...msg, // Preservar propiedades del mensaje original
                payload: {
                  error: {
                    code: 'CLIENT_INIT_ERROR',
                    message: error.message
                  }
                },
                _agentCore: {
                  type: 'model_response',
                  traceId: msg._agentCore?.traceId || 'unknown',
                  iteration: msg._agentCore?.iteration || 1
                },
                _msgid: msg._msgid
              };
              send(errorOutputMsg);
              done();
              return;
            }
          } else {
            this.error('API key is required. Configure it in the node settings or set AZURE_OPENAI_API_KEY environment variable');
            this.error('Tip: After saving credentials, you may need to redeploy the flow for the node to access them.');
            const errorOutputMsg = {
              ...msg, // Preservar propiedades del mensaje original
              payload: {
                error: {
                  code: 'MISSING_API_KEY',
                  message: 'API key is required. Configure it in the node settings or set AZURE_OPENAI_API_KEY environment variable. After saving credentials, redeploy the flow.'
                }
              },
              _agentCore: {
                type: 'model_response',
                traceId: msg._agentCore?.traceId || 'unknown',
                iteration: msg._agentCore?.iteration || 1
              },
              _msgid: msg._msgid
            };
            send(errorOutputMsg);
            done();
            return;
          }
        }

        // Validar que el mensaje venga del Agent Core
        const input = msg.payload;

        if (!input || typeof input !== 'object') {
          throw new Error('Invalid input: payload must be an object');
        }

        // Extraer ModelInput
        const systemPrompt = input.systemPrompt;
        const userPrompt = input.userPrompt;
        const tools = input.tools || [];
        // Prioridad: traceId del mensaje _agentCore > traceId del payload > generar nuevo
        const traceId = msg._agentCore?.traceId || input.traceId || `trace-${Date.now()}`;
        const iteration = msg._agentCore?.iteration || input.envelope?.iteration || 1;

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

        // Preparar mensaje de salida con metadata para Agent Core
        // IMPORTANTE: _agentCore debe estar en el nivel superior del mensaje
        // para que Agent Core pueda detectarlo
        const outputMsg = {
          ...msg, // Preservar propiedades del mensaje original
          payload: validatedResponse,
          metadata: response.metadata,
          _agentCore: {
            type: 'model_response',
            traceId: traceId,
            iteration: iteration
          }
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
        // IMPORTANTE: Incluir _agentCore para que Agent Core sepa que es una respuesta del modelo
        const errorOutputMsg = {
          ...msg, // Preservar propiedades del mensaje original
          payload: {
            error: errorMsg
          },
          _agentCore: {
            type: 'model_response',
            traceId: msg._agentCore?.traceId || traceId || 'unknown',
            iteration: msg._agentCore?.iteration || iteration || 1
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

module.exports = AzureOpenAIModelNode;

