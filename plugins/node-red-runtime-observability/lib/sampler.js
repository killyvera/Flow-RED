/**
 * Sampler module for controlling data capture rate
 * 
 * Implements various sampling strategies to limit the amount
 * of data captured per node.
 */

'use strict';

/**
 * Sampling modes:
 * - first-n: Capture first N samples per node, then stop
 * - errors-only: Only capture when there's an error
 * - probabilistic: Random sampling with configurable probability
 * - debug-only: Only capture for nodes with debug property
 */
const SAMPLING_MODES = {
    FIRST_N: 'first-n',
    ERRORS_ONLY: 'errors-only',
    PROBABILISTIC: 'probabilistic',
    DEBUG_ONLY: 'debug-only'
};

const DEFAULT_CONFIG = {
    mode: SAMPLING_MODES.FIRST_N,
    maxPerNode: 3,
    probability: 0.1  // For probabilistic mode: 10%
};

/**
 * Sampler class to track and control sampling per node
 */
class Sampler {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.nodeCounts = new Map();  // nodeId -> count of samples taken
        this.lastReset = Date.now();
    }
    
    /**
     * Update sampler configuration
     * 
     * @param {object} config - New configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Reset all sampling counters
     */
    reset() {
        this.nodeCounts.clear();
        this.lastReset = Date.now();
    }
    
    /**
     * Reset counter for a specific node
     * 
     * @param {string} nodeId - Node ID to reset
     */
    resetNode(nodeId) {
        this.nodeCounts.delete(nodeId);
    }
    
    /**
     * Get current sample count for a node
     * 
     * @param {string} nodeId - Node ID
     * @returns {number}
     */
    getCount(nodeId) {
        return this.nodeCounts.get(nodeId) || 0;
    }
    
    /**
     * Record that a sample was taken for a node
     * 
     * @param {string} nodeId - Node ID
     */
    recordSample(nodeId) {
        const current = this.nodeCounts.get(nodeId) || 0;
        this.nodeCounts.set(nodeId, current + 1);
    }
    
    /**
     * Check if a sample should be taken based on current mode and state
     * 
     * @param {string} nodeId - Node ID
     * @param {object} options - Additional options
     * @param {boolean} options.isError - Whether this is an error event
     * @param {boolean} options.hasDebugFlag - Whether the node has debug enabled
     * @returns {boolean}
     */
    shouldSample(nodeId, options = {}) {
        const { isError = false, hasDebugFlag = false } = options;
        
        try {
            switch (this.config.mode) {
                case SAMPLING_MODES.FIRST_N:
                    return this._shouldSampleFirstN(nodeId);
                    
                case SAMPLING_MODES.ERRORS_ONLY:
                    return isError;
                    
                case SAMPLING_MODES.PROBABILISTIC:
                    return this._shouldSampleProbabilistic();
                    
                case SAMPLING_MODES.DEBUG_ONLY:
                    return hasDebugFlag;
                    
                default:
                    // Unknown mode, fall back to first-n
                    return this._shouldSampleFirstN(nodeId);
            }
        } catch (err) {
            // Safety net - on error, don't sample
            return false;
        }
    }
    
    /**
     * First-N sampling logic
     * 
     * @param {string} nodeId - Node ID
     * @returns {boolean}
     * @private
     */
    _shouldSampleFirstN(nodeId) {
        const count = this.getCount(nodeId);
        return count < this.config.maxPerNode;
    }
    
    /**
     * Probabilistic sampling logic
     * 
     * @returns {boolean}
     * @private
     */
    _shouldSampleProbabilistic() {
        const probability = this.config.probability || 0.1;
        return Math.random() < probability;
    }
    
    /**
     * Get statistics about sampling
     * 
     * @returns {object}
     */
    getStats() {
        const nodeStats = {};
        for (const [nodeId, count] of this.nodeCounts) {
            nodeStats[nodeId] = count;
        }
        
        return {
            mode: this.config.mode,
            maxPerNode: this.config.maxPerNode,
            totalNodes: this.nodeCounts.size,
            totalSamples: Array.from(this.nodeCounts.values()).reduce((a, b) => a + b, 0),
            lastReset: this.lastReset,
            nodeStats
        };
    }
}

/**
 * Create a new Sampler instance
 * 
 * @param {object} config - Sampler configuration
 * @returns {Sampler}
 */
function createSampler(config) {
    return new Sampler(config);
}

module.exports = {
    Sampler,
    createSampler,
    SAMPLING_MODES,
    DEFAULT_CONFIG
};

