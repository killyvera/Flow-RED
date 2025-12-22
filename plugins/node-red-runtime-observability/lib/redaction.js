/**
 * Redaction module for sensitive data protection
 * 
 * Automatically redacts sensitive fields like passwords, tokens,
 * and authorization headers from captured data.
 */

'use strict';

/**
 * Fields that should always be redacted (case-insensitive matching)
 */
const REDACT_FIELDS = [
    'password',
    'passwd',
    'pwd',
    'token',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'authorization',
    'auth',
    'apikey',
    'api_key',
    'api-key',
    'secret',
    'secretkey',
    'secret_key',
    'cookie',
    'cookies',
    'credential',
    'credentials',
    'private',
    'privatekey',
    'private_key'
];

/**
 * HTTP headers that are allowed to pass through
 * All other headers will be redacted
 */
const ALLOWED_HEADERS = [
    'content-type',
    'content-length',
    'status-code',
    'statuscode',
    'user-agent',
    'accept',
    'accept-encoding',
    'accept-language',
    'cache-control',
    'date',
    'host',
    'origin',
    'referer',
    'x-request-id',
    'x-correlation-id'
];

const REDACTED_VALUE = '[REDACTED]';

/**
 * Check if a field name should be redacted
 * 
 * @param {string} fieldName - The field name to check
 * @returns {boolean}
 */
function shouldRedactField(fieldName) {
    if (typeof fieldName !== 'string') return false;
    
    const lowerField = fieldName.toLowerCase().replace(/[-_]/g, '');
    
    for (const redactPattern of REDACT_FIELDS) {
        const normalizedPattern = redactPattern.toLowerCase().replace(/[-_]/g, '');
        if (lowerField.includes(normalizedPattern)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check if a header is allowed
 * 
 * @param {string} headerName - The header name to check
 * @returns {boolean}
 */
function isAllowedHeader(headerName) {
    if (typeof headerName !== 'string') return false;
    
    const lowerHeader = headerName.toLowerCase();
    return ALLOWED_HEADERS.includes(lowerHeader);
}

/**
 * Redact headers object, keeping only allowed headers
 * 
 * @param {object} headers - Headers object to redact
 * @returns {{data: object, redacted: boolean}}
 */
function redactHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return { data: headers, redacted: false };
    }
    
    const result = {};
    let redacted = false;
    
    for (const [key, value] of Object.entries(headers)) {
        if (isAllowedHeader(key)) {
            result[key] = value;
        } else {
            result[key] = REDACTED_VALUE;
            redacted = true;
        }
    }
    
    return { data: result, redacted };
}

/**
 * Recursively redact sensitive fields from an object
 * 
 * @param {any} value - The value to redact
 * @param {WeakSet} seen - Set for circular reference detection
 * @returns {{data: any, redacted: boolean}}
 */
function redactValue(value, seen = new WeakSet()) {
    // Handle primitives
    if (value === null || value === undefined) {
        return { data: value, redacted: false };
    }
    
    const type = typeof value;
    
    if (type !== 'object') {
        return { data: value, redacted: false };
    }
    
    // Circular reference check
    if (seen.has(value)) {
        return { data: '[Circular]', redacted: false };
    }
    seen.add(value);
    
    // Handle arrays
    if (Array.isArray(value)) {
        let anyRedacted = false;
        const result = value.map(item => {
            const { data, redacted } = redactValue(item, seen);
            if (redacted) anyRedacted = true;
            return data;
        });
        return { data: result, redacted: anyRedacted };
    }
    
    // Handle Date
    if (value instanceof Date) {
        return { data: value, redacted: false };
    }
    
    // Handle objects
    const result = {};
    let anyRedacted = false;
    
    for (const [key, val] of Object.entries(value)) {
        // Special handling for 'headers' property
        if (key.toLowerCase() === 'headers' && val && typeof val === 'object') {
            const { data, redacted } = redactHeaders(val);
            result[key] = data;
            if (redacted) anyRedacted = true;
            continue;
        }
        
        // Check if this field should be redacted
        if (shouldRedactField(key)) {
            result[key] = REDACTED_VALUE;
            anyRedacted = true;
            continue;
        }
        
        // Recursively process nested values
        const { data, redacted } = redactValue(val, seen);
        result[key] = data;
        if (redacted) anyRedacted = true;
    }
    
    return { data: result, redacted: anyRedacted };
}

/**
 * Apply redaction to a DataSample's preview
 * 
 * @param {object} sample - DataSample with preview property
 * @returns {object} - DataSample with redacted preview and redacted flag
 */
function redactSample(sample) {
    if (!sample || typeof sample !== 'object') {
        return sample;
    }
    
    try {
        const { data, redacted } = redactValue(sample.preview);
        
        return {
            ...sample,
            preview: data,
            redacted: redacted || sample.redacted || false
        };
    } catch (err) {
        // Safety net - never throw
        return {
            ...sample,
            preview: { _error: 'Redaction failed' },
            redacted: true
        };
    }
}

module.exports = {
    redactSample,
    redactValue,
    redactHeaders,
    shouldRedactField,
    isAllowedHeader,
    REDACT_FIELDS,
    ALLOWED_HEADERS,
    REDACTED_VALUE
};

