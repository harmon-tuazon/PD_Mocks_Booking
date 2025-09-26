/**
 * GET /api/bookings/[id] - Fetches detailed information about a specific booking
 * DELETE /api/bookings/[id] - Cancels a booking (simplified soft delete)
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
 * - 400: Invalid request parameters
 * - 401: Authentication failed
 * - 403: Booking doesn't belong to authenticated user (GET only)
 * - 404: Booking not found
 * - 405: Method not allowed
 * - 409: Booking already cancelled
 * - 500: Server error
 *
 * Note: DELETE operation uses simplified flow without ownership verification,
 * credit restoration, or capacity updates. Just sets is_active to 'Cancelled'.
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
      // ROBUST COMPARISON: Handle both numeric and string IDs from HubSpot
      const contactIdStr = String(contactId);
      const contactIdNum = Number(contactId);

      const assocIdStr = String(assoc.id);
      const assocIdNum = Number(assoc.id);
      const assocToObjectIdStr = String(assoc.toObjectId);
      const assocToObjectIdNum = Number(assoc.toObjectId);

      // Multiple comparison strategies to handle HubSpot's inconsistent ID types
      const matches = [
        // Direct equality (works if both are same type)
        assoc.id === contactId,
        assoc.toObjectId === contactId,

        // String comparison
        assocIdStr === contactIdStr,
        assocToObjectIdStr === contactIdStr,

        // Numeric comparison (if both are valid numbers)
        !isNaN(assocIdNum) && !isNaN(contactIdNum) && assocIdNum === contactIdNum,
        !isNaN(assocToObjectIdNum) && !isNaN(contactIdNum) && assocToObjectIdNum === contactIdNum,

        // Handle prefixed IDs (remove common HubSpot prefixes)
        assocIdStr.replace(/^0-1[_-]?/, '') === contactIdStr.replace(/^0-1[_-]?/, ''),
        assocToObjectIdStr.replace(/^0-1[_-]?/, '') === contactIdStr.replace(/^0-1[_-]?/, '')
      ];

      const hasMatch = matches.some(Boolean);

      console.log('🔍 [OWNERSHIP DEBUG] Enhanced association check:', {
        contactId: contactId,
        contactIdType: typeof contactId,
        assoc: {
          id: assoc.id,
          idType: typeof assoc.id,
          toObjectId: assoc.toObjectId,
          toObjectIdType: typeof assoc.toObjectId
        },
        stringComparisons: {
          'assoc.id vs contactId': `"${assocIdStr}" === "${contactIdStr}" = ${assocIdStr === contactIdStr}`,
          'assoc.toObjectId vs contactId': `"${assocToObjectIdStr}" === "${contactIdStr}" = ${assocToObjectIdStr === contactIdStr}`
        },
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
 * Handle DELETE request for booking cancellation (SIMPLIFIED)
 * No ownership verification needed - bookings are already pre-filtered by user
 */
async function handleDeleteRequest(req, res, hubspot, bookingId, contactId, contact, reason) {
  try {
    console.log('🔍 [DELETE] Processing simplified deletion for booking:', {
      bookingId,
      contactId,
      reason
    });

    // Step 1: Get basic booking info to verify it exists and check status
    let booking;
    try {
      booking = await hubspot.getBasicBooking(bookingId);
      console.log('✅ Booking found:', {
        id: booking.id,
        booking_id: booking.properties?.booking_id,
        status: booking.properties?.status,
        is_active: booking.properties?.is_active
      });
    } catch (error) {
      console.error('❌ Booking not found:', bookingId);
      const notFoundError = new Error('Booking not found');
      notFoundError.status = 404;
      notFoundError.code = 'BOOKING_NOT_FOUND';
      throw notFoundError;
    }

    // Step 2: Check if already cancelled
    const currentStatus = booking.properties?.status;
    const isActive = booking.properties?.is_active;

    // Check both status field and is_active field for cancelled state
    if (currentStatus === 'canceled' || currentStatus === 'cancelled' ||
        isActive === 'Cancelled' || isActive === 'cancelled' ||
        isActive === false || isActive === 'false') {
      console.log('⚠️ Booking already cancelled');
      const error = new Error('Booking is already cancelled');
      error.status = 409;
      error.code = 'ALREADY_CANCELED';
      throw error;
    }

    // Step 3: Soft delete the booking (set is_active to 'Cancelled')
    try {
      await hubspot.softDeleteBooking(bookingId);
      console.log('✅ Booking soft deleted successfully');
    } catch (deleteError) {
      console.error('❌ Failed to soft delete booking:', deleteError);
      const softDeleteError = new Error('Failed to cancel booking');
      softDeleteError.status = 500;
      softDeleteError.code = 'SOFT_DELETE_FAILED';
      throw softDeleteError;
    }

    // Step 4: Return success response
    const responseData = {
      booking_id: booking.properties?.booking_id || bookingId,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      ...(reason ? { reason } : {})
    };

    console.log('✅ Booking cancellation completed successfully');

    return res.status(200).json(createSuccessResponse(
      responseData,
      'Booking cancelled successfully'
    ));

  } catch (error) {
    throw error;  // Re-throw to be handled by main handler
  }
}

module.exports = handler;