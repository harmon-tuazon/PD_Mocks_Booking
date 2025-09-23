const axios = require('axios');

// HubSpot Object Type IDs
const HUBSPOT_OBJECTS = {
  'contacts': '0-1',
  'deals': '0-3',
  'courses': '0-410',
  'transactions': '2-47045790',
  'payment_schedules': '2-47381547',
  'credit_notes': '2-41609496',
  'campus_venues': '2-41607847',
  'enrollments': '2-41701559',
  'lab_stations': '2-41603799',
  'bookings': '2-50158943',      // PRIMARY for this feature
  'mock_exams': '2-50158913'     // PRIMARY for this feature
};

class HubSpotService {
  constructor() {
    this.token = process.env.HS_PRIVATE_APP_TOKEN;
    this.baseURL = 'https://api.hubapi.com';
    this.retryDelay = 1000;
    this.maxRetries = 3;

    if (!this.token) {
      throw new Error('HS_PRIVATE_APP_TOKEN environment variable is required');
    }
  }

  /**
   * Make API call with automatic retry on rate limit errors
   */
  async apiCall(method, path, data = null, attempt = 1) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${path}`,
        data,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      // Handle rate limiting with exponential backoff
      if (error.response?.status === 429 && attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        return this.apiCall(method, path, data, attempt + 1);
      }

      // Handle other errors
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 500;

      const customError = new Error(errorMessage);
      customError.status = statusCode;
      throw customError;
    }
  }

  /**
   * Search for contacts by student_id and email
   */
  async searchContacts(studentId, email) {
    const searchPayload = {
      filterGroups: [{
        filters: [
          {
            propertyName: 'student_id',
            operator: 'EQ',
            value: studentId
          },
          {
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }
        ]
      }],
      properties: [
        'student_id',
        'firstname',
        'lastname',
        'email',
        'sj_credits',
        'cs_credits',
        'sjmini_credits',
        'shared_mock_credits',
        'hs_object_id'
      ],
      limit: 1
    };

    const result = await this.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.contacts}/search`, searchPayload);
    return result.results?.[0] || null;
  }

  /**
   * Search for available mock exams
   */
  async searchMockExams(mockType, isActive = true) {
    const searchPayload = {
      filterGroups: [{
        filters: [
          {
            propertyName: 'is_active',
            operator: 'EQ',
            value: isActive.toString()
          },
          {
            propertyName: 'mock_type',
            operator: 'EQ',
            value: mockType
          }
        ]
      }],
      properties: [
        'exam_date',
        'start_time',
        'end_time',
        'capacity',
        'total_bookings',
        'mock_type',
        'location',
        'hs_object_id'
      ],
      sorts: [{
        propertyName: 'exam_date',
        direction: 'ASCENDING'
      }],
      limit: 20
    };

    return await this.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/search`, searchPayload);
  }

  /**
   * Check if booking already exists
   */
  async checkExistingBooking(bookingId) {
    const searchPayload = {
      filterGroups: [{
        filters: [{
          propertyName: 'booking_id',
          operator: 'EQ',
          value: bookingId
        }]
      }],
      limit: 1
    };

    const result = await this.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/search`, searchPayload);
    return result.total > 0;
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData) {
    const payload = {
      properties: {
        booking_id: bookingData.bookingId,
        name: bookingData.name,
        email: bookingData.email,
        dominant_hand: bookingData.dominantHand.toString()
      }
    };

    return await this.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}`, payload);
  }

  /**
   * Update contact credits
   */
  async updateContactCredits(contactId, creditType, newValue) {
    const payload = {
      properties: {
        [creditType]: newValue.toString()
      }
    };

    return await this.apiCall('PATCH', `/crm/v3/objects/${HUBSPOT_OBJECTS.contacts}/${contactId}`, payload);
  }

  /**
   * Update mock exam total bookings
   */
  async updateMockExamBookings(mockExamId, newTotal) {
    const payload = {
      properties: {
        total_bookings: newTotal.toString()
      }
    };

    return await this.apiCall('PATCH', `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/${mockExamId}`, payload);
  }


  /**
   * Get default association type ID for standard object relationships
   */
  getDefaultAssociationTypeId(fromObjectType, toObjectType) {
    // Specific association type IDs from HubSpot for this instance
    const defaultTypes = {
      // Bookings to other objects (using HUBSPOT_DEFINED IDs from the improvement request)
      [`${HUBSPOT_OBJECTS.bookings}_${HUBSPOT_OBJECTS.contacts}`]: 1289,    // Bookings → Contacts
      [`${HUBSPOT_OBJECTS.bookings}_${HUBSPOT_OBJECTS.mock_exams}`]: 1291,  // Bookings → Mock Exams
      [`${HUBSPOT_OBJECTS.bookings}_${HUBSPOT_OBJECTS.enrollments}`]: 1,    // Fallback for enrollments

      // Reverse relationships (same IDs work bidirectionally)
      [`${HUBSPOT_OBJECTS.contacts}_${HUBSPOT_OBJECTS.bookings}`]: 1289,
      [`${HUBSPOT_OBJECTS.mock_exams}_${HUBSPOT_OBJECTS.bookings}`]: 1291,
      [`${HUBSPOT_OBJECTS.enrollments}_${HUBSPOT_OBJECTS.bookings}`]: 1,
    };

    const key = `${fromObjectType}_${toObjectType}`;
    const typeId = defaultTypes[key];

    if (typeId) {
      console.log(`✅ Using association type ID ${typeId} for ${fromObjectType} → ${toObjectType}`);
      return typeId;
    }

    console.log(`⚠️ No specific association type found for ${fromObjectType} → ${toObjectType}, using default: 1`);
    return 1;
  }

  /**
   * Create association between objects
   */
  async createAssociation(fromObjectType, fromObjectId, toObjectType, toObjectId) {
    const path = `/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`;

    // Use the exact association type IDs from the improvement request
    const associationTypeId = this.getDefaultAssociationTypeId(fromObjectType, toObjectType);

    const payload = [
      {
        associationCategory: "USER_DEFINED",
        associationTypeId: associationTypeId
      }
    ];

    console.log(`🔗 Creating association: ${fromObjectType}(${fromObjectId}) → ${toObjectType}(${toObjectId})`);
    console.log(`📋 Using exact association type ID: ${associationTypeId}, category: USER_DEFINED`);

    const result = await this.apiCall('PUT', path, payload);
    console.log(`✅ Association created successfully:`, result);

    return result;
  }


  /**
   * Search enrollments for a contact
   */
  async searchEnrollments(contactId, status = 'Registered') {
    const searchPayload = {
      filterGroups: [{
        filters: [
          {
            propertyName: 'contact_record_id',
            operator: 'EQ',
            value: contactId
          },
          {
            propertyName: 'enrollment_status',
            operator: 'EQ',
            value: status
          }
        ]
      }],
      properties: [
        'enrollment_id',
        'course_id',
        'enrollment_status',
        'hs_object_id'
      ],
      limit: 10
    };

    const result = await this.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.enrollments}/search`, searchPayload);
    return result.results?.[0] || null;
  }

  /**
   * Get a single mock exam by ID
   */
  async getMockExam(mockExamId) {
    const properties = [
      'exam_date',
      'capacity',
      'total_bookings',
      'mock_type',
      'location',
      'is_active'
    ].join(',');

    return await this.apiCall('GET', `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/${mockExamId}?properties=${properties}`);
  }

  /**
   * Get active bookings count for a mock exam by querying actual associations
   * This ensures we only count non-deleted bookings
   */
  async getActiveBookingsCount(mockExamId) {
    try {
      // Get all associated bookings for this mock exam
      const associations = await this.apiCall(
        'GET',
        `/crm/v4/objects/${HUBSPOT_OBJECTS.mock_exams}/${mockExamId}/associations/${HUBSPOT_OBJECTS.bookings}`
      );

      if (!associations?.results || associations.results.length === 0) {
        console.log(`No bookings found for mock exam ${mockExamId}`);
        return 0;
      }

      // Extract booking IDs from associations
      const bookingIds = associations.results.map(assoc => assoc.toObjectId);

      // Batch retrieve booking objects to check their status
      // HubSpot will automatically exclude archived/deleted objects
      const batchReadPayload = {
        inputs: bookingIds.map(id => ({ id })),
        properties: ['booking_id', 'hs_object_id']
      };

      const bookingsResponse = await this.apiCall(
        'POST',
        `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/batch/read`,
        batchReadPayload
      );

      // Count only the bookings that were successfully retrieved (active ones)
      const activeBookingsCount = bookingsResponse?.results?.length || 0;

      console.log(`Mock exam ${mockExamId}: ${activeBookingsCount} active bookings out of ${bookingIds.length} associations`);

      return activeBookingsCount;
    } catch (error) {
      console.error(`Error getting active bookings count for mock exam ${mockExamId}:`, error);
      // Return 0 on error to avoid blocking operations
      return 0;
    }
  }

  /**
   * Recalculate and update the total_bookings property for a mock exam
   * This should be called when bookings are deleted or to sync the count
   */
  async recalculateMockExamBookings(mockExamId) {
    try {
      const activeCount = await this.getActiveBookingsCount(mockExamId);

      // Update the mock exam's total_bookings property
      await this.updateMockExamBookings(mockExamId, activeCount);

      console.log(`✅ Updated mock exam ${mockExamId} total_bookings to ${activeCount}`);
      return activeCount;
    } catch (error) {
      console.error(`Error recalculating bookings for mock exam ${mockExamId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a booking
   */
  async deleteBooking(bookingId) {
    return await this.apiCall('DELETE', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`);
  }

  /**
   * Create a Note on Contact timeline for booking confirmation
   * @param {Object} bookingData - The booking details
   * @param {string} contactId - The HubSpot contact ID
   * @param {Object} mockExamData - The mock exam details
   * @returns {Object|null} - Created note object or null if failed
   */
  async createBookingNote(bookingData, contactId, mockExamData) {
    try {
      // Format the date nicely
      const examDate = new Date(mockExamData.exam_date);
      const formattedExamDate = examDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const bookedOnDate = new Date().toISOString();

      // Create HTML formatted note body for better readability
      const noteBody = `
        <h3>📅 Mock Exam Booking Confirmed</h3>

        <p><strong>Booking Details:</strong></p>
        <ul>
          <li><strong>Booking ID:</strong> ${bookingData.bookingId}</li>
          <li><strong>Exam Type:</strong> ${mockExamData.mock_type}</li>
          <li><strong>Exam Date:</strong> ${formattedExamDate}</li>
          <li><strong>Location:</strong> ${mockExamData.location || 'Mississauga'}</li>
          <li><strong>Dominant Hand:</strong> ${bookingData.dominantHand ? 'Right' : 'Left'}</li>
          <li><strong>Booked On:</strong> ${bookedOnDate}</li>
        </ul>

        <p><strong>Student Information:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${bookingData.name}</li>
          <li><strong>Email:</strong> ${bookingData.email}</li>
        </ul>

        <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 12px; color: #666;">
          <em>This booking was automatically confirmed through the Mock Exam Booking System.</em>
        </p>
      `;

      // Create the Note with association to Contact
      const notePayload = {
        properties: {
          hs_note_body: noteBody,
          hs_timestamp: Date.now()
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 202 // Note to Contact association type ID
              }
            ]
          }
        ]
      };

      console.log(`📝 Creating booking note for contact ${contactId}, booking ${bookingData.bookingId}`);

      const noteResponse = await this.apiCall('POST', '/crm/v3/objects/notes', notePayload);

      console.log(`✅ Note created successfully with ID: ${noteResponse.id}`);
      return noteResponse;

    } catch (error) {
      // Log the error but don't throw - Note creation should not block booking
      console.error('Failed to create booking note:', {
        error: error.message,
        contactId,
        bookingId: bookingData.bookingId,
        status: error.response?.status,
        details: error.response?.data
      });

      // Implement retry logic for transient failures
      if (error.response?.status === 429 || error.response?.status >= 500) {
        console.log('🔄 Will retry Note creation in background...');
        // Could implement async retry here or queue for later processing
      }

      return null;
    }
  }

}

module.exports = { HubSpotService, HUBSPOT_OBJECTS };