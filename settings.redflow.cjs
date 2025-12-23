/**
 * Redflow - Node-RED Settings Configuration
 * 
 * This settings file configures Node-RED to:
 * 1. Auto-load plugins from ./plugins/ directory
 * 2. Run in headless mode (API only, no old UI)
 * 3. Enable observability plugin
 * 4. Enable agent-core plugin
 * 
 * Usage:
 *   node-red --settings ./settings.redflow.js
 * 
 * Or set in package.json scripts:
 *   "start:node-red": "node-red --settings ./settings.redflow.js"
 */

const path = require('path');

module.exports = {
    // ============================================
    // HEADLESS MODE - API Only (No Old UI)
    // ============================================
    // Keep API endpoints active but disable the old editor UI
    // API endpoints available at http://localhost:1880/
    httpAdminRoot: '/',
    
    // Disable the old Node-RED editor UI (but keep API active)
    disableEditor: true,
    
    // ============================================
    // CORS CONFIGURATION
    // ============================================
    // Permitir peticiones desde el frontend Redflow (localhost:5173)
    httpAdminCors: {
        origin: "*", // Permitir cualquier origen en desarrollo
        credentials: true
    },
    
    // CORS para las rutas HTTP de los nodos
    httpNodeCors: {
        origin: "*",
        credentials: true
    },
    
    // ============================================
    // SERVER CONFIGURATION
    // ============================================
    uiPort: process.env.PORT || 1880,
    uiHost: process.env.HOST || '0.0.0.0',
    
    // ============================================
    // AUTO-LOAD PLUGINS FROM ./plugins/
    // ============================================
    // This tells Node-RED to automatically load all nodes
    // from the specified directories on startup
    nodesDir: [
        path.join(__dirname, 'plugins', 'node-red-runtime-observability'),
        path.join(__dirname, 'plugins', 'agent-core')
    ],
    
    // ============================================
    // FLOW CONFIGURATION
    // ============================================
    flowFile: 'flows.json',
    flowFilePretty: true,
    
    // Disable safe mode (allow flows to start automatically)
    safeMode: false,
    
    // ============================================
    // CONTEXT STORAGE
    // ============================================
    contextStorage: {
        default: {
            module: "memory"
        }
    },
    
    // ============================================
    // LOGGING
    // ============================================
    logging: {
        console: {
            level: process.env.NODE_RED_LOG_LEVEL || "info",
            metrics: false,
            audit: false
        }
    },
    
    // ============================================
    // OBSERVABILITY PLUGIN CONFIGURATION
    // ============================================
    observability: {
        // Enable the runtime observability plugin
        enabled: true,
        
        // WebSocket server configuration
        websocket: {
            port: 3001,
            path: '/observability'
        },
        
        // Sampling configuration
        sampling: {
            enabled: true,
            rate: 0.1,  // 10% of messages
            maxSamplesPerNode: 100
        },
        
        // Message capture limits
        limits: {
            maxMessageSize: 10000,      // 10KB per message preview
            maxArrayLength: 10,         // First 10 items of arrays
            maxObjectDepth: 3,          // Max nesting level
            maxStringLength: 500        // Max string length
        },
        
        // Sensitive data redaction
        redaction: {
            enabled: true,
            fields: [
                'password', 'passwd', 'pwd',
                'secret', 'token', 'apikey', 'api_key',
                'authorization', 'auth',
                'cookie', 'session'
            ]
        }
    },
    
    // ============================================
    // AGENT-CORE PLUGIN CONFIGURATION
    // ============================================
    agentCore: {
        // Enable the agent-core plugin
        enabled: true,
        
        // Default max iterations for REACT strategy
        maxIterations: 5,
        
        // Enable debug logging
        debug: process.env.AGENT_CORE_DEBUG === 'true'
    },
    
    // ============================================
    // FUNCTION NODE CONFIGURATION
    // ============================================
    functionGlobalContext: {
        // Add any global context variables here
    },
    
    // Allow external modules in function nodes
    functionExternalModules: true,
    
    // ============================================
    // EDITOR SETTINGS (for API access)
    // ============================================
    editorTheme: {
        projects: {
            enabled: false
        }
    },
    
    // ============================================
    // CORS CONFIGURATION
    // ============================================
    // Allow cross-origin requests from Redflow frontend
    httpNodeCors: {
        origin: "*",
        methods: "GET,PUT,POST,DELETE"
    },
    
    // ============================================
    // ADMIN API SECURITY
    // ============================================
    // Uncomment to enable admin API authentication
    // adminAuth: {
    //     type: "credentials",
    //     users: [{
    //         username: "admin",
    //         password: "$2b$08$...", // bcrypt hash
    //         permissions: "*"
    //     }]
    // },
    
    // ============================================
    // NODE SETTINGS
    // ============================================
    // Global settings for specific node types
    nodeSettings: {
        // Agent Core defaults
        agentCoreMaxIterations: {
            value: 5,
            exportable: true
        },
        agentCoreDebug: {
            value: false,
            exportable: true
        }
    }
}

