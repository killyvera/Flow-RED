/**
 * Semantic Inference
 * 
 * Infers node role and behavior based ONLY on runtime signals.
 * NO hardcoding - pure observation-based inference.
 */

'use strict';

/**
 * Deep equality check for payloads (for pass-through detection)
 */
function payloadsEqual(payload1, payload2) {
    if (payload1 === payload2) return true;
    if (payload1 === null || payload2 === null) return false;
    if (payload1 === undefined || payload2 === undefined) return false;
    
    // Compare previews if available
    const p1 = payload1.preview !== undefined ? payload1.preview : payload1;
    const p2 = payload2.preview !== undefined ? payload2.preview : payload2;
    
    try {
        return JSON.stringify(p1) === JSON.stringify(p2);
    } catch (err) {
        // If stringify fails, assume different
        return false;
    }
}

/**
 * Infer node role based on runtime signals
 * 
 * @param {NodeExecution} nodeExec - Node execution
 * @param {ExecutionFrame} frame - Execution frame
 * @returns {"trigger" | "transform" | "filter" | "generator" | "sink"}
 */
function inferRole(nodeExec, frame) {
    const hasInput = nodeExec.hasInput();
    const hasOutputs = nodeExec.hasOutputs();
    
    // Trigger: First node in frame (no previous nodes)
    if (frame.triggerNodeId === nodeExec.nodeId) {
        return 'trigger';
    }
    
    // Generator: Has outputs but NO input (send without receive)
    if (!hasInput && hasOutputs) {
        return 'generator';
    }
    
    // Transform: Has input AND outputs
    if (hasInput && hasOutputs) {
        return 'transform';
    }
    
    // Filter: Has input but NO outputs (or empty outputs)
    if (hasInput && !hasOutputs) {
        return 'filter';
    }
    
    // Sink: Only has input, never sends
    if (hasInput && !hasOutputs) {
        return 'sink';
    }
    
    // Default fallback
    return 'transform';
}

/**
 * Infer node behavior based on runtime signals
 * 
 * @param {NodeExecution} nodeExec - Node execution
 * @returns {"pass-through" | "transformed" | "filtered" | "bifurcated" | "terminated"}
 */
function inferBehavior(nodeExec) {
    const hasInput = nodeExec.hasInput();
    const outputCount = nodeExec.outputs.length;
    
    // Filtered: No outputs
    if (outputCount === 0) {
        return 'filtered';
    }
    
    // Bifurcated: Multiple outputs (> 1)
    if (outputCount > 1) {
        return 'bifurcated';
    }
    
    // Check pass-through vs transformed
    if (hasInput && outputCount === 1) {
        const inputPayload = nodeExec.input.payload;
        const outputPayload = nodeExec.getFirstOutputPayload();
        
        if (inputPayload && outputPayload) {
            if (payloadsEqual(inputPayload, outputPayload)) {
                return 'pass-through';
            } else {
                return 'transformed';
            }
        }
    }
    
    // Transformed: Has input and output but payloads differ
    if (hasInput && outputCount === 1) {
        return 'transformed';
    }
    
    // Terminated: Has input but no send occurred (detected at frame end)
    // This is handled separately when frame closes
    
    // Default
    return 'transformed';
}

/**
 * Update semantics for a node execution
 * 
 * @param {NodeExecution} nodeExec - Node execution
 * @param {ExecutionFrame} frame - Execution frame
 */
function updateSemantics(nodeExec, frame) {
    nodeExec.semantics.role = inferRole(nodeExec, frame);
    nodeExec.semantics.behavior = inferBehavior(nodeExec);
}

/**
 * Finalize semantics when frame ends (detect terminated nodes)
 * 
 * @param {NodeExecution} nodeExec - Node execution
 */
function finalizeSemantics(nodeExec) {
    // If node has input but never sent, mark as terminated
    if (nodeExec.hasInput() && !nodeExec.hasOutputs()) {
        // Could be filtered OR terminated
        // If behavior is already filtered, keep it
        // Otherwise mark as terminated
        if (nodeExec.semantics.behavior !== 'filtered') {
            nodeExec.semantics.behavior = 'terminated';
        }
    }
}

module.exports = {
    inferRole,
    inferBehavior,
    updateSemantics,
    finalizeSemantics,
    payloadsEqual
};

