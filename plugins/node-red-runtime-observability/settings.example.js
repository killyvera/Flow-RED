/**
 * Example settings.js configuration for node-red-runtime-observability
 * 
 * Add this configuration to your Node-RED settings.js file to enable
 * and configure the observability plugin.
 */

module.exports = {
    // ... your other Node-RED settings ...

    /**
     * Runtime Observability Plugin Configuration
     * 
     * This plugin provides real Input/Output observability per node.
     * It captures preview-only data samples with strict limits.
     * 
     * IMPORTANT: This is an EXPERIMENTAL plugin.
     * - It may impact performance under high message throughput
     * - Data is NOT persisted - only kept in memory
     * - Sensitive fields are automatically redacted
     */
    observability: {
        /**
         * Enable or disable the plugin
         * Default: false (opt-in, disabled by default)
         * 
         * Set to true to enable observability features
         */
        enabled: false,

        /**
         * Sampling configuration
         * Controls how many samples are captured per node
         */
        sampling: {
            /**
             * Sampling mode:
             * - "first-n"      : Capture first N samples per node (default)
             * - "errors-only"  : Only capture when errors occur
             * - "probabilistic": Random sampling with configurable probability
             * - "debug-only"   : Only capture for nodes with debug enabled
             */
            mode: "first-n",

            /**
             * Maximum samples to capture per node (for first-n mode)
             * Default: 3
             */
            maxPerNode: 3,

            /**
             * Probability for probabilistic mode (0.0 to 1.0)
             * Default: 0.1 (10%)
             */
            probability: 0.1
        },

        /**
         * Data limits configuration
         * Strict limits to prevent memory issues
         */
        limits: {
            /**
             * Maximum payload size in bytes for preview
             * Default: 50000 (50KB)
             */
            maxPayloadBytes: 50000,

            /**
             * Maximum object nesting depth
             * Default: 6
             */
            maxDepth: 6,

            /**
             * Maximum number of keys per object
             * Default: 50
             */
            maxKeys: 50,

            /**
             * Maximum array items to include
             * Default: 20
             */
            maxArrayItems: 20,

            /**
             * Maximum string length
             * Default: 5000
             */
            maxStringLength: 5000
        },

        /**
         * WebSocket configuration (optional)
         */
        websocket: {
            /**
             * Heartbeat interval in milliseconds
             * Default: 15000 (15 seconds)
             */
            heartbeatInterval: 15000,

            /**
             * Maximum concurrent WebSocket connections
             * Default: 10
             */
            maxConnections: 10
        }
    }

    // ... your other Node-RED settings ...
};

