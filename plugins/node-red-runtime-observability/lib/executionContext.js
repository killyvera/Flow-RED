/**
 * Execution Context Manager
 * 
 * Tracks message execution through Node-RED flows,
 * maintaining a ring buffer of recent executions.
 */

'use strict';

const { createDataSample } = require('./truncation');
const { redactSample } = require('./redaction');
const { createSampler } = require('./sampler');

/**
 * Generate a unique execution ID
 */
function generateId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    maxExecutions: 20,      // Ring buffer size
    executionTTL: 30000,    // 30 seconds max per execution
    inactivityTimeout: 5000, // 5 seconds of inactivity closes execution
    limits: {
        maxPayloadBytes: 50000,
        maxDepth: 6,
        maxKeys: 50,
        maxArrayItems: 20,
        maxStringLength: 5000
    },
    sampling: {
        mode: 'first-n',
        maxPerNode: 3
    }
};

/**
 * ExecutionContext class representing a single flow execution
 */
class ExecutionContext {
    constructor(executionId, flowId) {
        this.executionId = executionId;
        this.flowId = flowId;
        this.startedAt = Date.now();
        this.endedAt = null;
        this.lastActivity = Date.now();
        this.nodes = new Map();  // nodeId -> NodeExecution
    }
    
    /**
     * Record node input
     */
    recordInput(nodeId, sample) {
        this.lastActivity = Date.now();
        
        let nodeExec = this.nodes.get(nodeId);
        if (!nodeExec) {
            nodeExec = {
                nodeId,
                input: null,
                output: null,
                error: null,
                startTs: Date.now(),
                endTs: null
            };
            this.nodes.set(nodeId, nodeExec);
        }
        
        nodeExec.input = sample;
        return nodeExec;
    }
    
    /**
     * Record node output
     */
    recordOutput(nodeId, sample) {
        this.lastActivity = Date.now();
        
        let nodeExec = this.nodes.get(nodeId);
        if (!nodeExec) {
            nodeExec = {
                nodeId,
                input: null,
                output: null,
                error: null,
                startTs: Date.now(),
                endTs: null
            };
            this.nodes.set(nodeId, nodeExec);
        }
        
        nodeExec.output = sample;
        nodeExec.endTs = Date.now();
        return nodeExec;
    }
    
    /**
     * Record node error
     */
    recordError(nodeId, error) {
        this.lastActivity = Date.now();
        
        let nodeExec = this.nodes.get(nodeId);
        if (!nodeExec) {
            nodeExec = {
                nodeId,
                input: null,
                output: null,
                error: null,
                startTs: Date.now(),
                endTs: null
            };
            this.nodes.set(nodeId, nodeExec);
        }
        
        nodeExec.error = {
            ts: Date.now(),
            message: error?.message || String(error),
            name: error?.name || 'Error',
            stack: error?.stack?.substring(0, 500)
        };
        nodeExec.endTs = Date.now();
        return nodeExec;
    }
    
    /**
     * End this execution
     */
    end() {
        this.endedAt = Date.now();
    }
    
    /**
     * Check if execution is still active
     */
    isActive() {
        return this.endedAt === null;
    }
    
    /**
     * Get execution duration
     */
    getDuration() {
        const end = this.endedAt || Date.now();
        return end - this.startedAt;
    }
    
    /**
     * Convert to plain object for serialization
     */
    toJSON() {
        const nodes = {};
        for (const [nodeId, nodeExec] of this.nodes) {
            nodes[nodeId] = nodeExec;
        }
        
        return {
            executionId: this.executionId,
            flowId: this.flowId,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            duration: this.getDuration(),
            nodeCount: this.nodes.size,
            nodes
        };
    }
}

/**
 * ExecutionContextManager - manages all execution contexts
 */
class ExecutionContextManager {
    constructor(config = {}, eventEmitter = null) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventEmitter = eventEmitter;
        
        // Ring buffer of executions
        this.executions = [];
        
        // Map msgId -> executionId for tracking
        this.msgToExecution = new Map();
        
        // Sampler instance
        this.sampler = createSampler(this.config.sampling);
        
