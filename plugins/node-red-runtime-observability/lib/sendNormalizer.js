/**
 * Send Normalizer
 * 
 * Normalizes all Node-RED send() variants into IOEvent[].
 * Handles: send(msg), send(null), send([msg]), send([null, msg]), send([[msg1, msg2], [msg3]])
 */

'use strict';

const { IOEvent } = require('./executionContract');
const { createDataSample } = require('./truncation');
const { redactSample } = require('./redaction');

/**
 * Get payload type string
 */
function getPayloadType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * Create IOEvent from a message
 */
function createIOEventFromMessage(msg, port, limits) {
    if (msg === null || msg === undefined) {
        return null;
    }
    
    // Create safe payload preview
    const payloadValue = msg.payload !== undefined ? msg.payload : msg;
    const dataSample = createDataSample(payloadValue, limits);
    const redactedSample = redactSample(dataSample);
    
    const payload = {
        preview: redactedSample.preview,
        type: getPayloadType(payloadValue),
        size: redactedSample.size,
        truncated: redactedSample.truncated
    };
    
    return new IOEvent('output', payload, port);
}

/**
 * Normalize Node-RED send() call into IOEvent[]
 * 
 * Handles all variants:
 * - send(msg) → [{port: 0, ...}]
 * - send(null) → []
 * - send([msg]) → [{port: 0, ...}]
 * - send([null, msg]) → [{port: 1, ...}]
 * - send([[msg1, msg2], [msg3]]) → [{port: 0, ...}, {port: 0, ...}, {port: 1, ...}]
 * 
 * @param {any} msg - The message(s) passed to send()
 * @param {object} limits - Truncation limits
 * @returns {IOEvent[]} Array of IOEvents
 */
function normalizeSend(msg, limits = {}) {
    const events = [];
    
    // Handle null/undefined
    if (msg === null || msg === undefined) {
        return events; // Empty array = filtered
    }
    
    // Handle single message object
    if (!Array.isArray(msg)) {
        const event = createIOEventFromMessage(msg, 0, limits);
        if (event) {
            events.push(event);
        }
        return events;
    }
    
    // Handle array: [msg] or [msg1, msg2] or [[msg1, msg2], [msg3]]
    for (let portIndex = 0; portIndex < msg.length; portIndex++) {
        const portValue = msg[portIndex];
        
        if (portValue === null || portValue === undefined) {
            // Null in port = no output on this port (filtered)
            continue;
        }
        
        if (Array.isArray(portValue)) {
            // Multiple messages for this port: [msg1, msg2]
            for (const subMsg of portValue) {
                if (subMsg !== null && subMsg !== undefined) {
                    const event = createIOEventFromMessage(subMsg, portIndex, limits);
                    if (event) {
                        events.push(event);
                    }
                }
            }
        } else {
            // Single message for this port
            const event = createIOEventFromMessage(portValue, portIndex, limits);
            if (event) {
                events.push(event);
            }
        }
    }
    
    return events;
}

module.exports = {
    normalizeSend,
    createIOEventFromMessage,
    getPayloadType
};

