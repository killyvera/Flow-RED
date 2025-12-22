/**
 * Node-RED Runtime Observability Plugin
 * 
 * Provides real Input/Output observability per node by safely
 * monkey-patching Node.prototype.receive and Node.prototype.send.
 * 
 * @module node-red-runtime-observability
 */

'use strict';

const { createFrameManager } = require('./lib/frameManager');
const { createWebSocketServer } = require('./lib/websocketServer');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    enabled: false,
    sampling: {
        mode: 'first-n',
        maxPerNode: 5
    },
    limits: {
        maxPayloadBytes: 50000,
        maxDepth: 6,
        maxKeys: 50,
        maxArrayItems: 20,
        maxStringLength: 5000
    }
};

/**
 * Plugin state
 */
let pluginState = {
    initialized: false,
    enabled: false,
    manager: null,
    wsServer: null,
    RED: null,
    originalReceive: null,
    originalSend: null,
    originalOn: null
};

/**
 * Safe logging wrapper
 */
function safeLog(level, message) {
    try {
        if (pluginState.RED && pluginState.RED.log && typeof pluginState.RED.log[level] === 'function') {
            pluginState.RED.log[level](`[observability] ${message}`);
        } else {
            console.log(`[observability] ${message}`);
        }
    } catch (err) {
        // Logging failed, ignore
    }
}

/**
 * Broadcast event to WebSocket clients
 */
function broadcastEvent(event) {
    try {
        if (pluginState.wsServer) {
            console.log('[observability] Broadcasting event:', event.event, 'to', pluginState.wsServer.connections?.size || 0, 'clients');
            pluginState.wsServer.broadcast(event);
        } else {
            console.warn('[observability] No WebSocket server available for broadcast');
        }
    } catch (err) {
        console.error('[observability] Error broadcasting event:', err);
    }
}

/**
 * Initialize the observability plugin with REAL runtime hooks
 * 
 * @param {object} RED - Node-RED runtime object
 */
