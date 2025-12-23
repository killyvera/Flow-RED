/**
 * Validador de respuestas del modelo Azure OpenAI
 * 
 * Valida que las respuestas del modelo cumplan con el contrato esperado
 * para el sistema de agentes Redflow.
 */
class ResponseValidator {
  /**
   * Valida la respuesta JSON del modelo
   * 
   * @param {string} content - Contenido JSON como string
   * @param {string} traceId - Trace ID para observabilidad
   * @returns {Object} Respuesta parseada y validada
   * @throws {Error} Si la validación falla
   */
  static validate(content, traceId) {
    // 1. Parsear JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw {
        code: 'AZURE_OPENAI_JSON_INVALID',
        message: `Invalid JSON in model response: ${error.message}`,
        traceId
      };
    }

    // 2. Validar que sea un objeto
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw {
        code: 'AZURE_OPENAI_JSON_INVALID',
        message: 'Model response must be a JSON object',
        traceId
      };
    }

    // 3. Validar campo requerido: action
    if (!parsed.action) {
      throw {
        code: 'AZURE_OPENAI_MISSING_FIELD',
        message: 'Missing required field: action',
        traceId
      };
    }

    // 4. Validar que action sea "tool" o "final"
    if (parsed.action !== 'tool' && parsed.action !== 'final') {
      throw {
        code: 'AZURE_OPENAI_INVALID_ACTION',
        message: `Invalid action: "${parsed.action}". Must be "tool" or "final"`,
        traceId
      };
    }

    // 5. Si action es "tool", validar que "tool" esté presente
    if (parsed.action === 'tool' && !parsed.tool) {
      throw {
        code: 'AZURE_OPENAI_MISSING_FIELD',
        message: 'Missing required field "tool" when action is "tool"',
        traceId
      };
    }

    // 6. Validar campo requerido: confidence (opcional pero si está, debe ser válido)
    if (parsed.confidence !== undefined) {
      if (typeof parsed.confidence !== 'number') {
        throw {
          code: 'AZURE_OPENAI_INVALID_FIELD',
          message: 'Field "confidence" must be a number',
          traceId
        };
      }

      if (parsed.confidence < 0 || parsed.confidence > 1) {
        throw {
          code: 'AZURE_OPENAI_INVALID_FIELD',
          message: `Field "confidence" must be between 0 and 1, got: ${parsed.confidence}`,
          traceId
        };
      }
    }

    // 7. Normalizar respuesta
    const validatedResponse = {
      action: parsed.action,
      tool: parsed.tool || null,
      input: parsed.input || {},
      confidence: parsed.confidence !== undefined ? parsed.confidence : 0.0,
      message: parsed.message || ''
    };

    return validatedResponse;
  }

  /**
   * Valida un array de tools
   * 
   * @param {Array} tools - Array de herramientas
   * @returns {boolean} true si es válido
   */
  static validateTools(tools) {
    if (!tools) {
      return true; // Tools es opcional
    }

    if (!Array.isArray(tools)) {
      return false;
    }

    for (const tool of tools) {
      if (!tool.name || typeof tool.name !== 'string') {
        return false;
      }
      if (tool.inputSchema && typeof tool.inputSchema !== 'object') {
        return false;
      }
    }

    return true;
  }
}

module.exports = ResponseValidator;

