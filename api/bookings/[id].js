/**
 * GET /api/bookings/[id] - Fetches detailed information about a specific booking
 * DELETE /api/bookings/[id] - Cancels a booking and restores credits
 *
 * Query Parameters (GET):
 * - student_id: The student's ID (required)
 * - email: The student's email (required)
 *
 * Body Parameters (DELETE):
 * - student_id: The student's ID (required)
 * - email: The student's email (required)
 * - reason: Cancellation reason (optional)
 *
 * URL Parameters:
 * - id: The HubSpot booking object ID
 *
 * Returns:
 * - 200: Success (booking details for GET, cancellation confirmation for DELETE)
 * - 400: Invalid request parameters or booking cannot be canceled
 * - 401: Authentication failed
 * - 403: Booking doesn't belong to authenticated user
 * - 404: Booking not found
 * - 405: Method not allowed
 * - 409: Booking already canceled or exam is in the past
 * - 500: Server error
 */

// Import shared utilities
require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../_shared/hubspot');
const { schemas } = require('../_shared/validation');
const {
  setCorsHeaders,
  handleOptionsRequest,
  createErrorResponse,
  createSuccessResponse,
  verifyEnvironmentVariables,
  rateLimitMiddleware,
  sanitizeInput
} = require('../_shared/auth');

// Handler function for GET /api/bookings/[id]
async function handler(req, res) {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }

  console.log('🔍 [HANDLER DEBUG] Booking API called:', {
    method: req.method,
    url: req.url,
    query: req.query,
    bookingId: req.query.id,
    bookingIdType: typeof req.query.id
  });

  try {
    // Security check
    await rateLimitMiddleware(req, res);

    // Environment validation
    verifyEnvironmentVariables();

    // Only allow GET and DELETE methods
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      const error = new Error('Method not allowed');
      error.status = 405;
      throw error;
    }

    // Extract booking ID from URL path
    const { id: bookingId } = req.query;

    if (!bookingId) {
      const error = new Error('Booking ID is required');
      error.status = 400;
      error.code = 'MISSING_BOOKING_ID';
      throw error;
    }

    // Parse parameters based on method
    let inputParams;
    let schemaName;

    console.log('🔍 [VALIDATION DEBUG] Request details:', {
      method: req.method,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : null,
      body: req.body,
      hasQuery: !!req.query,
      queryKeys: req.query ? Object.keys(req.query) : null,
      query: req.query
    });

    if (req.method === 'GET') {
      inputParams = {
        student_id: req.query.student_id,
        email: req.query.email
      };
      schemaName = 'authCheck';
    } else if (req.method === 'DELETE') {
      inputParams = {
        student_id: req.body.student_id,
        email: req.body.email,
        reason: req.body.reason
      };
      schemaName = 'bookingCancellation';
    }

    console.log('🔍 [VALIDATION DEBUG] Parsed input params:', {
      inputParams,
      schemaName
    });

    // Validate input using appropriate schema
    const { error, value: validatedData } = schemas[schemaName].validate(inputParams);
    if (error) {
      console.error('❌ [VALIDATION ERROR]:', {
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
      const validationError = new Error(`Invalid input: ${error.details.map(detail => detail.message).join(', ')}`);
      validationError.status = 400;
      validationError.code = 'VALIDATION_ERROR';
      throw validationError;
    }

    console.log('✅ [VALIDATION SUCCESS] Validated data:', validatedData);

    const { student_id, email, reason } = validatedData;

    // Logging
    console.log(`📋 Processing booking ${req.method} request:`, {
      bookingId: sanitizeInput(bookingId),
      student_id: sanitizeInput(student_id),
      email: sanitizeInput(email),
      ...(req.method === 'DELETE' && reason ? { reason: sanitizeInput(reason) } : {})
    });

    // Sanitize inputs
    const sanitizedStudentId = sanitizeInput(student_id);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedBookingId = sanitizeInput(bookingId);

    // Initialize HubSpot service
    const hubspot = new HubSpotService();

    // Step 1: Authenticate user by finding contact
    const contact = await hubspot.searchContacts(sanitizedStudentId, sanitizedEmail);

    if (!contact) {
      const error = new Error('Authentication failed. Please check your Student ID and email.');
      error.status = 401;
      error.code = 'AUTH_FAILED';
      throw error;
    }

    const contactId = contact.id;
    console.log(`✅ Contact authenticated: ${contactId} - ${contact.properties.firstname} ${contact.properties.lastname}`);

    // Handle GET request
    if (req.method === 'GET') {
      return await handleGetRequest(req, res, hubspot, sanitizedBookingId, contactId, contact);
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      return await handleDeleteRequest(req, res, hubspot, sanitizedBookingId, contactId, contact, reason);
    }

  } catch (error) {
    console.error('❌ Booking operation error:', {
      message: error.message,
      status: error.status || 500,
      code: error.code || 'INTERNAL_ERROR',
      stack: error.stack
    });

    const statusCode = error.status || 500;
    return res.status(statusCode).json(createErrorResponse(
      error.message || 'Internal server error',
      error.code || 'INTERNAL_ERROR'
    ));
  }
}

