/**
 * Truncation module for safe payload preview
 * 
 * Applies strict limits to prevent memory issues and ensure
 * only preview-sized data is captured.
 */

'use strict';

const DEFAULT_LIMITS = {
    maxPayloadBytes: 50000,
    maxDepth: 6,
    maxKeys: 50,
    maxArrayItems: 20,
    maxStringLength: 5000
};

// Límites altos para casos especiales (chat, Agent Core, tools, memoria)
const SPECIAL_CASE_LIMITS = {
    maxPayloadBytes: 5000000,  // 5MB
    maxDepth: 20,
    maxKeys: 500,
    maxArrayItems: 1000,
    maxStringLength: 500000  // 500KB
};

/**
 * Check if value is a Buffer or binary data
 */
function isBinary(value) {
    if (Buffer.isBuffer(value)) return true;
    if (value instanceof ArrayBuffer) return true;
    if (value instanceof Uint8Array) return true;
    if (value instanceof Int8Array) return true;
    if (value instanceof Uint16Array) return true;
    if (value instanceof Int16Array) return true;
    if (value instanceof Uint32Array) return true;
    if (value instanceof Int32Array) return true;
    if (value instanceof Float32Array) return true;
    if (value instanceof Float64Array) return true;
    return false;
}

/**
 * Check if value is a stream
 */
function isStream(value) {
    if (!value || typeof value !== 'object') return false;
    return typeof value.pipe === 'function' || 
           typeof value.read === 'function' ||
           (value.readable !== undefined && typeof value._read === 'function');
}

/**
 * Estimate the size of a value in bytes (rough approximation)
 */
function estimateSize(value, seen = new WeakSet()) {
    if (value === null || value === undefined) return 8;
    
    const type = typeof value;
    
    if (type === 'boolean') return 4;
    if (type === 'number') return 8;
    if (type === 'string') return value.length * 2;
    if (type === 'function') return 0; // Don't count functions
    
    if (type === 'object') {
        // Prevent circular reference infinite loop
        if (seen.has(value)) return 0;
        seen.add(value);
        
        if (Buffer.isBuffer(value)) return value.length;
        if (Array.isArray(value)) {
            let size = 0;
            for (let i = 0; i < Math.min(value.length, 100); i++) {
                size += estimateSize(value[i], seen);
            }
            return size;
        }
        
        let size = 0;
        const keys = Object.keys(value);
        for (let i = 0; i < Math.min(keys.length, 100); i++) {
            size += keys[i].length * 2;
            size += estimateSize(value[keys[i]], seen);
        }
        return size;
    }
    
    return 8;
}

/**
 * Truncate a value recursively with depth and size limits
 * 
 * @param {any} value - The value to truncate
 * @param {object} limits - Limit configuration
 * @param {number} currentDepth - Current recursion depth
 * @param {WeakSet} seen - Set of seen objects for circular reference detection
 * @returns {{preview: any, truncated: boolean}}
 */