function initPlugin(RED) {
    pluginState.RED = RED;
    
    // Get configuration
    const config = {
        ...DEFAULT_CONFIG,
        ...(RED.settings.observability || {})
    };
    
    // Check if plugin is enabled
    if (!config.enabled) {
        safeLog('info', 'Plugin is disabled (set observability.enabled = true in settings.js to enable)');
        return;
    }
    
    safeLog('info', 'Initializing runtime hooks...');
    
    try {
        // Import Node class from Node-RED runtime
        // require.main.filename = C:\code\node-red\packages\node_modules\node-red\red.js
        // Node.js is at: C:\code\node-red\packages\node_modules\@node-red\runtime\lib\nodes\Node.js
        let Node;
        try {
            Node = require("@node-red/runtime/lib/nodes/Node");
        } catch (e) {
            const path = require('path');
            // Go up from node-red/red.js to packages/node_modules, then find @node-red
            const mainFile = require.main.filename;
            const packagesNodeModules = path.resolve(path.dirname(mainFile), '..'); // node_modules
            const nodePath = path.join(packagesNodeModules, '@node-red', 'runtime', 'lib', 'nodes', 'Node.js');
            console.log('[observability] Resolving Node from:', nodePath);
            Node = require(nodePath);
        }
        
        // Store original functions
        pluginState.originalReceive = Node.prototype.receive;
        pluginState.originalSend = Node.prototype.send;
        pluginState.originalOn = Node.prototype.on;
        
        // Create frame manager with Execution Contract v1
        pluginState.manager = createFrameManager({
            limits: config.limits,
            sampling: config.sampling
        }, broadcastEvent);
        
        // Create WebSocket server
        if (RED.server) {
            pluginState.wsServer = createWebSocketServer(RED.server, RED.settings, RED.log);
            pluginState.wsServer.start();
        } else {
            safeLog('warn', 'HTTP server not available, WebSocket endpoint will not be created');
        }
        
        // ============================================================
        // MONKEY-PATCH Node.prototype.on - Intercept event registration
        // This allows us to wrap the 'input' handler for ALL nodes
        // to capture their output even when they have no wires
        // ============================================================
        const originalOn = pluginState.originalOn;
        Node.prototype.on = function(event, handler) {
            // Intercept 'input' event for ALL node types
            if (event === 'input') {
                console.log('[observability] Intercepting input handler for node:', this.type, this.id);
                
                // Wrap the handler to capture the returned/sent message
                const wrappedHandler = function(msg, send, done) {
                    try {
                        // Store the original send function
                        const originalSendFn = send;
                        
                        // Check if this node has wires (will send() be called by Node-RED?)
                        const hasWires = this.wires && this.wires.some(wireSet => wireSet && wireSet.length > 0);
                        
                        // Create a wrapper for send
                        const wrappedSend = function(sentMsg) {
                            console.log('[observability] node wrapper send:', this.type, this.id, sentMsg?.payload, 'hasWires:', hasWires);
                            
                            // Only record here if NO wires (won't go through Node.prototype.send)
                            // Otherwise, Node.prototype.send will handle it to avoid duplicate recording
                            if (!hasWires && pluginState.manager && sentMsg) {
                                const nodeType = this.type || 'unknown';
                                const flowId = this.z;
                                console.log('[observability] Recording output from wrapped send (no wires) for node:', this.id);
                                pluginState.manager.recordOutput(this.id, nodeType, flowId, sentMsg);
                            }
                            
                            // Call original send (which goes through Node.prototype.send if wires exist)
                            if (originalSendFn) {
                                return originalSendFn(sentMsg);
                            }
                        }.bind(this);
                        
                        // Call the original handler with our wrapped send
                        const result = handler.call(this, msg, wrappedSend, done);
                        
                        // If the handler returned a message (synchronous return),
                        // we need to capture it here because Node-RED might not call send()
                        // if there are no wires
                        if (result !== undefined && result !== null) {
                            console.log('[observability] node returned:', this.type, this.id, result?.payload, 'hasWires:', hasWires);
                            
                            // Only record if NO wires (returned value won't trigger send())
                            if (!hasWires && pluginState.manager) {
                                const nodeType = this.type || 'unknown';
                                const flowId = this.z;
                                console.log('[observability] Recording output from return value (no wires) for node:', this.id);
                                pluginState.manager.recordOutput(this.id, nodeType, flowId, result);
                            }
                        }
                        
                        return result;
                    } catch (err) {
                        console.error('[observability] Error in wrapped handler:', err);
                        // Call original handler as fallback
                        return handler.call(this, msg, send, done);
                    }
                }.bind(this);
                
                // Call original 'on' with our wrapped handler
                return originalOn.call(this, event, wrappedHandler);
            }
            
            // For all other events, just pass through
            return originalOn.call(this, event, handler);
        };
        
        // ============================================================
        // MONKEY-PATCH Node.prototype.receive (INPUT)
        // ============================================================
        Node.prototype.receive = function(msg, ...rest) {
            try {
                // Debug log - simple and clean
                console.log("[observability] receive", this.id, msg && msg.payload);
                
                // Record input using Execution Contract v1
                if (pluginState.manager && msg) {
                    const nodeType = this.type || 'unknown';
                    const flowId = this.z;
                    pluginState.manager.recordInput(this.id, nodeType, flowId, msg);
                }
            } catch (err) {
                // NEVER crash the runtime
            }
            
            // ALWAYS call original
            return pluginState.originalReceive.call(this, msg, ...rest);
        };
        
        // ============================================================
        // MONKEY-PATCH Node.prototype.send (OUTPUT)
        // ============================================================
        const originalSend = pluginState.originalSend;
        Node.prototype.send = function(msg, ...rest) {
            try {
                // Debug log - extract payload safely
                let payloadPreview = undefined;
                if (msg) {
                    if (Array.isArray(msg)) {
                        // Array: show first non-null payload
                        for (const item of msg) {
                            if (item && item.payload !== undefined) {
                                payloadPreview = item.payload;
                                break;
                            }
                            if (item && !Array.isArray(item) && typeof item === 'object') {
                                payloadPreview = item;
                                break;
                            }
                        }
                    } else if (msg.payload !== undefined) {
                        payloadPreview = msg.payload;
                    } else if (typeof msg === 'object') {
                        payloadPreview = msg;
                    }
                }
                console.log("[observability] send", this.id, this.type, payloadPreview, "wires:", this.wires?.length || 0);
                
                // Record output using Execution Contract v1
                // normalizeSend() handles all send() variants internally
                if (pluginState.manager && msg) {
                    const nodeType = this.type || 'unknown';
                    const flowId = this.z;
                    // Get msgId from first valid message (for correlation)
                    const { msgId, found } = extractMsgId(msg);
                    
                    // ALWAYS try to record output, even if msgId not found
                    // The manager will attempt to use the most recent frame as fallback
                    if (found) {
                        console.log("[observability] send: recording output with msgId:", msgId);
                        pluginState.manager.recordOutput(this.id, nodeType, flowId, msg);
                    } else {
                        console.log("[observability] send: no msgId found, attempting to record output anyway for node:", this.id);
                        // Pass msg anyway - manager will try to find/create a frame
                        pluginState.manager.recordOutput(this.id, nodeType, flowId, msg);
                    }
                }
            } catch (err) {
                // NEVER crash the runtime
                console.error('[observability] Error in send hook:', err);
            }
            
            // Check if there are no wires but we still want to record the output
            // This handles the case where send() is called but Node-RED won't forward it
            const hasWires = this.wires && this.wires.some(wireSet => wireSet && wireSet.length > 0);
            console.log("[observability] send: hasWires:", hasWires, "for node:", this.id);
            
            // ALWAYS call original send
            // Node-RED will handle the wire routing internally
            return originalSend.call(this, msg, ...rest);
        };
        
        pluginState.enabled = true;
        pluginState.initialized = true;
        
        safeLog('info', 'Runtime hooks attached to Node.prototype.receive and Node.prototype.send');
        safeLog('info', `Sampling mode: ${config.sampling.mode}, max per node: ${config.sampling.maxPerNode}`);
        
        if (pluginState.wsServer) {
            safeLog('info', `WebSocket endpoint: ${pluginState.wsServer.getPath()}`);
        }
        
    } catch (err) {
        safeLog('error', `Failed to initialize plugin: ${err.message}`);
        console.error('[observability] Init error:', err);
        disablePlugin();
    }
}

