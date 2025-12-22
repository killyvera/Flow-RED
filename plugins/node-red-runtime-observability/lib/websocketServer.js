/**
 * WebSocket Server for Observability Events
 * 
 * Provides a dedicated WebSocket endpoint for streaming
 * observability events to connected clients.
 */

'use strict';

const WebSocket = require('ws');
const url = require('url');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    path: '/observability',
    heartbeatInterval: 15000,  // 15 seconds
    maxConnections: 10
};

/**
 * ObservabilityWebSocketServer class
 */
class ObservabilityWebSocketServer {
    constructor(httpServer, settings, log) {
        this.httpServer = httpServer;
        this.settings = settings;
        this.log = log || console;
        
        this.config = {
            ...DEFAULT_CONFIG,
            ...(settings.observability?.websocket || {})
        };
        
        this.wsServer = null;
        this.connections = new Set();
        this.heartbeatTimer = null;
        this.started = false;
        
        // Bind methods
        this._handleUpgrade = this._handleUpgrade.bind(this);
        this._handleConnection = this._handleConnection.bind(this);
    }
    
    /**
     * Get the full WebSocket path
     */
    getPath() {
        const adminRoot = this.settings.httpAdminRoot || '/';
        let path = adminRoot;
        
        // Ensure leading slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Ensure trailing slash
        if (!path.endsWith('/')) {
            path = path + '/';
        }
        
        // Append observability path (without leading slash)
        const obsPath = this.config.path.replace(/^\//, '');
        path = path + obsPath;
        
        return path;
    }
    
    /**
     * Start the WebSocket server
     */
    start() {
        if (this.started) {
            return;
        }
        
        try {
            // Create WebSocket server in noServer mode
            this.wsServer = new WebSocket.Server({ noServer: true });
            
            this.wsServer.on('connection', this._handleConnection);
            
            this.wsServer.on('error', (err) => {
                this._safeLog('warn', `[observability] WebSocket server error: ${err.message}`);
            });
            
            // Register upgrade handler on HTTP server
            this.httpServer.on('upgrade', this._handleUpgrade);
            
            // Start heartbeat
            this._startHeartbeat();
            
            this.started = true;
            this._safeLog('info', `[observability] WebSocket server started at ${this.getPath()}`);
        } catch (err) {
            this._safeLog('error', `[observability] Failed to start WebSocket server: ${err.message}`);
        }
    }
    
    /**
     * Stop the WebSocket server
     */
    stop() {
        if (!this.started) {
            return;
        }
        
        try {
            // Stop heartbeat
            this._stopHeartbeat();
            
            // Close all connections
            for (const ws of this.connections) {
                try {
                    ws.close(1000, 'Server shutting down');
                } catch (err) {
                    // Ignore close errors
                }
            }
            this.connections.clear();
            
            // Remove upgrade handler
            this.httpServer.removeListener('upgrade', this._handleUpgrade);
            
            // Close WebSocket server
            if (this.wsServer) {
                this.wsServer.close();
                this.wsServer = null;
            }
            
            this.started = false;
            this._safeLog('info', '[observability] WebSocket server stopped');
        } catch (err) {
            this._safeLog('error', `[observability] Error stopping WebSocket server: ${err.message}`);
        }
    }
    
    /**
     * Handle HTTP upgrade requests
     */
    _handleUpgrade(request, socket, head) {
        try {
            const pathname = url.parse(request.url).pathname;
            const expectedPath = this.getPath();
            
            if (pathname === expectedPath) {
                // Check connection limit
                if (this.connections.size >= this.config.maxConnections) {
                    this._safeLog('warn', '[observability] Max connections reached, rejecting new connection');
                    socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
                    socket.destroy();
                    return;
                }
                
                this.wsServer.handleUpgrade(request, socket, head, (ws) => {
                    this.wsServer.emit('connection', ws, request);
                });
            }
            // Don't destroy socket for other paths - let other handlers process them
        } catch (err) {
            this._safeLog('error', `[observability] Upgrade error: ${err.message}`);
            try {
                socket.destroy();
            } catch (e) {
                // Ignore
            }
        }
    }
    
    /**
     * Handle new WebSocket connection
     */
    _handleConnection(ws, request) {
        const clientIp = request.socket.remoteAddress;
        this._safeLog('debug', `[observability] New connection from ${clientIp}`);
        
        this.connections.add(ws);
        
        // Send welcome message
        this._sendToClient(ws, {
            event: 'connected',
            ts: Date.now(),
            message: 'Connected to Node-RED Observability'
        });
        
        ws.on('message', (data) => {
            // Handle incoming messages (for future use)
            try {
                const msg = JSON.parse(data);
                this._handleClientMessage(ws, msg);
            } catch (err) {
                // Invalid JSON, ignore
            }
        });
        
        ws.on('close', () => {
            this._safeLog('debug', `[observability] Connection closed from ${clientIp}`);
            this.connections.delete(ws);
        });
        
        ws.on('error', (err) => {
            this._safeLog('warn', `[observability] Connection error: ${err.message}`);
            this.connections.delete(ws);
        });
    }
    
    /**
     * Handle message from client
     */
    _handleClientMessage(ws, msg) {
        // Currently just acknowledge pings
        if (msg.type === 'ping' || msg.event === 'ping') {
            this._sendToClient(ws, {
                event: 'pong',
                ts: Date.now()
            });
        }
    }
    
    /**
     * Send message to a specific client
     */
    _sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(data));
            } catch (err) {
                // Ignore send errors
            }
        }
    }
    
    /**
     * Broadcast event to all connected clients
     */
    broadcast(event) {
        if (!this.started) {
            this._safeLog('debug', '[observability] WebSocket not started, skipping broadcast');
            return;
        }
        
        if (this.connections.size === 0) {
            this._safeLog('debug', '[observability] No connections, skipping broadcast');
            return;
        }
        
        const message = JSON.stringify(event);
        let sentCount = 0;
        
        for (const ws of this.connections) {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                    sentCount++;
                } catch (err) {
                    // Remove failed connections
                    this.connections.delete(ws);
                    this._safeLog('warn', `[observability] Failed to send to client: ${err.message}`);
                }
            }
        }
        
        this._safeLog('debug', `[observability] Broadcast ${event.event} to ${sentCount}/${this.connections.size} clients`);
    }
    
    /**
     * Start heartbeat timer
     */
    _startHeartbeat() {
        if (this.heartbeatTimer) {
            return;
        }
        
        this.heartbeatTimer = setInterval(() => {
            const heartbeat = {
                event: 'heartbeat',
                ts: Date.now(),
                connections: this.connections.size
            };
            
            this.broadcast(heartbeat);
        }, this.config.heartbeatInterval);
    }
    
    /**
     * Stop heartbeat timer
     */
    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Safe logging that never throws
     */
    _safeLog(level, message) {
        try {
            if (this.log && typeof this.log[level] === 'function') {
                this.log[level](message);
            } else if (this.log && typeof this.log.log === 'function') {
                this.log.log(message);
            } else {
                console.log(message);
            }
        } catch (err) {
            // Logging failed, ignore
        }
    }
    
    /**
     * Get connection statistics
     */
    getStats() {
        return {
            started: this.started,
            path: this.getPath(),
            connections: this.connections.size,
            maxConnections: this.config.maxConnections
        };
    }
}

/**
 * Create a new ObservabilityWebSocketServer
 */
function createWebSocketServer(httpServer, settings, log) {
    return new ObservabilityWebSocketServer(httpServer, settings, log);
}

module.exports = {
    ObservabilityWebSocketServer,
    createWebSocketServer,
    DEFAULT_CONFIG
};