function truncateValue(value, limits, currentDepth = 0, seen = new WeakSet()) {
    let truncated = false;
    
    // Handle null/undefined
    if (value === null || value === undefined) {
        return { preview: value, truncated: false };
    }
    
    // Handle primitives
    const type = typeof value;
    
    if (type === 'boolean' || type === 'number') {
        return { preview: value, truncated: false };
    }
    
    if (type === 'string') {
        if (value.length > limits.maxStringLength) {
            return {
                preview: value.substring(0, limits.maxStringLength) + '...[truncated]',
                truncated: true
            };
        }
        return { preview: value, truncated: false };
    }
    
    if (type === 'function') {
        return { preview: '[Function]', truncated: true };
    }
    
    // Handle binary data
    if (isBinary(value)) {
        const len = value.length || value.byteLength || 0;
        return {
            preview: `[Binary data: ${len} bytes]`,
            truncated: true
        };
    }
    
    // Handle streams
    if (isStream(value)) {
        return {
            preview: '[Stream]',
            truncated: true
        };
    }
    
    // Depth limit check
    if (currentDepth >= limits.maxDepth) {
        if (Array.isArray(value)) {
            return { preview: `[Array: ${value.length} items]`, truncated: true };
        }
        return { preview: '[Object]', truncated: true };
    }
    
    // Circular reference check
    if (type === 'object') {
        if (seen.has(value)) {
            return { preview: '[Circular]', truncated: true };
        }
        seen.add(value);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
        const result = [];
        const maxItems = Math.min(value.length, limits.maxArrayItems);
        
        for (let i = 0; i < maxItems; i++) {
            const itemResult = truncateValue(value[i], limits, currentDepth + 1, seen);
            result.push(itemResult.preview);
            if (itemResult.truncated) truncated = true;
        }
        
        if (value.length > limits.maxArrayItems) {
            result.push(`...[${value.length - limits.maxArrayItems} more items]`);
            truncated = true;
        }
        
        return { preview: result, truncated };
    }
    
    // Handle Date
    if (value instanceof Date) {
        return { preview: value.toISOString(), truncated: false };
    }
    
    // Handle Error
    if (value instanceof Error) {
        return {
            preview: {
                name: value.name,
                message: value.message,
                stack: value.stack ? value.stack.substring(0, 500) : undefined
            },
            truncated: value.stack && value.stack.length > 500
        };
    }
    
    // Handle RegExp
    if (value instanceof RegExp) {
        return { preview: value.toString(), truncated: false };
    }
    
    // Handle plain objects
    if (type === 'object') {
        const result = {};
        const keys = Object.keys(value);
        const maxKeys = Math.min(keys.length, limits.maxKeys);
        
        // Detectar si estamos en un caso especial (límites altos indican caso especial)
        const isSpecialCase = limits.maxStringLength >= 100000; // Casos especiales tienen límites muy altos
        
        // Para casos especiales, asegurar que agentResult tenga prioridad
        // Procesar agentResult primero si existe
        if (isSpecialCase && value.agentResult) {
            try {
                // Preservar agentResult completo, especialmente message
                // NO truncar agentResult.message - es crítico para el chat
                result.agentResult = {
                    ...value.agentResult,
                    message: value.agentResult.message // Preservar mensaje completo sin truncar
                };
            } catch (err) {
                result.agentResult = '[Error accessing agentResult]';
            }
        }
        
        for (let i = 0; i < maxKeys; i++) {
            const key = keys[i];
            
            // Si ya procesamos agentResult, saltarlo
            if (isSpecialCase && key === 'agentResult') {
                continue;
            }
            
            try {
                if (isSpecialCase && key === 'payload' && value[key] && typeof value[key] === 'object' && value[key].message) {
                    // Si el payload tiene message pero está truncado, preservar el payload pero
                    // asegurar que agentResult.message esté disponible
                    const payloadResult = truncateValue(value[key], limits, currentDepth + 1, seen);
                    result[key] = payloadResult.preview;
                    if (payloadResult.truncated) truncated = true;
                } else {
                    const propResult = truncateValue(value[key], limits, currentDepth + 1, seen);
                    result[key] = propResult.preview;
                    if (propResult.truncated) truncated = true;
                }
            } catch (err) {
                // Property access threw an error (getter, proxy, etc)
                result[key] = '[Error accessing property]';
                truncated = true;
            }
        }
        
        if (keys.length > limits.maxKeys) {
            result['...'] = `[${keys.length - limits.maxKeys} more keys]`;
            truncated = true;
        }
        
        return { preview: result, truncated };
    }
    
    // Fallback for unknown types
    return { preview: String(value), truncated: true };
}

/**
 * Detect if a message is a special case that needs full message (no truncation)
 * 
 * @param {any} msg - The message object
 * @param {string} nodeType - Type of node (e.g., 'agent-core', 'chat-node')
 * @param {number} port - Output port number
 * @returns {boolean} - True if this is a special case
 */
