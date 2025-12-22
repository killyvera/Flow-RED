/**
 * Frame Manager
 * 
 * Manages ExecutionFrames using the Execution Contract v1.
 * Tracks message execution through Node-RED flows with proper
 * semantic inference and normalized events.
 */

'use strict';

const { ExecutionFrame, IOEvent, generateFrameId } = require('./executionContract');
const { normalizeSend } = require('./sendNormalizer');
const { updateSemantics, finalizeSemantics } = require('./semanticInference');
const { createDataSample } = require('./truncation');
const { redactSample } = require('./redaction');
const { createSampler } = require('./sampler');

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    maxFrames: 20,              // Ring buffer size
    frameTTL: 30000,            // 30 seconds max per frame
    inactivityTimeout: 5000,   // 5 seconds of inactivity closes frame
    limits: {
        maxPayloadBytes: 50000,
        maxDepth: 6,
        maxKeys: 50,
        maxArrayItems: 20,
        maxStringLength: 5000
    },
    sampling: {
        mode: 'first-n',
        maxPerNode: 5
    }
};

/**
 * FrameManager - Manages all execution frames
 */
class FrameManager {
    constructor(config = {}, eventEmitter = null) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.eventEmitter = eventEmitter;
        
        // Ring buffer of frames
        this.frames = [];
        
        // Map msgId -> frameId for tracking
        this.msgToFrame = new Map();
        
        // Sampler instance
        this.sampler = createSampler(this.config.sampling);
        
