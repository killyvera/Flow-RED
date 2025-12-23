/**
 * Endpoint HTTP para probar conexión a Azure OpenAI
 * 
 * Este endpoint permite probar las credenciales de Azure OpenAI
 * desde el frontend antes de guardar la configuración del nodo.
 */

const AzureOpenAIClient = require('./models/azure-openai/AzureOpenAIClient')

/**
 * Registra el endpoint HTTP para test de conexión
 * @param {Object} RED - Node-RED runtime
 */
function registerTestEndpoint(RED) {
  RED.httpAdmin.post('/azure-openai/test-connection', async (req, res) => {
    try {
      const { endpoint, deployment, apiVersion, apiKey } = req.body

      // Validar parámetros requeridos
      if (!endpoint || !deployment || !apiVersion) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: endpoint, deployment, and apiVersion are required'
        })
      }

      // Si no hay apiKey en el body, intentar desde variable de entorno
      // Prioridad: apiKey del request > variable de entorno
      const finalApiKey = apiKey || process.env.AZURE_OPENAI_API_KEY || ''

      if (!finalApiKey) {
        return res.status(400).json({
          success: false,
          error: 'API key is required. Provide it in the request or set AZURE_OPENAI_API_KEY environment variable'
        })
      }

      // Crear cliente de Azure OpenAI
      const client = new AzureOpenAIClient({
        endpoint,
        deployment,
        apiVersion,
        apiKey: finalApiKey,
        temperature: 0,
        maxTokens: 10, // Solo necesitamos una respuesta corta para el test
        timeoutMs: 10000 // 10 segundos de timeout para el test
      })

      // Enviar petición de prueba con un mensaje simple
      const testSystemPrompt = 'You are a test assistant. Respond only with the word "OK" in JSON format.'
      const testUserPrompt = 'Test connection'

      const response = await client.sendChatCompletion(
        testSystemPrompt,
        testUserPrompt,
        [],
        'test-connection-' + Date.now()
      )

      // Si llegamos aquí, la conexión fue exitosa
      res.json({
        success: true,
        message: 'Connection successful',
        metadata: response.metadata
      })

    } catch (error) {
      // Capturar y devolver el error de forma estructurada
      const errorResponse = {
        success: false,
        error: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN_ERROR'
      }

      // Agregar información adicional según el tipo de error
      if (error.statusCode) {
        errorResponse.statusCode = error.statusCode
      }

      if (error.durationMs) {
        errorResponse.durationMs = error.durationMs
      }

      // Determinar el código de estado HTTP apropiado
      let httpStatus = 500
      if (error.code === 'AZURE_OPENAI_TIMEOUT') {
        httpStatus = 504 // Gateway Timeout
      } else if (error.statusCode) {
        httpStatus = error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500
      } else if (error.code === 'AZURE_OPENAI_REQUEST_ERROR') {
        httpStatus = 503 // Service Unavailable
      }

      res.status(httpStatus).json(errorResponse)
    }
  })
}

module.exports = { registerTestEndpoint }

