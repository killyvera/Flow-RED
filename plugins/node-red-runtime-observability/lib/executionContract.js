/**
 * Execution Contract Models
 * 
 * Defines the canonical data structures for Node-RED execution observability:
 * - ExecutionFrame: A complete logical execution (like a "run" in n8n)
 * - NodeExecution: Execution of a single node within a frame
 * - IOEvent: Normalized Input/Output events with safe previews
 */

'use strict';

/**
 * Generate unique frame ID
 */
function generateFrameId() {
    return `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * IOEvent - Represents a single Input or Output event
 */
class IOEvent {
    constructor(direction, payload, port = undefined) {
        this.direction = direction; // "input" | "output"
        this.port = port; // For outputs: port index (0, 1, 2...)
        this.timestamp = Date.now();
        this.payload = payload; // { preview?, type, size?, truncated }
    }
    
    toJSON() {
        return {
            direction: this.direction,
            port: this.port,
            timestamp: this.timestamp,
            payload: this.payload
        };
    }
}

/**
 * NodeExecution - Execution of a single node within a frame
 */
class NodeExecution {
    constructor(nodeId, nodeType) {
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        this.input = undefined; // IOEvent | undefined
        this.outputs = []; // IOEvent[]
        
        this.semantics = {
            role: undefined, // "trigger" | "transform" | "filter" | "generator" | "sink"
            behavior: undefined // "pass-through" | "transformed" | "filtered" | "bifurcated" | "terminated"
        };
        
        this.timing = {
            receivedAt: undefined,
            sentAt: undefined,
            durationMs: undefined
        };
        
        this.errors = undefined; // { message: string, code?: string }
    }
    
    /**
     * Set input event
     */
    setInput(ioEvent) {
        this.input = ioEvent;
        this.timing.receivedAt = ioEvent.timestamp;
    }
    
    /**
     * Add output event
     */
    addOutput(ioEvent) {
        this.outputs.push(ioEvent);
        if (!this.timing.sentAt) {
            this.timing.sentAt = ioEvent.timestamp;
        }
        // Update duration
        if (this.timing.receivedAt) {
            this.timing.durationMs = ioEvent.timestamp - this.timing.receivedAt;
        }
    }
    
    /**
     * Set error
     */
    setError(error) {
        this.errors = {
            message: error?.message || String(error),
            code: error?.code || error?.name
        };
    }
    
    /**
     * Check if node has outputs
     */
    hasOutputs() {
        return this.outputs.length > 0;
    }
    
    /**
     * Check if node has input
     */
    hasInput() {
        return this.input !== undefined;
    }
    
    /**
     * Get first output payload for comparison
     */
    getFirstOutputPayload() {
        return this.outputs.length > 0 ? this.outputs[0].payload : undefined;
    }
    
    toJSON() {
        return {
            nodeId: this.nodeId,
            nodeType: this.nodeType,
            input: this.input ? this.input.toJSON() : undefined,
            outputs: this.outputs.map(e => e.toJSON()),
            semantics: { ...this.semantics },
            timing: { ...this.timing },
            errors: this.errors
        };
    }
}

/**
 * ExecutionFrame - Represents a complete logical execution
 */
class ExecutionFrame {
    constructor(frameId, triggerNodeId = undefined) {
        this.id = frameId;
        this.startedAt = Date.now();
        this.endedAt = undefined;
        this.triggerNodeId = triggerNodeId;
        this.nodes = {}; // Record<string, NodeExecution>
        this.triggerEmitted = false; // Track if frame:start was emitted with trigger
        
        this.stats = {
            nodeCount: 0,
            outputsEmitted: 0,
            filteredNodes: 0,
            erroredNodes: 0,
            durationMs: undefined
        };
        
        this.lastActivity = Date.now();
    }
    
    /**
     * Get or create NodeExecution
     */
    getOrCreateNodeExecution(nodeId, nodeType) {
        if (!this.nodes[nodeId]) {
            this.nodes[nodeId] = new NodeExecution(nodeId, nodeType);
            this.stats.nodeCount = Object.keys(this.nodes).length;
        }
        return this.nodes[nodeId];
    }
    
    /**
     * Record input for a node
     */
    recordInput(nodeId, nodeType, ioEvent) {
        const nodeExec = this.getOrCreateNodeExecution(nodeId, nodeType);
        nodeExec.setInput(ioEvent);
        this.lastActivity = Date.now();
        
        // If this is the first node and no trigger set, mark as trigger
        if (!this.triggerNodeId && Object.keys(this.nodes).length === 1) {
            this.triggerNodeId = nodeId;
        }
    }
    
    /**
     * Record outputs for a node
     */
    recordOutput(nodeId, nodeType, ioEvents) {
        const nodeExec = this.getOrCreateNodeExecution(nodeId, nodeType);
        
        for (const ioEvent of ioEvents) {
            nodeExec.addOutput(ioEvent);
            this.stats.outputsEmitted++;
        }
        
        this.lastActivity = Date.now();
    }
    
    /**
     * Record error for a node
     */
    recordError(nodeId, nodeType, error) {
        const nodeExec = this.getOrCreateNodeExecution(nodeId, nodeType);
        nodeExec.setError(error);
        this.stats.erroredNodes++;
        this.lastActivity = Date.now();
    }
    
    /**
     * End this frame
     */
    end() {
        this.endedAt = Date.now();
        this.stats.durationMs = this.endedAt - this.startedAt;
        
        // Calculate filtered nodes (nodes with input but no outputs)
        for (const nodeExec of Object.values(this.nodes)) {
            if (nodeExec.hasInput() && !nodeExec.hasOutputs()) {
                this.stats.filteredNodes++;
            }
        }
    }
    
    /**
     * Check if frame is active
     */
    isActive() {
        return this.endedAt === undefined;
    }
    
    /**
     * Get duration so far
     */
    getDuration() {
        const end = this.endedAt || Date.now();
        return end - this.startedAt;
    }
    
    /**
     * Check inactivity
     */
    isInactive(timeoutMs) {
        return Date.now() - this.lastActivity > timeoutMs;
    }
    
    /**
     * Check TTL
     */
    hasExceededTTL(ttlMs) {
        return this.getDuration() > ttlMs;
    }
    
    toJSON() {
        const nodes = {};
        for (const [nodeId, nodeExec] of Object.entries(this.nodes)) {
            nodes[nodeId] = nodeExec.toJSON();
        }
        
        return {
            id: this.id,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            triggerNodeId: this.triggerNodeId,
            nodes,
            stats: { ...this.stats }
        };
    }
}

module.exports = {
    ExecutionFrame,
    NodeExecution,
    IOEvent,
    generateFrameId
};