/**
 * Handle GET request for booking details
 */
async function handleGetRequest(req, res, hubspot, bookingId, contactId, contact) {
  try {
    // Step 2: Fetch the booking with associations
    const bookingResponse = await hubspot.apiCall({
      method: 'GET',
      url: `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`,
      params: {
        properties: [
          'booking_id',
          'name',
          'email',
          'dominant_hand',
          'status',
          'createdate',
          'hs_lastmodifieddate'
        ],
        associations: [
          HUBSPOT_OBJECTS.contacts,
          HUBSPOT_OBJECTS.mock_exams,
          HUBSPOT_OBJECTS.enrollments
        ]
      }
    });

    if (!bookingResponse || !bookingResponse.data) {
      const error = new Error('Booking not found');
      error.status = 404;
      error.code = 'BOOKING_NOT_FOUND';
      throw error;
    }

    const booking = bookingResponse.data;

    // Step 3: Verify booking ownership with enhanced debugging
    const contactAssociations = booking.associations?.[HUBSPOT_OBJECTS.contacts]?.results || [];

    console.log('🔍 [OWNERSHIP DEBUG] Verifying booking ownership:', {
      contactId,
      contactIdType: typeof contactId,
      associationsCount: contactAssociations.length,
      contactAssociations: contactAssociations.map(assoc => ({
        id: assoc.id,
        idType: typeof assoc.id,
        toObjectId: assoc.toObjectId,
        toObjectIdType: typeof assoc.toObjectId,
        type: assoc.type,
        allKeys: Object.keys(assoc)
      }))
    });

    const belongsToUser = contactAssociations.some(assoc => {
      // Check multiple possible ID fields with type conversion
      const matches = [
        assoc.id === contactId,
        assoc.toObjectId === contactId,
        String(assoc.id) === String(contactId),
        String(assoc.toObjectId) === String(contactId),
        // Also check if the association has a numeric ID that needs to be compared as string
        assoc.id && String(assoc.id).replace('0-1_', '') === String(contactId),
        assoc.toObjectId && String(assoc.toObjectId).replace('0-1_', '') === String(contactId)
      ];

      const hasMatch = matches.some(Boolean);

      console.log('🔍 [OWNERSHIP DEBUG] Association check:', {
        assocId: assoc.id,
        assocToObjectId: assoc.toObjectId,
        contactId,
        matchResults: matches.map((m, i) => `Check${i}: ${m}`),
        hasMatch
      });

      return hasMatch;
    });

    if (!belongsToUser) {
      console.error('❌ [OWNERSHIP DEBUG] Access denied - no matching associations found');
      const error = new Error('Access denied. This booking does not belong to you.');
      error.status = 403;
      error.code = 'ACCESS_DENIED';
      throw error;
    }

    console.log('✅ [OWNERSHIP DEBUG] Booking ownership verified');

    // Step 4: Get associated Mock Exam details
    let mockExamDetails = null;
    const mockExamAssociations = booking.associations?.[HUBSPOT_OBJECTS.mock_exams]?.results || [];

    if (mockExamAssociations.length > 0) {
      const mockExamId = mockExamAssociations[0].id;
      try {
        const mockExamResponse = await hubspot.getMockExam(mockExamId);
        if (mockExamResponse && mockExamResponse.data) {
          const examData = mockExamResponse.data.properties;
          mockExamDetails = {
            id: mockExamResponse.data.id,
            exam_date: examData.exam_date,
            mock_type: examData.mock_type,
            location: examData.location,
            capacity: parseInt(examData.capacity) || 0,
            total_bookings: parseInt(examData.total_bookings) || 0,
            address: examData.address || '',
            start_time: examData.start_time || '',
            end_time: examData.end_time || ''
          };
        }
      } catch (examError) {
        console.warn('⚠️ Failed to fetch mock exam details:', examError.message);
      }
    }

    // Step 5: Get associated Enrollment details
    let enrollmentDetails = null;
    const enrollmentAssociations = booking.associations?.[HUBSPOT_OBJECTS.enrollments]?.results || [];

    if (enrollmentAssociations.length > 0) {
      const enrollmentId = enrollmentAssociations[0].id;
      try {
        const enrollmentResponse = await hubspot.apiCall({
          method: 'GET',
          url: `/crm/v3/objects/${HUBSPOT_OBJECTS.enrollments}/${enrollmentId}`,
          params: {
            properties: [
              'enrollment_id',
              'course_id',
              'enrollment_status'
            ]
          }
        });

        if (enrollmentResponse && enrollmentResponse.data) {
          const enrollData = enrollmentResponse.data.properties;
          enrollmentDetails = {
            id: enrollmentResponse.data.id,
            enrollment_id: enrollData.enrollment_id || '',
            course_id: enrollData.course_id || '',
            enrollment_status: enrollData.enrollment_status || ''
          };
        }
      } catch (enrollError) {
        console.warn('⚠️ Failed to fetch enrollment details:', enrollError.message);
      }
    }

    // Step 6: Prepare response data
    const responseData = {
      booking: {
        id: booking.id,
        booking_id: booking.properties.booking_id || '',
        name: booking.properties.name || '',
        email: booking.properties.email || '',
        dominant_hand: booking.properties.dominant_hand === 'true',
        status: booking.properties.status || 'unknown',
        created_at: booking.properties.createdate || '',
        updated_at: booking.properties.hs_lastmodifieddate || ''
      },
      mock_exam: mockExamDetails,
      contact: {
        id: contactId,
        firstname: contact.properties.firstname || '',
        lastname: contact.properties.lastname || '',
        student_id: contact.properties.student_id || ''
      },
      enrollment: enrollmentDetails
    };

    console.log(`✅ Successfully retrieved booking details for ${bookingId}`);

    // Return success response
    return res.status(200).json(createSuccessResponse(
      responseData,
      'Successfully retrieved booking details'
    ));

  } catch (error) {
    throw error;  // Re-throw to be handled by main handler
  }
}

