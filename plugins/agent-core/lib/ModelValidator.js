/**
 * ModelValidator.js - Validates model responses
 * 
 * Ensures model responses conform to the strict contract:
 * - Valid JSON
 * - Required fields present
 * - Action is 'tool' or 'final'
 * - Tool is in allowed list
 * - Confidence is between 0 and 1
 * 
 * @module lib/ModelValidator
 */

class ValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

class ModelValidator {
  /**
   * @param {string[]} allowedTools - List of allowed tool names
   */
  constructor(allowedTools = []) {
    this.allowedTools = allowedTools;
  }

  /**
   * Validate model response
   * 
   * @param {any} response - Raw model response
   * @returns {ModelResponse} Validated response
   * @throws {ValidationError} If validation fails
   */
  validate(response) {
    // Check if response is an object
    if (!response || typeof response !== 'object') {
      throw new ValidationError(
        'Model response must be a valid JSON object',
        'INVALID_JSON'
      );
    }

    // Validate action field
    if (!response.action || !['tool', 'final'].includes(response.action)) {
      throw new ValidationError(
        'Model response must have action field with value "tool" or "final"',
        'INVALID_ACTION'
      );
    }

    // Validate confidence field
    if (typeof response.confidence !== 'number' || 
        response.confidence < 0 || 
        response.confidence > 1) {
      throw new ValidationError(
        'Model response must have confidence field between 0 and 1',
        'INVALID_CONFIDENCE'
      );
    }

    // If action is 'tool', validate tool field
    if (response.action === 'tool') {
      if (!response.tool || typeof response.tool !== 'string') {
        throw new ValidationError(
          'Model response with action "tool" must have a tool field',
          'MISSING_TOOL'
        );
      }

      // Check if tool is allowed
      if (!this.allowedTools.includes(response.tool)) {
        throw new ValidationError(
          `Tool "${response.tool}" is not in allowed tools list: [${this.allowedTools.join(', ')}]`,
          'TOOL_NOT_ALLOWED'
        );
      }

      // Validate input field exists
      if (response.input === undefined) {
        throw new ValidationError(
          'Model response with action "tool" must have an input field',
          'MISSING_INPUT'
        );
      }
    }

    // If action is 'final', validate input field
    if (response.action === 'final') {
      if (response.input === undefined) {
        throw new ValidationError(
          'Model response with action "final" must have an input field',
          'MISSING_FINAL_RESULT'
        );
      }
    }

    return {
      action: response.action,
      tool: response.tool,
      input: response.input,
      confidence: response.confidence,
      message: response.message
    };
  }

  /**
   * Try to parse and validate model response
   * 
   * @param {string|object} rawResponse - Raw response (JSON string or object)
   * @returns {ModelResponse} Validated response
   * @throws {ValidationError} If parsing or validation fails
   */
  parseAndValidate(rawResponse) {
    let parsed;

    // Try to parse if string
    if (typeof rawResponse === 'string') {
      try {
        parsed = JSON.parse(rawResponse);
      } catch (err) {
        throw new ValidationError(
          `Failed to parse model response as JSON: ${err.message}`,
          'JSON_PARSE_ERROR'
        );
      }
    } else {
      parsed = rawResponse;
    }

    return this.validate(parsed);
  }

  /**
   * Update allowed tools list
   * 
   * @param {string[]} allowedTools - New allowed tools list
   */
  updateAllowedTools(allowedTools) {
    this.allowedTools = allowedTools;
  }

  /**
   * Check if a tool is allowed
   * 
   * @param {string} toolName - Tool name to check
   * @returns {boolean} True if allowed
   */
  isToolAllowed(toolName) {
    return this.allowedTools.includes(toolName);
  }
}

module.exports = ModelValidator;
module.exports.ValidationError = ValidationError;
