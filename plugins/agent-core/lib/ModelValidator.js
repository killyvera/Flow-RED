/**
 * ModelValidator.js - Model Response Validation
 * 
 * Validates model responses according to strict JSON contracts.
 * Ensures responses conform to expected formats and constraints.
 * 
 * @module lib/ModelValidator
 */

/**
 * Model Response Validator
 * 
 * @class
 */
class ModelValidator {
  /**
   * @param {string[]} allowedTools - List of allowed tool names
   */
  constructor(allowedTools) {
    this.allowedTools = allowedTools || [];
  }

  /**
   * Validate a model response
   * 
   * Expected format:
   * {
   *   "action": "tool" | "final",
   *   "tool": "tool_name_if_any",
   *   "input": {},
   *   "confidence": number,
   *   "message": "optional"
   * }
   * 
   * @param {object} response - Model response object
   * @returns {object} Validation result {valid: boolean, errors: string[]}
   */
  validate(response) {
    const errors = [];

    // Must be a valid object
    if (!response || typeof response !== 'object') {
      errors.push('Response must be a valid JSON object');
      return { valid: false, errors };
    }

    // Must have 'action' field
    if (!response.action) {
      errors.push('Response must have an "action" field');
    } else if (response.action !== 'tool' && response.action !== 'final') {
      errors.push('Action must be either "tool" or "final"');
    }

    // If action is 'tool', validate tool-specific fields
    if (response.action === 'tool') {
      if (!response.tool) {
        errors.push('Tool action must specify a "tool" name');
      } else if (!this.allowedTools.includes(response.tool)) {
        errors.push(`Tool "${response.tool}" is not in allowedTools list: [${this.allowedTools.join(', ')}]`);
      }

      if (!response.input) {
        errors.push('Tool action must have an "input" object');
      } else if (typeof response.input !== 'object') {
        errors.push('Tool input must be an object');
      }
    }

    // Validate confidence if present
    if (response.confidence !== undefined) {
      if (typeof response.confidence !== 'number') {
        errors.push('Confidence must be a number');
      } else if (response.confidence < 0 || response.confidence > 1) {
        errors.push('Confidence must be between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Parse and validate a model response string
   * 
   * @param {string} responseString - Raw response string (should be JSON)
   * @returns {object} {valid: boolean, parsed: object|null, errors: string[]}
   */
  parseAndValidate(responseString) {
    let parsed;

    // Try to parse JSON
    try {
      parsed = JSON.parse(responseString);
    } catch (err) {
      return {
        valid: false,
        parsed: null,
        errors: [`Invalid JSON: ${err.message}`]
      };
    }

    // Validate parsed object
    const validation = this.validate(parsed);
    
    return {
      valid: validation.valid,
      parsed: parsed,
      errors: validation.errors
    };
  }
}

module.exports = ModelValidator;