/**
 * Handle DELETE request for booking cancellation
 */
async function handleDeleteRequest(req, res, hubspot, bookingId, contactId, contact, reason) {
  let rollbackActions = [];

  try {
    console.log('🔍 [BACKEND DEBUG] Delete request started:', {
      bookingId,
      bookingIdType: typeof bookingId,
      contactId,
      reason
    });

    // Step 1: Fetch the booking with all associations
    console.log('🔍 [BACKEND DEBUG] Calling getBookingWithAssociations with:', bookingId);
    const bookingResponse = await hubspot.getBookingWithAssociations(bookingId);

    console.log('🔍 [BACKEND DEBUG] HubSpot response:', {
      hasResponse: !!bookingResponse,
      hasData: !!bookingResponse?.data,
      responseType: typeof bookingResponse,
      responseKeys: bookingResponse ? Object.keys(bookingResponse) : null
    });

    // Handle different response structures from HubSpot API
    let booking;
    if (bookingResponse?.data) {
      // If response has .data property, use it
      booking = bookingResponse.data;
    } else if (bookingResponse?.id) {
      // If response is the booking object directly, use it
      booking = bookingResponse;
    } else {
      // No valid booking found
      console.error('❌ [BACKEND ERROR] Booking not found:', {
        bookingId,
        response: bookingResponse
      });
      const error = new Error('Booking not found');
      error.status = 404;
      error.code = 'BOOKING_NOT_FOUND';
      throw error;
    }

    console.log('🔍 [BACKEND DEBUG] Booking object structure:', {
      hasId: !!booking.id,
      bookingObjectId: booking.id,
      properties: booking.properties ? Object.keys(booking.properties) : null,
      associations: booking.associations ? Object.keys(booking.associations) : null
    });

    // Step 2: Verify booking ownership with enhanced debugging
    const contactAssociations = booking.associations?.[HUBSPOT_OBJECTS.contacts]?.results || [];

    console.log('🔍 [DELETE OWNERSHIP DEBUG] Verifying booking ownership for DELETE:', {
      contactId,
      contactIdType: typeof contactId,
      associationsCount: contactAssociations.length,
      contactAssociations: contactAssociations.map(assoc => ({
        id: assoc.id,
        idType: typeof assoc.id,
        toObjectId: assoc.toObjectId,
        toObjectIdType: typeof assoc.toObjectId,
        type: assoc.type,
        allKeys: Object.keys(assoc)
      }))
    });

    const belongsToUser = contactAssociations.some(assoc => {
      // Check multiple possible ID fields with type conversion
      const matches = [
        assoc.id === contactId,
        assoc.toObjectId === contactId,
        String(assoc.id) === String(contactId),
        String(assoc.toObjectId) === String(contactId),
        // Also check if the association has a numeric ID that needs to be compared as string
        assoc.id && String(assoc.id).replace('0-1_', '') === String(contactId),
        assoc.toObjectId && String(assoc.toObjectId).replace('0-1_', '') === String(contactId)
      ];

      const hasMatch = matches.some(Boolean);

      console.log('🔍 [DELETE OWNERSHIP DEBUG] Association check:', {
        assocId: assoc.id,
        assocToObjectId: assoc.toObjectId,
        contactId,
        matchResults: matches.map((m, i) => `Check${i}: ${m}`),
        hasMatch
      });

      return hasMatch;
    });

    if (!belongsToUser) {
      console.error('❌ [DELETE OWNERSHIP DEBUG] Access denied - no matching associations found');
      const error = new Error('Access denied. This booking does not belong to you.');
      error.status = 403;
      error.code = 'ACCESS_DENIED';
      throw error;
    }

    console.log('✅ [DELETE OWNERSHIP DEBUG] Booking ownership verified for deletion');

    // Step 3: Check if booking can be canceled
    const bookingStatus = booking.properties.status;
    if (bookingStatus === 'canceled' || bookingStatus === 'cancelled') {
      const error = new Error('Booking is already canceled');
      error.status = 409;
      error.code = 'ALREADY_CANCELED';
      throw error;
    }

    // Step 4: Get mock exam details to check date and get mock type
    const mockExamAssociations = booking.associations?.[HUBSPOT_OBJECTS.mock_exams]?.results || [];
    if (mockExamAssociations.length === 0) {
      const error = new Error('No mock exam associated with this booking');
      error.status = 400;
      error.code = 'NO_MOCK_EXAM';
      throw error;
    }

    const mockExamId = mockExamAssociations[0].id;
    const mockExamResponse = await hubspot.getMockExam(mockExamId);

    if (!mockExamResponse || !mockExamResponse.data) {
      const error = new Error('Mock exam not found');
      error.status = 404;
      error.code = 'MOCK_EXAM_NOT_FOUND';
      throw error;
    }

    const mockExam = mockExamResponse.data.properties;
    const examDate = new Date(mockExam.exam_date);
    const now = new Date();

    // Check if exam is in the past
    if (examDate < now) {
      const error = new Error('Cannot cancel bookings for past exams');
      error.status = 409;
      error.code = 'EXAM_IN_PAST';
      throw error;
    }

    const mockType = mockExam.mock_type;

    // Step 5: Get current credit balances
    const currentCredits = {
      sj_credits: parseInt(contact.properties.sj_credits) || 0,
      cs_credits: parseInt(contact.properties.cs_credits) || 0,
      sjmini_credits: parseInt(contact.properties.sjmini_credits) || 0,
      shared_mock_credits: parseInt(contact.properties.shared_mock_credits) || 0
    };

    console.log('💳 Current credit balances:', currentCredits);

    // Step 6: Restore credits (atomic operation 1)
    let creditsRestored;
    try {
      creditsRestored = await hubspot.restoreCredits(contactId, mockType, currentCredits);
      console.log('✅ Credits restored:', creditsRestored);

      // Add rollback action for credits
      rollbackActions.push(async () => {
        const rollbackCredits = {};
        rollbackCredits[creditsRestored.credit_type] = currentCredits[creditsRestored.credit_type];
        await hubspot.apiCall({
          method: 'PATCH',
          url: `/crm/v3/objects/contacts/${contactId}`,
          data: { properties: rollbackCredits }
        });
        console.log('🔄 Rolled back credit restoration');
      });
    } catch (creditError) {
      console.error('❌ Failed to restore credits:', creditError);
      throw creditError;
    }

    // Step 7: Update mock exam capacity (atomic operation 2)
    let mockExamUpdated;
    try {
      mockExamUpdated = await hubspot.decrementMockExamBookings(mockExamId);
      console.log('✅ Mock exam capacity updated:', mockExamUpdated);

      // Add rollback action for mock exam
      const previousBookings = parseInt(mockExam.total_bookings) || 0;
      rollbackActions.push(async () => {
        await hubspot.apiCall({
          method: 'PATCH',
          url: `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/${mockExamId}`,
          data: { properties: { total_bookings: previousBookings } }
        });
        console.log('🔄 Rolled back mock exam capacity update');
      });
    } catch (examError) {
      console.error('❌ Failed to update mock exam:', examError);
      await performRollback(rollbackActions);
      throw examError;
    }

    // Step 8: Delete the booking (atomic operation 3)
    try {
      await hubspot.deleteBooking(bookingId);
      console.log('✅ Booking deleted successfully');
    } catch (deleteError) {
      console.error('❌ Failed to delete booking:', deleteError);
      await performRollback(rollbackActions);
      throw deleteError;
    }

    // Step 9: Create audit trail in Deal timeline if Deal is associated
    const dealAssociations = booking.associations?.[HUBSPOT_OBJECTS.deals]?.results || [];
    if (dealAssociations.length > 0) {
      const dealId = dealAssociations[0].id;
      try {
        await hubspot.createCancellationNote(dealId, {
          booking_id: booking.properties.booking_id,
          mock_type: mockType,
          exam_date: mockExam.exam_date,
          reason: reason,
          credits_restored: creditsRestored
        });
        console.log('📝 Cancellation note added to deal timeline');
      } catch (noteError) {
        // Non-critical error, don't rollback
        console.warn('⚠️ Failed to create cancellation note:', noteError.message);
      }
    }

    // Prepare response data
    const responseData = {
      canceled_booking: {
        booking_id: booking.properties.booking_id,
        mock_type: mockType,
        exam_date: mockExam.exam_date,
        canceled_at: new Date().toISOString(),
        ...(reason ? { reason } : {})
      },
      credits_restored: creditsRestored,
      mock_exam_updated: mockExamUpdated
    };

    console.log('✅ Booking canceled successfully');

    return res.status(200).json(createSuccessResponse(
      responseData,
      'Booking canceled successfully'
    ));

  } catch (error) {
    throw error;  // Re-throw to be handled by main handler
  }
}

/**
 * Perform rollback of completed operations
 */
async function performRollback(rollbackActions) {
  console.log('🔄 Starting rollback of completed operations...');
  for (const action of rollbackActions.reverse()) {
    try {
      await action();
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
      // Continue with other rollbacks
    }
  }
  console.log('🔄 Rollback completed');
}

module.exports = handler;