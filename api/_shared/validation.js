const Joi = require('joi');

// Validation schemas for different operations
const schemas = {
  // Schema for credit validation
  // Schema for authentication check
  authCheck: Joi.object({
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
      })
  }),

  // Schema for booking cancellation (DELETE)
  bookingCancellation: Joi.object({
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
    reason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Cancellation reason cannot exceed 500 characters'
      })
  }),

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
      }),
    // Conditional fields based on mock_type
    dominant_hand: Joi.boolean()
      .when('mock_type', {
        is: 'Clinical Skills',
        then: Joi.required().messages({
          'any.required': 'Dominant hand selection is required for Clinical Skills exams'
        }),
        otherwise: Joi.optional().strip()
      }),
    attending_location: Joi.string()
      .valid('mississauga', 'calgary', 'vancouver', 'montreal', 'richmond_hill')
      .when('mock_type', {
        is: Joi.string().valid('Situational Judgment', 'Mini-mock'),
        then: Joi.required().messages({
          'any.required': 'Attending location is required for Situational Judgment and Mini-mock exams',
          'any.only': 'Location must be one of: Mississauga, Calgary, Vancouver, Montreal, or Richmond Hill'
        }),
        otherwise: Joi.optional().strip()
      })
  }),

  // Schema for fetching available exams
  // Schema for listing bookings
  bookingsList: Joi.object({
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
    filter: Joi.string()
      .valid('all', 'upcoming', 'past')
      .optional()
      .default('all')
      .messages({
        'any.only': 'Filter must be one of: all, upcoming, or past'
      }),
    page: Joi.number()
      .integer()
      .min(1)
      .optional()
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      })
  }),
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