/**
 * Extract msgId from send() argument for correlation
 * Handles all send() variants, including nested arrays and null values
 * Returns { msgId, found } where found indicates if msgId was successfully extracted
 */
function extractMsgId(msg) {
    if (!msg) {
        console.log('[observability] extractMsgId: msg is null/undefined');
        return { msgId: undefined, found: false };
    }
    
    // Direct msgId on object
    if (msg._msgid) {
        return { msgId: msg._msgid, found: true };
    }
    
    // Handle arrays: [msg] or [[msg1, msg2], null, [msg3]]
    if (Array.isArray(msg)) {
        for (const item of msg) {
            // Skip null/undefined items
            if (!item) continue;
            
            // Direct msgId on array item
            if (item._msgid) {
                return { msgId: item._msgid, found: true };
            }
            
            // Nested array: [[msg1, msg2]]
            if (Array.isArray(item)) {
                for (const subItem of item) {
                    if (subItem && subItem._msgid) {
                        return { msgId: subItem._msgid, found: true };
                    }
                }
            }
        }
        console.log('[observability] extractMsgId: no _msgid found in array, length:', msg.length);
        return { msgId: undefined, found: false };
    }
    
    // If msg is an object without _msgid (shouldn't happen in Node-RED)
    console.log('[observability] extractMsgId: msg is object without _msgid, type:', typeof msg);
    return { msgId: undefined, found: false };
}

/**
 * Disable the plugin and restore original functions
 */
function disablePlugin() {
    try {
        pluginState.enabled = false;
        
        // Restore original Node.prototype functions
        if (pluginState.originalReceive || pluginState.originalSend) {
            try {
                let Node;
                try {
                    Node = require("@node-red/runtime/lib/nodes/Node");
                } catch (e) {
                    const path = require('path');
                    const mainFile = require.main.filename;
                    const packagesNodeModules = path.resolve(path.dirname(mainFile), '..');
                    const nodePath = path.join(packagesNodeModules, '@node-red', 'runtime', 'lib', 'nodes', 'Node.js');
                    Node = require(nodePath);
                }
                
                if (pluginState.originalReceive) {
                    Node.prototype.receive = pluginState.originalReceive;
                }
                if (pluginState.originalSend) {
                    Node.prototype.send = pluginState.originalSend;
                }
                if (pluginState.originalOn) {
                    Node.prototype.on = pluginState.originalOn;
                }
                
                safeLog('info', 'Original Node.prototype functions restored');
            } catch (err) {
                // Ignore restore errors
            }
        }
        
        // Stop WebSocket server
        if (pluginState.wsServer) {
            pluginState.wsServer.stop();
            pluginState.wsServer = null;
        }
        
        // Shutdown manager
        if (pluginState.manager) {
            pluginState.manager.shutdown();
            pluginState.manager = null;
        }
        
        safeLog('info', 'Plugin disabled');
    } catch (err) {
        // Ignore errors during disable
    }
}

/**
 * Plugin entry point
 * 
 * @param {object} RED - Node-RED runtime object
 */
module.exports = function(RED) {
    // Register the plugin
    RED.plugins.registerPlugin('runtime-observability', {
        type: 'runtime-observability',
        
        onadd: function() {
            // Initialize when plugin is added
            initPlugin(RED);
        }
    });
    
    // Handle runtime events
    RED.events.on('runtime-event', function(event) {
        if (event.id === 'runtime-state') {
            const state = event.payload?.state;
            
            if (state === 'stop') {
                // Flows detenidos - limpiar frames activos pero mantener plugin activo
                if (pluginState.manager) {
                    pluginState.manager.reset();
                }
                safeLog('info', 'Flows detenidos - frames limpiados');
            } else if (state === 'start') {
                // Flows iniciados - el plugin ya está activo, no hacer nada
                safeLog('debug', 'Flows iniciados - observability activo');
            }
        }
    });
    
    // Handle complete Node-RED shutdown (no solo detener flows)
    process.on('SIGINT', () => {
        disablePlugin();
    });
    
    process.on('SIGTERM', () => {
        disablePlugin();
    });
};

// Export for testing
module.exports.initPlugin = initPlugin;
module.exports.disablePlugin = disablePlugin;
module.exports.getState = () => ({ ...pluginState });
module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
