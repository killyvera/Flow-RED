/**
 * Plugin de Node-RED para almacenamiento persistente
 * 
 * Permite al frontend guardar/cargar datos en un archivo JSON en .node-red
 * 
 * Endpoints:
 * - GET /redflow/persistent-storage - Obtiene todos los datos
 * - GET /redflow/persistent-storage/:key - Obtiene un valor específico
 * - POST /redflow/persistent-storage - Guarda/actualiza datos
 * - DELETE /redflow/persistent-storage/:key - Elimina un valor
 */

'use strict'

const fs = require('fs')
const path = require('path')

const STORAGE_FILE = 'redflow-persistent-storage.json'

/**
 * Inicializa el plugin de almacenamiento persistente
 */
function initPlugin(RED) {
  // Obtener configuración del plugin
  const config = {
    enabled: true,
    storageFile: STORAGE_FILE,
    debug: false,
    ...(RED.settings.persistentStorage || {})
  }
  
  // Verificar si el plugin está habilitado
  if (!config.enabled) {
    RED.log.info('[redflow-persistent-storage] Plugin deshabilitado (set persistentStorage.enabled = true en settings.js para habilitar)')
    return
  }
  
  // Log de inicio
  RED.log.info('[redflow-persistent-storage] Inicializando plugin de almacenamiento persistente...')
  
  function getStoragePath() {
    const userDir = RED.settings.userDir || path.join(require('os').homedir(), '.node-red')
    return path.join(userDir, config.storageFile)
  }
  
  const storagePath = getStoragePath()
  RED.log.info(`[redflow-persistent-storage] Archivo de almacenamiento: ${storagePath}`)
  
  if (config.debug) {
    RED.log.debug('[redflow-persistent-storage] Modo debug habilitado')
  }

  function loadStorage() {
    const filePath = getStoragePath()
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content)
      }
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error al cargar: ${error.message}`)
    }
    return {}
  }

  function saveStorage(data) {
    const filePath = getStoragePath()
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
      return true
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error al guardar: ${error.message}`)
      return false
    }
  }

  // Middleware para endpoints
  RED.httpAdmin.get('/redflow/persistent-storage', (req, res) => {
    try {
      const data = loadStorage()
      res.json(data)
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error en GET: ${error.message}`)
      res.status(500).json({ error: error.message })
    }
  })

  RED.httpAdmin.get('/redflow/persistent-storage/:key', (req, res) => {
    try {
      const data = loadStorage()
      const key = decodeURIComponent(req.params.key)
      if (key in data) {
        res.json({ key, value: data[key] })
      } else {
        res.status(404).json({ error: 'Key not found' })
      }
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error en GET/:key: ${error.message}`)
      res.status(500).json({ error: error.message })
    }
  })

  RED.httpAdmin.post('/redflow/persistent-storage', (req, res) => {
    try {
      const updates = req.body
      const data = loadStorage()
      
      // Actualizar con los nuevos valores
      Object.assign(data, updates)
      
      if (saveStorage(data)) {
        res.json({ success: true, updated: Object.keys(updates) })
      } else {
        res.status(500).json({ error: 'Failed to save' })
      }
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error en POST: ${error.message}`)
      res.status(500).json({ error: error.message })
    }
  })

  RED.httpAdmin.delete('/redflow/persistent-storage/:key', (req, res) => {
    try {
      const data = loadStorage()
      const key = decodeURIComponent(req.params.key)
      
      if (key in data) {
        delete data[key]
        if (saveStorage(data)) {
          res.json({ success: true, deleted: key })
        } else {
          res.status(500).json({ error: 'Failed to save' })
        }
      } else {
        res.status(404).json({ error: 'Key not found' })
      }
    } catch (error) {
      RED.log.error(`[redflow-persistent-storage] Error en DELETE: ${error.message}`)
      res.status(500).json({ error: error.message })
    }
  })

  // Log de éxito
  RED.log.info('[redflow-persistent-storage] ✅ Plugin cargado exitosamente')
  RED.log.info('[redflow-persistent-storage] Endpoints disponibles:')
  RED.log.info('[redflow-persistent-storage]   - GET    /redflow/persistent-storage')
  RED.log.info('[redflow-persistent-storage]   - GET    /redflow/persistent-storage/:key')
  RED.log.info('[redflow-persistent-storage]   - POST   /redflow/persistent-storage')
  RED.log.info('[redflow-persistent-storage]   - DELETE /redflow/persistent-storage/:key')
  
  // Verificar si el archivo existe y mostrar información
  if (fs.existsSync(storagePath)) {
    try {
      const stats = fs.statSync(storagePath)
      const data = loadStorage()
      const keyCount = Object.keys(data).length
      RED.log.info(`[redflow-persistent-storage] Archivo existente: ${keyCount} clave(s) almacenada(s), tamaño: ${(stats.size / 1024).toFixed(2)} KB`)
    } catch (error) {
      RED.log.warn(`[redflow-persistent-storage] ⚠️  No se pudo leer el archivo existente: ${error.message}`)
    }
  } else {
    RED.log.info('[redflow-persistent-storage] Archivo nuevo, se creará al primer guardado')
  }
}

/**
 * Registra el plugin en Node-RED
 */
function registerPlugin(RED) {
  // Registrar el plugin
  RED.plugins.registerPlugin('redflow-persistent-storage', {
    type: 'redflow-persistent-storage',
    
    onadd: function() {
      // Inicializar cuando el plugin se agrega
      initPlugin(RED)
    }
  })
}

// Exportar para Node-RED
module.exports = registerPlugin

// Exportar para testing
module.exports.initPlugin = initPlugin