        // Cleanup timer
        this.cleanupTimer = null;
        this._startCleanupTimer();
    }
    
    /**
     * Start the cleanup timer
     */
    _startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this._cleanup();
        }, 1000);  // Check every second
    }
    
    /**
     * Stop the cleanup timer
     */
    _stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * Cleanup expired executions
     */
    _cleanup() {
        const now = Date.now();
        
        for (const exec of this.executions) {
            if (!exec.isActive()) continue;
            
            // Check TTL
            if (exec.getDuration() > this.config.executionTTL) {
                this._endExecution(exec, 'ttl');
                continue;
            }
            
            // Check inactivity
            if (now - exec.lastActivity > this.config.inactivityTimeout) {
                this._endExecution(exec, 'inactivity');
            }
        }
    }
    
    /**
     * End an execution and emit event
     */
    _endExecution(exec, reason = 'normal') {
        exec.end();
        this._emit('execution.end', {
            executionId: exec.executionId,
            flowId: exec.flowId,
            reason,
            duration: exec.getDuration(),
            nodeCount: exec.nodes.size
        });
    }
    
    /**
     * Emit an event if emitter is available
     */
    _emit(type, data) {
        if (this.eventEmitter && typeof this.eventEmitter === 'function') {
            try {
                this.eventEmitter({
                    type,
                    ts: Date.now(),
                    ...data
                });
            } catch (err) {
                // Silently ignore emit errors
            }
        }
    }
    
    /**
     * Get or create an execution context for a message
     */
    getOrCreateExecution(msgId, flowId) {
        // Check if we already have an execution for this message
        let executionId = this.msgToExecution.get(msgId);
        
        if (executionId) {
            const exec = this.executions.find(e => e.executionId === executionId);
            if (exec && exec.isActive()) {
                return exec;
            }
        }
        
        // Create new execution
        executionId = generateId();
        const exec = new ExecutionContext(executionId, flowId);
        
        // Add to ring buffer
        this.executions.push(exec);
        
        // Enforce ring buffer limit
        while (this.executions.length > this.config.maxExecutions) {
            const removed = this.executions.shift();
            // Clean up msgId mappings for removed execution
            for (const [msgId, execId] of this.msgToExecution) {
                if (execId === removed.executionId) {
                    this.msgToExecution.delete(msgId);
                }
            }
        }
        
        // Track msgId -> execution mapping
        this.msgToExecution.set(msgId, executionId);
        
        // Emit start event
        this._emit('execution.start', {
            executionId,
            flowId
        });
        
        return exec;
    }
    
    /**
     * Record a node receiving input
     */
    recordInput(nodeId, flowId, msg) {
        try {
            const msgId = msg?._msgid;
            if (!msgId) return null;
            
            // Check sampling
            if (!this.sampler.shouldSample(nodeId, { isError: false })) {
                return null;
            }
            
            const exec = this.getOrCreateExecution(msgId, flowId);
            
            // Create and redact sample
            let sample = createDataSample(msg, this.config.limits);
            sample = redactSample(sample);
            
            const nodeExec = exec.recordInput(nodeId, sample);
            
            // Record that we sampled this node
            this.sampler.recordSample(nodeId);
            
            // Emit event
            this._emit('node.input', {
                executionId: exec.executionId,
                nodeId,
                flowId,
                data: sample
            });
            
            return nodeExec;
        } catch (err) {
            // Never throw - safety first
            return null;
        }
    }
    
    /**
     * Record a node sending output
     */
    recordOutput(nodeId, flowId, msg) {
        try {
            const msgId = msg?._msgid;
            if (!msgId) return null;
            
            // Check sampling
            if (!this.sampler.shouldSample(nodeId, { isError: false })) {
                return null;
            }
            
            const exec = this.getOrCreateExecution(msgId, flowId);
            
            // Create and redact sample
            let sample = createDataSample(msg, this.config.limits);
            sample = redactSample(sample);
            
            const nodeExec = exec.recordOutput(nodeId, sample);
            
            // Record that we sampled this node
            this.sampler.recordSample(nodeId);
            
            // Emit event
            this._emit('node.output', {
                executionId: exec.executionId,
                nodeId,
                flowId,
                data: sample
            });
            
            return nodeExec;
        } catch (err) {
            // Never throw
            return null;
        }
    }
    
    /**
     * Record a node error
     */
    recordError(nodeId, flowId, msg, error) {
        try {
            const msgId = msg?._msgid;
            if (!msgId) return null;
            
            const exec = this.getOrCreateExecution(msgId, flowId);
            const nodeExec = exec.recordError(nodeId, error);
            
            // Emit event
            this._emit('node.error', {
                executionId: exec.executionId,
                nodeId,
                flowId,
                error: {
                    message: error?.message || String(error),
                    name: error?.name || 'Error'
                }
            });
            
            return nodeExec;
        } catch (err) {
            // Never throw
            return null;
        }
    }
    
    /**
     * Get all executions
     */
    getExecutions() {
        return this.executions.map(e => e.toJSON());
    }
    
    /**
     * Get a specific execution by ID
     */
    getExecution(executionId) {
        const exec = this.executions.find(e => e.executionId === executionId);
        return exec ? exec.toJSON() : null;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalExecutions: this.executions.length,
            activeExecutions: this.executions.filter(e => e.isActive()).length,
            trackedMessages: this.msgToExecution.size,
            samplerStats: this.sampler.getStats()
        };
    }
    
    /**
     * Reset all state
     */
    reset() {
        this.executions = [];
        this.msgToExecution.clear();
        this.sampler.reset();
    }
    
    /**
     * Shutdown the manager
     */
    shutdown() {
        this._stopCleanupTimer();
        
        // End all active executions
        for (const exec of this.executions) {
            if (exec.isActive()) {
                this._endExecution(exec, 'shutdown');
            }
        }
    }
}

/**
 * Create a new ExecutionContextManager
 */
function createManager(config, eventEmitter) {
    return new ExecutionContextManager(config, eventEmitter);
}

module.exports = {
    ExecutionContext,
    ExecutionContextManager,
    createManager,
    generateId,
    DEFAULT_CONFIG
};