        // Cleanup timer
        this.cleanupTimer = null;
        this._startCleanupTimer();
    }
    
    /**
     * Start cleanup timer
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
     * Stop cleanup timer
     */
    _stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * Cleanup expired frames
     */
    _cleanup() {
        for (const frame of this.frames) {
            if (!frame.isActive()) continue;
            
            // Check TTL
            if (frame.hasExceededTTL(this.config.frameTTL)) {
                this._endFrame(frame, 'ttl');
                continue;
            }
            
            // Check inactivity
            if (frame.isInactive(this.config.inactivityTimeout)) {
                this._endFrame(frame, 'inactivity');
            }
        }
    }
    
    /**
     * End a frame and emit event
     */
    _endFrame(frame, reason = 'normal') {
        // Finalize semantics for all nodes
        for (const nodeExec of Object.values(frame.nodes)) {
            finalizeSemantics(nodeExec);
        }
        
        frame.end();
        
        // Emit frame:end event
        this._emit('frame:end', {
            frameId: frame.id,
            data: {
                id: frame.id,
                endedAt: frame.endedAt,
                stats: { ...frame.stats }
            }
        });
    }
    
    /**
     * Emit event via emitter
     */
    _emit(event, data) {
        if (this.eventEmitter && typeof this.eventEmitter === 'function') {
            try {
                const eventData = {
                    event,
                    ts: Date.now(),
                    ...data
                };
                // Debug log
                console.log(`[observability] Emitting ${event}:`, eventData.frameId || eventData.nodeId || 'global');
                this.eventEmitter(eventData);
            } catch (err) {
                // Silently ignore emit errors
                console.error('[observability] Error emitting event:', err);
            }
        } else {
            console.warn('[observability] No event emitter available');
        }
    }
    
    /**
     * Get or create frame for a message
     */
    getOrCreateFrame(msgId, flowId) {
        // Check if we already have a frame for this message
        let frameId = this.msgToFrame.get(msgId);
        
        if (frameId) {
            const frame = this.frames.find(f => f.id === frameId);
            if (frame && frame.isActive()) {
                return frame;
            }
        }
        
        // Create new frame
        frameId = generateFrameId();
        const frame = new ExecutionFrame(frameId);
        
        // Add to ring buffer
        this.frames.push(frame);
        
        // Enforce ring buffer limit
        while (this.frames.length > this.config.maxFrames) {
            const removed = this.frames.shift();
            // Clean up msgId mappings
            for (const [msgId, fId] of this.msgToFrame) {
                if (fId === removed.id) {
                    this.msgToFrame.delete(msgId);
                }
            }
        }
        
        // Track msgId -> frame mapping
        this.msgToFrame.set(msgId, frameId);
        
        // Note: triggerNodeId will be set when first recordInput is called
        // Emit frame:start event (triggerNodeId may be undefined initially)
        this._emit('frame:start', {
            frameId: frame.id,
            data: {
                id: frame.id,
                startedAt: frame.startedAt,
                triggerNodeId: frame.triggerNodeId // Will be set on first input
            }
        });
        
        return frame;
    }
    
    /**
     * Record node input
     */
    recordInput(nodeId, nodeType, flowId, msg) {
        try {
            const msgId = msg?._msgid;
            if (!msgId) return null;
            
            // Always get/create frame first (this emits frame:start if needed)
            const frame = this.getOrCreateFrame(msgId, flowId);
            
            // Check sampling - but still emit basic event even if filtered
            const shouldSample = this.sampler.shouldSample(nodeId, { isError: false });
            
            if (!shouldSample) {
                // Still record basic info but don't create full IOEvent
                const nodeExec = frame.getOrCreateNodeExecution(nodeId, nodeType);
                nodeExec.timing.receivedAt = Date.now();
                // Emit minimal event
                this._emit('node:input', {
                    frameId: frame.id,
                    nodeId,
                    data: {
                        nodeId,
                        nodeType,
                        input: null, // Filtered by sampling
                        sampled: false
                    }
                });
                return nodeExec;
            }
            
            // Create IOEvent for input
            const payloadValue = msg.payload !== undefined ? msg.payload : msg;
            const dataSample = createDataSample(payloadValue, this.config.limits);
            const redactedSample = redactSample(dataSample);
            
            const payload = {
                preview: redactedSample.preview,
                type: payloadValue === null ? 'null' : (Array.isArray(payloadValue) ? 'array' : typeof payloadValue),
                size: redactedSample.size,
                truncated: redactedSample.truncated
            };
            
            const ioEvent = new IOEvent('input', payload);
            
            // Record input
            frame.recordInput(nodeId, nodeType, ioEvent);
            
            // Update semantics
            const nodeExec = frame.nodes[nodeId];
            if (nodeExec) {
                updateSemantics(nodeExec, frame);
            }
            
            // Record sampling
            this.sampler.recordSample(nodeId);
            
            // Emit node:input event with full data
            this._emit('node:input', {
                frameId: frame.id,
                nodeId,
                data: {
                    nodeId,
                    nodeType,
                    input: ioEvent.toJSON(),
                    sampled: true
                }
            });
            
            // If this is the trigger node, emit updated frame:start with triggerNodeId
            if (frame.triggerNodeId === nodeId && !frame.triggerEmitted) {
                frame.triggerEmitted = true;
                this._emit('frame:start', {
                    frameId: frame.id,
                    data: {
                        id: frame.id,
                        startedAt: frame.startedAt,
                        triggerNodeId: frame.triggerNodeId
                    }
                });
            }
            
            return nodeExec;
        } catch (err) {
            // Never throw
            return null;
        }
    }
    
    /**
     * Record node output
     */
    recordOutput(nodeId, nodeType, flowId, msg) {
        try {
            const msgId = msg?._msgid;
            
            console.log('[observability] recordOutput:', {
                nodeId,
                nodeType,
                hasMsgId: !!msgId,
                msgId,
                activeFrames: this.frames.filter(f => f.isActive()).length
            });
            
            // If no msgId, try to find the most recent active frame
            let frame;
            if (msgId) {
                frame = this.getOrCreateFrame(msgId, flowId);
            } else {
                // No msgId - try to use the most recent active frame
                const activeFrames = this.frames.filter(f => f.isActive());
                if (activeFrames.length > 0) {
                    frame = activeFrames[activeFrames.length - 1];
                    console.log('[observability] recordOutput: using most recent active frame:', frame.id);
                } else {
                    // No active frames - create a new one with a synthetic msgId
                    const syntheticMsgId = `synthetic-${Date.now()}-${nodeId}`;
                    frame = this.getOrCreateFrame(syntheticMsgId, flowId);
                    console.log('[observability] recordOutput: created new frame with synthetic msgId:', frame.id);
                }
            }
            
            if (!frame) {
                console.warn('[observability] recordOutput: no frame available, cannot record output');
                return null;
            }
            
            // Check sampling - but still emit basic event even if filtered
            const shouldSample = this.sampler.shouldSample(nodeId, { isError: false });
            
            console.log('[observability] recordOutput: shouldSample:', shouldSample, 'for node:', nodeId);
            
            if (!shouldSample) {
                // Still record basic info but don't create full IOEvents
                const nodeExec = frame.getOrCreateNodeExecution(nodeId, nodeType);
                nodeExec.timing.sentAt = Date.now();
                if (nodeExec.timing.receivedAt) {
                    nodeExec.timing.durationMs = nodeExec.timing.sentAt - nodeExec.timing.receivedAt;
                }
                // Emit minimal event
                console.log('[observability] recordOutput: emitting minimal node:output (filtered by sampling)');
                this._emit('node:output', {
                    frameId: frame.id,
                    nodeId,
                    data: {
                        nodeId,
                        nodeType,
                        outputs: [], // Filtered by sampling
                        sampled: false
                    }
                });
                return nodeExec;
            }
            
            // Normalize send() → IOEvent[]
            const ioEvents = normalizeSend(msg, this.config.limits);
            
            console.log('[observability] recordOutput: normalized', ioEvents.length, 'output events');
            
            // Record outputs
            frame.recordOutput(nodeId, nodeType, ioEvents);
            
            // Update semantics
            const nodeExec = frame.nodes[nodeId];
            if (nodeExec) {
                updateSemantics(nodeExec, frame);
            }
            
            // Record sampling
            this.sampler.recordSample(nodeId);
            
            // Emit node:output event
            console.log('[observability] recordOutput: emitting full node:output event for frame:', frame.id);
            this._emit('node:output', {
                frameId: frame.id,
                nodeId,
                data: {
                    nodeId,
                    nodeType,
                    outputs: ioEvents.map(e => e.toJSON()),
                    semantics: { ...nodeExec.semantics },
                    timing: { ...nodeExec.timing }
                }
            });
            
            return nodeExec;
        } catch (err) {
            // Never throw
            console.error('[observability] Error in recordOutput:', err);
            return null;
        }
    }
    
    /**
     * Record node error
     */
    recordError(nodeId, nodeType, flowId, msg, error) {
        try {
            const msgId = msg?._msgid;
            if (!msgId) return null;
            
            const frame = this.getOrCreateFrame(msgId, flowId);
            frame.recordError(nodeId, nodeType, error);
            
            // Emit node:error event
            this._emit('node:error', {
                frameId: frame.id,
                nodeId,
                data: {
                    nodeId,
                    nodeType,
                    error: {
                        message: error?.message || String(error),
                        code: error?.code || error?.name
                    }
                }
            });
            
            return frame.nodes[nodeId];
        } catch (err) {
            // Never throw
            return null;
        }
    }
    
    /**
     * Get all frames
     */
    getFrames() {
        return this.frames.map(f => f.toJSON());
    }
    
    /**
     * Get specific frame by ID
     */
    getFrame(frameId) {
        const frame = this.frames.find(f => f.id === frameId);
        return frame ? frame.toJSON() : null;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            totalFrames: this.frames.length,
            activeFrames: this.frames.filter(f => f.isActive()).length,
            trackedMessages: this.msgToFrame.size,
            samplerStats: this.sampler.getStats()
        };
    }
    
    /**
     * Reset all state
     */
    reset() {
        this.frames = [];
        this.msgToFrame.clear();
        this.sampler.reset();
    }
    
    /**
     * Shutdown manager
     */
    shutdown() {
        this._stopCleanupTimer();
        
        // End all active frames
        for (const frame of this.frames) {
            if (frame.isActive()) {
                this._endFrame(frame, 'shutdown');
            }
        }
    }
}

/**
 * Create a new FrameManager
 */
function createFrameManager(config, eventEmitter) {
    return new FrameManager(config, eventEmitter);
}

module.exports = {
    FrameManager,
    createFrameManager,
    DEFAULT_CONFIG
};

