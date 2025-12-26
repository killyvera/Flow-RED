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
 * 
 * @param {any} msg - The message object
 * @param {number} port - Output port number
 * @param {object} limits - Truncation limits
 * @param {object} context - Additional context (optional)
 * @param {string} context.nodeType - Type of node
 * @param {string} context.nodeId - ID of node
 */
function createIOEventFromMessage(msg, port, limits, context = {}) {
    // Log SIMPLE al inicio para verificar que se ejecuta
    console.log('[observability] createIOEventFromMessage CALLED', port, context.nodeType);
    
    if (msg === null || msg === undefined) {
        return null;
    }
    
    // Log de diagnóstico AL INICIO para TODOS los casos (no solo agent-core)
    // Esto nos ayudará a entender qué está llegando
    console.log('[observability] 🔍 createIOEventFromMessage - ENTRADA:', {
        port: port,
        nodeType: context.nodeType || 'NO DEFINIDO',
        nodeId: context.nodeId || 'NO DEFINIDO',
        hasMsg: !!msg,
        msgType: typeof msg,
        isArray: Array.isArray(msg),
        msgKeys: msg && typeof msg === 'object' ? Object.keys(msg).slice(0, 10) : [],
        hasAgentResult: !!(msg && msg.agentResult),
        hasPayload: !!(msg && msg.payload),
        payloadType: msg && msg.payload ? typeof msg.payload : 'N/A'
    });
    
    // Log específico para Agent Core
    if (context.nodeType === 'agent-core' && (port === 3 || port === 4)) {
        console.log('[observability] 🎯 createIOEventFromMessage - Agent Core output (puerto', port, '):', {
            port: port,
            nodeType: context.nodeType,
            nodeId: context.nodeId,
            hasAgentResult: !!msg.agentResult,
            agentResultMessage: msg.agentResult?.message ? msg.agentResult.message.substring(0, 50) + '...' : 'NO',
            agentResultMessageLength: msg.agentResult?.message ? msg.agentResult.message.length : 0,
            payloadType: typeof msg.payload,
            payloadIsString: typeof msg.payload === 'string',
            payloadLength: typeof msg.payload === 'string' ? msg.payload.length : 'N/A',
            msgKeys: Object.keys(msg),
            fullMsgStructure: JSON.stringify(msg, null, 2).substring(0, 500)
        });
    }
    
    // Detectar si es un caso especial antes de crear el preview
    const isSpecialCase = (context.nodeType === 'agent-core' && (port === 4 || port === 3)) ||
                          context.nodeType === 'chat-node' ||
                          (msg._agentCore && msg._agentCore.type === 'model_response') ||
                          (msg.agentResult && msg.agentResult.message);
    
    // Para casos especiales, incluir propiedades importantes del mensaje completo
    // (como agentResult) en el preview, no solo el payload
    let valueToSample;
    if (isSpecialCase) {
        // Para Agent Core outputs 3 y 4, SIEMPRE incluir agentResult si existe
        // incluso si el payload es un string simple
        if (msg.agentResult) {
            // Incluir el mensaje completo con agentResult para casos especiales
            // Esto asegura que agentResult.message completo esté disponible
            valueToSample = {
                payload: msg.payload !== undefined ? msg.payload : msg,
                agentResult: msg.agentResult,
                _agentCore: msg._agentCore,
                envelope: msg.envelope
            };
            
            // Log para debugging
            console.log('[observability] Caso especial - incluyendo agentResult en preview:', {
                nodeType: context.nodeType,
                port: port,
                hasAgentResult: !!msg.agentResult,
                agentResultMessageLength: msg.agentResult.message ? msg.agentResult.message.length : 0,
                payloadType: typeof msg.payload,
                payloadIsString: typeof msg.payload === 'string',
                payloadLength: typeof msg.payload === 'string' ? msg.payload.length : 'N/A'
            });
        } else {
            // Si no hay agentResult pero es un caso especial, incluir el mensaje completo
            valueToSample = msg;
            console.log('[observability] Caso especial pero sin agentResult, usando mensaje completo');
        }
    } else {
        // Para casos normales, solo usar el payload
        valueToSample = msg.payload !== undefined ? msg.payload : msg;
    }
    
    // Create safe payload preview with context for special case detection
    const dataSample = createDataSample(valueToSample, limits, {
        nodeType: context.nodeType,
        port: port,
        originalMsg: msg
    });
    const redactedSample = redactSample(dataSample);
    
    // Verificar que agentResult esté en el preview para casos especiales
    if (isSpecialCase && msg.agentResult) {
        const previewHasAgentResult = redactedSample.preview && 
                                     (redactedSample.preview.agentResult || 
                                      (typeof redactedSample.preview === 'object' && redactedSample.preview.agentResult));
        if (!previewHasAgentResult) {
            console.warn('[observability] ⚠️ agentResult NO está en el preview después del truncamiento!', {
                nodeType: context.nodeType,
                port: port,
                previewKeys: redactedSample.preview ? Object.keys(redactedSample.preview) : [],
                valueToSampleKeys: valueToSample ? Object.keys(valueToSample) : []
            });
            // Forzar inclusión de agentResult en el preview
            if (redactedSample.preview && typeof redactedSample.preview === 'object') {
                redactedSample.preview.agentResult = msg.agentResult;
                console.log('[observability] ✅ agentResult agregado manualmente al preview');
            }
        } else {
            console.log('[observability] ✅ agentResult está en el preview');
        }
    }
    
    // Para casos especiales (Agent Core, Chat Node), incluir el mensaje completo
    // ANTES de crear el payload, para asegurar que esté disponible
    let agentResultToInclude = null;
    if (isSpecialCase && msg.agentResult) {
        agentResultToInclude = {
            ...msg.agentResult,
            message: msg.agentResult.message // Mensaje completo sin truncar (puede ser null)
        };
        console.log('[observability] ✅ Preparando agentResult para incluir en payload:', {
            nodeType: context.nodeType,
            port: port,
            hasMessage: !!msg.agentResult.message,
            messageLength: msg.agentResult.message ? msg.agentResult.message.length : 0
        });
    } else if (isSpecialCase) {
        console.warn('[observability] ⚠️ Caso especial detectado pero NO hay agentResult:', {
            nodeType: context.nodeType,
            port: port,
            msgKeys: Object.keys(msg),
            hasAgentResult: !!msg.agentResult
        });
    }
    
    const payload = {
        preview: redactedSample.preview,
        type: getPayloadType(valueToSample),
        size: redactedSample.size,
        truncated: redactedSample.truncated
    };
    
    // Para casos especiales (Agent Core puerto 4, Chat Node), incluir el mensaje completo
    // además del preview truncado. Esto permite que el frontend obtenga el mensaje completo
    // cuando lo necesite (como en el Chat Node), mientras que el preview truncado se usa
    // para las tabs de información de entrada/salida
    if (isSpecialCase) {
        console.log('[observability] 🎯 Caso especial detectado, incluyendo mensaje completo:', {
            nodeType: context.nodeType,
            port: port,
            hasAgentResult: !!msg.agentResult,
            hasAgentResultToInclude: !!agentResultToInclude,
            hasPayloadMessage: !!(msg.payload && typeof msg.payload === 'object' && msg.payload.message)
        });
        
        // Incluir agentResult completo si existe
        if (agentResultToInclude) {
            payload.agentResult = agentResultToInclude;
            console.log('[observability] ✅ agentResult incluido en payload.agentResult (nivel superior):', {
                nodeType: context.nodeType,
                port: port,
                payloadKeys: Object.keys(payload),
                agentResultKeys: Object.keys(agentResultToInclude),
                messageLength: agentResultToInclude.message ? agentResultToInclude.message.length : 0
            });
        }
        
        // Para Agent Core puerto 4, incluir también el mensaje completo completo
        // (no solo agentResult.message) para asegurar que el Chat Node tenga acceso completo
        if (context.nodeType === 'agent-core' && port === 4) {
            // Intentar obtener el mensaje completo de diferentes fuentes
            let fullMessageText = null;
            
            if (msg.agentResult && msg.agentResult.message) {
                fullMessageText = msg.agentResult.message;
            } else if (msg.payload && typeof msg.payload === 'object' && msg.payload.message) {
                fullMessageText = msg.payload.message;
            } else if (typeof msg.payload === 'string') {
                fullMessageText = msg.payload;
            }
            
            if (fullMessageText) {
                payload.fullMessage = fullMessageText;
                console.log('[observability] ✅ fullMessage incluido en payload.fullMessage (puerto 4):', {
                    nodeType: context.nodeType,
                    port: port,
                    messageLength: payload.fullMessage.length,
                    preview: payload.fullMessage.substring(0, 100) + '...',
                    source: msg.agentResult && msg.agentResult.message ? 'agentResult.message' : 
                           (msg.payload && typeof msg.payload === 'object' && msg.payload.message ? 'payload.message' : 'payload (string)')
                });
            } else {
                console.warn('[observability] ⚠️ No se pudo obtener fullMessage para puerto 4:', {
                    hasAgentResult: !!msg.agentResult,
                    hasPayload: !!msg.payload,
                    payloadType: typeof msg.payload
                });
            }
        }
        
        // También incluir el mensaje original completo si es necesario para otros casos
        // (por ejemplo, si el payload es un objeto validated con message)
        if (msg.payload && typeof msg.payload === 'object' && msg.payload.message && typeof msg.payload.message === 'string') {
            // Si el mensaje del payload no está truncado o es diferente del agentResult.message
            if (!msg.agentResult || msg.payload.message !== msg.agentResult.message) {
                payload.completePayload = {
                    ...msg.payload,
                    message: msg.payload.message // Mensaje completo sin truncar
                };
                console.log('[observability] ✅ completePayload incluido en payload.completePayload:', {
                    nodeType: context.nodeType,
                    port: port,
                    messageLength: payload.completePayload.message.length
                });
            }
        }
    } else {
        console.log('[observability] ⚠️ NO es caso especial:', {
            nodeType: context.nodeType,
            port: port,
            isAgentCore: context.nodeType === 'agent-core',
            isPort4: port === 4,
            isPort3: port === 3,
            hasAgentResult: !!msg.agentResult,
            hasAgentCore: !!(msg._agentCore && msg._agentCore.type === 'model_response')
        });
    }
    
    // Log final del payload antes de retornar
    console.log('[observability] 📦 Payload final antes de crear IOEvent:', {
        nodeType: context.nodeType,
        port: port,
        payloadKeys: Object.keys(payload),
        hasPreview: !!payload.preview,
        hasAgentResult: !!payload.agentResult,
        hasFullMessage: !!payload.fullMessage,
        hasCompletePayload: !!payload.completePayload,
        truncated: payload.truncated
    });
    
    // Log CRÍTICO: Verificar el payload completo serializado
    try {
        const payloadStr = JSON.stringify(payload, null, 2);
        console.log('[observability] 🔴 PAYLOAD COMPLETO SERIALIZADO (primeros 2000 chars):', payloadStr.substring(0, 2000));
    } catch (err) {
        console.error('[observability] ERROR serializando payload:', err);
    }
    
    const ioEvent = new IOEvent('output', payload, port);
    
    // Log CRÍTICO: Verificar el IOEvent después de crearlo
    try {
        const ioEventJSON = ioEvent.toJSON();
        console.log('[observability] 🔴 IOEvent.toJSON() payload keys:', Object.keys(ioEventJSON.payload || {}));
        console.log('[observability] 🔴 IOEvent.toJSON() completo (primeros 2000 chars):', JSON.stringify(ioEventJSON, null, 2).substring(0, 2000));
    } catch (err) {
        console.error('[observability] ERROR serializando IOEvent:', err);
    }
    
    return ioEvent;
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
 * @param {object} context - Additional context (optional)
 * @param {string} context.nodeType - Type of node
 * @param {string} context.nodeId - ID of node
 * @returns {IOEvent[]} Array of IOEvents
 */
function normalizeSend(msg, limits = {}, context = {}) {
    // Log SIMPLE al inicio para verificar que se ejecuta
    console.log('[observability] normalizeSend CALLED');
    
    // Log de diagnóstico para verificar qué contexto se está pasando
    console.log('[observability] 📥 normalizeSend - ENTRADA:', {
        nodeType: context.nodeType || 'NO DEFINIDO',
        nodeId: context.nodeId || 'NO DEFINIDO',
        hasMsg: !!msg,
        msgType: typeof msg,
        isArray: Array.isArray(msg),
        arrayLength: Array.isArray(msg) ? msg.length : 'N/A',
        contextKeys: Object.keys(context)
    });
    
    const events = [];
    
    // Handle null/undefined
    if (msg === null || msg === undefined) {
        return events; // Empty array = filtered
    }
    
    // Handle single message object
    if (!Array.isArray(msg)) {
        const event = createIOEventFromMessage(msg, 0, limits, context);
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
        
        // Log específico para Agent Core puerto 4
        if (context.nodeType === 'agent-core' && portIndex === 4) {
            console.log('[observability] 🎯 normalizeSend - Procesando Agent Core puerto 4:', {
                nodeType: context.nodeType,
                nodeId: context.nodeId,
                portIndex: portIndex,
                hasPortValue: !!portValue,
                portValueType: typeof portValue,
                hasAgentResult: !!(portValue && portValue.agentResult),
                agentResultMessageLength: portValue && portValue.agentResult && portValue.agentResult.message ? portValue.agentResult.message.length : 0,
                portValueKeys: portValue && typeof portValue === 'object' ? Object.keys(portValue).slice(0, 15) : []
            });
        }
        
        if (Array.isArray(portValue)) {
            // Multiple messages for this port: [msg1, msg2]
            for (const subMsg of portValue) {
                if (subMsg !== null && subMsg !== undefined) {
                    const event = createIOEventFromMessage(subMsg, portIndex, limits, context);
                    if (event) {
                        events.push(event);
                    }
                }
            }
        } else {
            // Single message for this port
            const event = createIOEventFromMessage(portValue, portIndex, limits, context);
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

