const Joi = require('joi');

// Validation schemas for different operations
const schemas = {
  // Schema for credit validation
  creditValidation: Joi.object({
    student_id: Joi.string()
      .pattern(/^[A-Z0-9]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Student ID must contain only uppercase letters and numbers',
        'any.required': 'Student ID is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    mock_type: Joi.string()
      .valid('Situational Judgment', 'Clinical Skills', 'Mini-mock')
      .required()
      .messages({
        'any.only': 'Mock type must be one of: Situational Judgment, Clinical Skills, or Mini-mock',
        'any.required': 'Mock type is required'
      })
  }),

  // Schema for booking creation
  bookingCreation: Joi.object({
    mock_exam_id: Joi.string()
      .required()
      .messages({
        'any.required': 'Mock exam ID is required'
      }),
    contact_id: Joi.string()
      .required()
      .messages({
        'any.required': 'Contact ID is required'
      }),
    enrollment_id: Joi.string()
      .required()
      .messages({
        'any.required': 'Enrollment ID is required'
      }),
    student_id: Joi.string()
      .pattern(/^[A-Z0-9]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Student ID must contain only uppercase letters and numbers',
        'any.required': 'Student ID is required'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    dominant_hand: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Dominant hand selection is required'
      }),
    mock_type: Joi.string()
      .valid('Situational Judgment', 'Clinical Skills', 'Mini-mock')
      .required()
      .messages({
        'any.only': 'Mock type must be one of: Situational Judgment, Clinical Skills, or Mini-mock',
        'any.required': 'Mock type is required'
      }),
    exam_date: Joi.string()
      .required()
      .messages({
        'any.required': 'Exam date is required'
      })
  }),

  // Schema for fetching available exams
  availableExams: Joi.object({
    mock_type: Joi.string()
      .valid('Situational Judgment', 'Clinical Skills', 'Mini-mock')
      .required()
      .messages({
        'any.only': 'Mock type must be one of: Situational Judgment, Clinical Skills, or Mini-mock',
        'any.required': 'Mock type is required'
      }),
    include_capacity: Joi.boolean()
      .optional()
      .default(true),
    realtime: Joi.boolean()
      .optional()
      .default(false)
      .messages({
        'boolean.base': 'Realtime parameter must be a boolean value'
      })
  }),

};

/**
 * Validate input data against a schema
 * @param {object} data - Data to validate
 * @param {string} schemaName - Name of the schema to use
 * @returns {object} Validated data
 * @throws {Error} Validation error with details
 */
async function validateInput(data, schemaName) {
  const schema = schemas[schemaName];

  if (!schema) {
    throw new Error(`Validation schema '${schemaName}' not found`);
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    const validationError = new Error(errorMessages.join(', '));
    validationError.status = 400;
    validationError.validationErrors = errorMessages;
    throw validationError;
  }

  return value;
}

/**
 * Express middleware for request validation
 * @param {string} schemaName - Name of the schema to validate against
 */
function validationMiddleware(schemaName) {
  return async (req, res, next) => {
    try {
      // Combine query params and body for validation
      const dataToValidate = {
        ...req.query,
        ...req.body
      };

      const validatedData = await validateInput(dataToValidate, schemaName);

      // Store validated data for use in route handler
      req.validatedData = validatedData;
      next();
    } catch (error) {
      res.status(error.status || 400).json({
        success: false,
        error: error.message,
        validationErrors: error.validationErrors || []
      });
    }
  };
}

module.exports = {
  schemas,
  validateInput,
  validationMiddleware
};