require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../_shared/hubspot');
const { validateInput } = require('../_shared/validation');
const {
  setCorsHeaders,
  handleOptionsRequest,
  createErrorResponse,
  createSuccessResponse,
  verifyEnvironmentVariables,
  rateLimitMiddleware,
  sanitizeInput
} = require('../_shared/auth');

/**
 * Determine which credit to deduct based on mock type
 */
function getCreditFieldToDeduct(mockType, creditBreakdown) {
  if (!creditBreakdown) {
    throw new Error('Credit breakdown not provided');
  }

  // For Mini-mock, only use specific credits
  if (mockType === 'Mini-mock') {
    return 'sjmini_credits';
  }

  // For other types, prefer specific credits, then shared
  if (mockType === 'Situational Judgment') {
    return creditBreakdown.specific_credits > 0 ? 'sj_credits' : 'shared_mock_credits';
  }

  if (mockType === 'Clinical Skills') {
    return creditBreakdown.specific_credits > 0 ? 'cs_credits' : 'shared_mock_credits';
  }

  throw new Error('Invalid mock type for credit deduction');
}

/**
 * POST /api/bookings/create
 * Create a new booking for a mock exam slot and handle all associations
 */
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request
  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(
      createErrorResponse(new Error('Method not allowed'))
    );
  }

  let bookingCreated = false;
  let createdBookingId = null;

  try {
    // Verify environment variables
    verifyEnvironmentVariables();

    // Apply rate limiting
    const rateLimiter = rateLimitMiddleware({
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    });

    if (await rateLimiter(req, res)) {
      return; // Request was rate limited
    }

    // Validate input
    const validatedData = await validateInput(req.body, 'bookingCreation');
    const {
      mock_exam_id,
      contact_id,
      enrollment_id,
      student_id,
      name,
      email,
      dominant_hand,
      mock_type,
      exam_date
    } = validatedData;

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);

    // Initialize HubSpot service
    const hubspot = new HubSpotService();

    // Step 1: Verify mock exam exists and has capacity
    const mockExam = await hubspot.getMockExam(mock_exam_id);

    if (!mockExam) {
      const error = new Error('Mock exam not found');
      error.status = 404;
      error.code = 'EXAM_NOT_FOUND';
      throw error;
    }

    // Check if exam is active
    if (mockExam.properties.is_active !== 'true') {
      const error = new Error('Mock exam is not available for booking');
      error.status = 400;
      error.code = 'EXAM_NOT_ACTIVE';
      throw error;
    }

    // Check capacity
    const capacity = parseInt(mockExam.properties.capacity) || 0;
    const totalBookings = parseInt(mockExam.properties.total_bookings) || 0;

    if (totalBookings >= capacity) {
      const error = new Error('This mock exam session is now full');
      error.status = 400;
      error.code = 'EXAM_FULL';
      throw error;
    }

    // Step 2: Generate booking ID and check for duplicates
    const bookingId = `${sanitizedName} - ${exam_date}`;

    const isDuplicate = await hubspot.checkExistingBooking(bookingId);
    if (isDuplicate) {
      const error = new Error('You already have a booking for this exam date');
      error.status = 400;
      error.code = 'DUPLICATE_BOOKING';
      throw error;
    }

    // Step 3: Verify contact and credits (double-check)
    const contact = await hubspot.apiCall('GET',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.contacts}/${contact_id}?properties=student_id,email,sj_credits,cs_credits,sjmini_credits,shared_mock_credits`
    );

    if (!contact) {
      const error = new Error('Contact not found');
      error.status = 404;
      error.code = 'CONTACT_NOT_FOUND';
      throw error;
    }

    // Calculate available credits
    let specificCredits = 0;
    let sharedCredits = parseInt(contact.properties.shared_mock_credits) || 0;

    switch (mock_type) {
      case 'Situational Judgment':
        specificCredits = parseInt(contact.properties.sj_credits) || 0;
        break;
      case 'Clinical Skills':
        specificCredits = parseInt(contact.properties.cs_credits) || 0;
        break;
      case 'Mini-mock':
        specificCredits = parseInt(contact.properties.sjmini_credits) || 0;
        sharedCredits = 0; // Don't use shared credits for mini-mock
        break;
    }

    const totalCredits = specificCredits + sharedCredits;

    if (totalCredits <= 0) {
      const error = new Error('Insufficient credits for booking');
      error.status = 400;
      error.code = 'INSUFFICIENT_CREDITS';
      throw error;
    }

    // Step 4: Create booking
    const bookingData = {
      bookingId,
      name: sanitizedName,
      email: sanitizedEmail,
      dominantHand: dominant_hand
    };

    const createdBooking = await hubspot.createBooking(bookingData);
    bookingCreated = true;
    createdBookingId = createdBooking.id;

    // Step 5: Create associations with detailed logging
    console.log(`Creating associations for booking ${createdBookingId}`);
    console.log(`Contact ID: ${contact_id}, Mock Exam ID: ${mock_exam_id}, Enrollment ID: ${enrollment_id || 'N/A'}`);

    const associationResults = [];

    // Associate with Contact
    try {
      console.log(`Attempting to associate booking ${createdBookingId} with contact ${contact_id}`);
      const contactAssociation = await hubspot.createAssociation(
        HUBSPOT_OBJECTS.bookings,
        createdBookingId,
        HUBSPOT_OBJECTS.contacts,
        contact_id
      );
      console.log('✅ Contact association created successfully:', contactAssociation);
      associationResults.push({ type: 'contact', success: true, result: contactAssociation });
    } catch (err) {
      console.error('❌ Failed to associate with contact:', err);
      console.error('Contact association error details:', {
        fromObject: HUBSPOT_OBJECTS.bookings,
        fromId: createdBookingId,
        toObject: HUBSPOT_OBJECTS.contacts,
        toId: contact_id,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      associationResults.push({ type: 'contact', success: false, error: err.message });
    }

    // Associate with Mock Exam
    try {
      console.log(`Attempting to associate booking ${createdBookingId} with mock exam ${mock_exam_id}`);
      const mockExamAssociation = await hubspot.createAssociation(
        HUBSPOT_OBJECTS.bookings,
        createdBookingId,
        HUBSPOT_OBJECTS.mock_exams,
        mock_exam_id
      );
      console.log('✅ Mock exam association created successfully:', mockExamAssociation);
      associationResults.push({ type: 'mock_exam', success: true, result: mockExamAssociation });
    } catch (err) {
      console.error('❌ Failed to associate with mock exam:', err);
      console.error('Mock exam association error details:', {
        fromObject: HUBSPOT_OBJECTS.bookings,
        fromId: createdBookingId,
        toObject: HUBSPOT_OBJECTS.mock_exams,
        toId: mock_exam_id,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      associationResults.push({ type: 'mock_exam', success: false, error: err.message });
    }

    // Associate with Enrollment (if provided)
    if (enrollment_id) {
      try {
        console.log(`Attempting to associate booking ${createdBookingId} with enrollment ${enrollment_id}`);
        const enrollmentAssociation = await hubspot.createAssociation(
          HUBSPOT_OBJECTS.bookings,
          createdBookingId,
          HUBSPOT_OBJECTS.enrollments,
          enrollment_id
        );
        console.log('✅ Enrollment association created successfully:', enrollmentAssociation);
        associationResults.push({ type: 'enrollment', success: true, result: enrollmentAssociation });
      } catch (err) {
        console.error('❌ Failed to associate with enrollment:', err);
        console.error('Enrollment association error details:', {
          fromObject: HUBSPOT_OBJECTS.bookings,
          fromId: createdBookingId,
          toObject: HUBSPOT_OBJECTS.enrollments,
          toId: enrollment_id,
          error: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        associationResults.push({ type: 'enrollment', success: false, error: err.message });
      }
    }

    console.log('Association results summary:', associationResults);

    // Step 6: Update total bookings counter
    const newTotalBookings = totalBookings + 1;
    await hubspot.updateMockExamBookings(mock_exam_id, newTotalBookings);

    // Step 7: Deduct credits
    const creditBreakdown = {
      specific_credits: specificCredits,
      shared_credits: sharedCredits
    };

    const creditField = getCreditFieldToDeduct(mock_type, creditBreakdown);
    const currentCreditValue = parseInt(contact.properties[creditField]) || 0;
    const newCreditValue = Math.max(0, currentCreditValue - 1);

    await hubspot.updateContactCredits(contact_id, creditField, newCreditValue);

    // Step 8: Create Note in Contact timeline (async, non-blocking)
    // This happens after booking is created but doesn't block the response
    const mockExamDataForNote = {
      exam_date,
      mock_type,
      location: mockExam.properties.location || 'Mississauga'
    };

    // Create Note asynchronously - don't wait for it to complete
    hubspot.createBookingNote(bookingData, contact_id, mockExamDataForNote)
      .then(noteResult => {
        if (noteResult) {
          console.log(`✅ Booking note created successfully for booking ${bookingId}`);
        } else {
          console.log(`⚠️ Booking note creation failed for booking ${bookingId}, but booking was successful`);
        }
      })
      .catch(err => {
        console.error(`❌ Error creating booking note for ${bookingId}:`, err.message);
        // Don't throw - booking is already successful
      });

    // Prepare response
    const responseData = {
      booking_id: bookingId,
      booking_record_id: createdBookingId,
      confirmation_message: `Your booking for ${mock_type} on ${exam_date} has been confirmed`,
      exam_details: {
        mock_exam_id,
        exam_date,
        mock_type,
        location: mockExam.properties.location || 'Mississauga'
      },
      remaining_credits: totalCredits - 1,
      credit_deducted_from: creditField
    };

    res.status(201).json(createSuccessResponse(
      responseData,
      'Booking created successfully'
    ));

  } catch (error) {
    console.error('Error creating booking:', error);

    // If booking was created but something else failed, try to clean up
    if (bookingCreated && createdBookingId) {
      try {
        const hubspot = new HubSpotService();
        await hubspot.deleteBooking(createdBookingId);
        console.log('Cleaned up failed booking:', createdBookingId);
      } catch (cleanupError) {
        console.error('Failed to clean up booking:', cleanupError);
      }
    }

    const statusCode = error.status || 500;
    res.status(statusCode).json(createErrorResponse(error));
  }
};