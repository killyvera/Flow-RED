/**
 * Test rápido de conexión a Azure OpenAI
 * 
 * Ejecutar: node scripts/test-azure-openai-connection.js
 */

const AzureOpenAIClient = require('../plugins/agent-core/lib/models/azure-openai/AzureOpenAIClient')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Cargar credenciales desde redflow-persistent-storage.json
function loadCredentials() {
  const userDir = path.join(os.homedir(), '.node-red')
  const storageFile = path.join(userDir, 'redflow-persistent-storage.json')
  
  if (!fs.existsSync(storageFile)) {
    console.error('❌ Archivo de almacenamiento no encontrado:', storageFile)
    return null
  }
  
  try {
    const storageData = JSON.parse(fs.readFileSync(storageFile, 'utf8'))
    
    // Buscar credenciales de Azure OpenAI
    for (const [key, value] of Object.entries(storageData)) {
      if (key.startsWith('encrypted:credential:')) {
        // Las credenciales están encriptadas, necesitaríamos desencriptarlas
        // Por ahora, intentar desde variable de entorno
        console.log('⚠️  Credenciales encontradas pero encriptadas. Usando variable de entorno AZURE_OPENAI_API_KEY')
        break
      }
    }
    
    // También buscar en node-credentials
    for (const [key, value] of Object.entries(storageData)) {
      if (key.startsWith('encrypted:node-credentials:')) {
        console.log('⚠️  Credenciales de nodo encontradas pero encriptadas. Usando variable de entorno AZURE_OPENAI_API_KEY')
        break
      }
    }
    
    return null
  } catch (error) {
    console.error('❌ Error al leer almacenamiento:', error.message)
    return null
  }
}

async function testConnection() {
  console.log('🧪 Test de conexión a Azure OpenAI\n')
  
  // Intentar cargar desde almacenamiento (si no está encriptado)
  const credentials = loadCredentials()
  
  // Obtener configuración desde variables de entorno o argumentos
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.argv[2]
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.argv[3]
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.argv[4] || '2024-02-15-preview'
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.argv[5]
  
  if (!endpoint || !deployment || !apiKey) {
    console.error('❌ Faltan parámetros requeridos')
    console.log('\nUso:')
    console.log('  node scripts/test-azure-openai-connection.js <endpoint> <deployment> [apiVersion] [apiKey]')
    console.log('\nO configura variables de entorno:')
    console.log('  AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com')
    console.log('  AZURE_OPENAI_DEPLOYMENT=nombre-deployment')
    console.log('  AZURE_OPENAI_API_VERSION=2024-02-15-preview (opcional)')
    console.log('  AZURE_OPENAI_API_KEY=tu-api-key')
    console.log('\nEjemplo:')
    console.log('  node scripts/test-azure-openai-connection.js https://my-resource.openai.azure.com gpt-4 2024-02-15-preview sk-...')
    process.exit(1)
  }
  
  console.log('📋 Configuración:')
  console.log(`   Endpoint: ${endpoint}`)
  console.log(`   Deployment: ${deployment}`)
  console.log(`   API Version: ${apiVersion}`)
  console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log('')
  
  try {
    // Crear cliente
    console.log('🔧 Creando cliente...')
    const client = new AzureOpenAIClient({
      endpoint,
      deployment,
      apiVersion,
      apiKey,
      temperature: 0,
      maxTokens: 50,
      timeoutMs: 15000
    })
    
    // Construir URL y mostrarla
    const url = client.buildUrl()
    console.log(`   URL construida: ${url}`)
    console.log(`   Endpoint base: ${endpoint}`)
    console.log(`   Deployment: ${deployment}`)
    console.log(`   API Version: ${apiVersion}`)
    console.log('')
    
    // Enviar petición de prueba
    console.log('📤 Enviando petición de prueba...')
    const systemPrompt = 'You are a test assistant. Respond only with the word "OK" in valid JSON format.'
    const userPrompt = 'Test connection'
    
    const startTime = Date.now()
    const response = await client.sendChatCompletion(systemPrompt, userPrompt, [], 'test-trace-id')
    const duration = Date.now() - startTime
    
    console.log('✅ Conexión exitosa!')
    console.log('')
    console.log('📥 Respuesta:')
    console.log(`   Content: ${response.content}`)
    console.log(`   Duration: ${duration}ms`)
    console.log(`   Tokens: ${response.metadata.totalTokens} (prompt: ${response.metadata.promptTokens}, completion: ${response.metadata.completionTokens})`)
    console.log('')
    
    // Verificar que la respuesta es JSON válido
    try {
      const jsonResponse = JSON.parse(response.content)
      console.log('✅ Respuesta es JSON válido:', jsonResponse)
    } catch (parseError) {
      console.warn('⚠️  Respuesta no es JSON válido, pero la conexión funcionó')
    }
    
  } catch (error) {
    console.error('❌ Error en la conexión:')
    console.error(`   Code: ${error.code || 'UNKNOWN'}`)
    console.error(`   Message: ${error.message}`)
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`)
    }
    if (error.deployment) {
      console.error(`   Deployment: ${error.deployment}`)
    }
    if (error.endpoint) {
      console.error(`   Endpoint: ${error.endpoint}`)
    }
    process.exit(1)
  }
}

// Ejecutar test
testConnection().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})