function isSpecialCase(msg, nodeType, port) {
    // Agent Core output 4 (model_response)
    if (nodeType === 'agent-core' && port === 4) {
        return true;
    }
    
    // Agent Core output 3 (result) - también puede contener mensajes completos
    if (nodeType === 'agent-core' && port === 3) {
        return true;
    }
    
    // Chat Node (input/output)
    if (nodeType === 'chat-node') {
        return true;
    }
    
    // Detectar por metadatos del mensaje
    if (msg) {
        // Agent Core model_response
        if (msg._agentCore && msg._agentCore.type === 'model_response') {
            return true;
        }
        
        // Agent Core con agentResult.message
        if (msg.agentResult && msg.agentResult.message) {
            return true;
        }
        
        // Tool response
        if (msg._agentCore && msg._agentCore.type === 'tool_response') {
            return true;
        }
        
        // Memory
        if (msg._agentCore && msg._agentCore.type === 'memory') {
            return true;
        }
    }
    
    return false;
}

/**
 * Create a DataSample from a message payload
 * 
 * @param {any} payload - The payload to sample
 * @param {object} limits - Limit configuration (optional)
 * @param {object} options - Additional options (optional)
 * @param {string} options.nodeType - Type of node
 * @param {number} options.port - Output port number
 * @param {any} options.originalMsg - Original message object for metadata detection
 * @returns {DataSample} - { ts, preview, size, truncated }
 */
function createDataSample(payload, limits = {}, options = {}) {
    // Detectar si es un caso especial
    const isSpecial = options.originalMsg && isSpecialCase(options.originalMsg, options.nodeType, options.port);
    
    // Usar límites especiales si es un caso especial, sino usar límites por defecto
    // IMPORTANTE: Para casos especiales, los límites especiales tienen prioridad
    // sobre los límites pasados como parámetro (que vienen de la configuración)
    const baseLimits = isSpecial ? SPECIAL_CASE_LIMITS : DEFAULT_LIMITS;
    // Para casos especiales, ignorar los límites de configuración y usar solo los especiales
    const effectiveLimits = isSpecial ? baseLimits : { ...baseLimits, ...limits };
    
    // Log para debugging (solo en casos especiales)
    if (isSpecial) {
        console.log('[observability] Caso especial detectado:', {
            nodeType: options.nodeType,
            port: options.port,
            hasAgentResult: !!(options.originalMsg && options.originalMsg.agentResult),
            agentResultMessageLength: options.originalMsg && options.originalMsg.agentResult && options.originalMsg.agentResult.message 
                ? options.originalMsg.agentResult.message.length 
                : 0,
            limits: effectiveLimits
        });
    }
    
    try {
        const size = estimateSize(payload);
        const { preview, truncated } = truncateValue(payload, effectiveLimits);
        
        // Final size check on serialized preview
        // IMPORTANTE: Para casos especiales, no truncar aunque sea grande
        // porque necesitamos el mensaje completo
        let finalPreview = preview;
        let finalTruncated = truncated;
        
        // Solo hacer el check de tamaño si NO es un caso especial
        if (!isSpecial) {
            try {
                const serialized = JSON.stringify(preview);
                if (serialized && serialized.length > effectiveLimits.maxPayloadBytes) {
                    // Preview too large even after truncation, simplify further
                    finalPreview = {
                        _notice: 'Payload too large for preview',
                        _originalSize: size,
                        _type: Array.isArray(payload) ? 'array' : typeof payload
                    };
                    finalTruncated = true;
                }
            } catch (serializeErr) {
                // JSON stringify failed
                finalPreview = {
                    _notice: 'Payload could not be serialized',
                    _type: typeof payload
                };
                finalTruncated = true;
            }
        } else {
            // Para casos especiales, preservar el preview completo aunque sea grande
            // El mensaje completo es más importante que el tamaño
            console.log('[observability] Preservando mensaje completo para caso especial (sin truncar por tamaño)');
        }
        
        return {
            ts: Date.now(),
            preview: finalPreview,
            size: size,
            truncated: finalTruncated
        };
    } catch (err) {
        // Safety net - never throw
        return {
            ts: Date.now(),
            preview: { _error: 'Failed to create sample' },
            size: 0,
            truncated: true
        };
    }
}

module.exports = {
    createDataSample,
    truncateValue,
    estimateSize,
    isBinary,
    isStream,
    DEFAULT_LIMITS
};

