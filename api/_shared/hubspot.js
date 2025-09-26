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
   * Supports both object style and parameter style calls
   */
  async apiCall(methodOrConfig, path, data = null, attempt = 1) {
    let method, url, requestData, currentAttempt;

    // Handle object-style call (for backward compatibility)
    if (typeof methodOrConfig === 'object' && methodOrConfig !== null) {
      const config = methodOrConfig;
      method = config.method;
      url = config.url;
      requestData = config.data || null;
      currentAttempt = config.attempt || 1;

      // Handle params for GET requests
      if (config.params && method === 'GET') {
        const queryString = new URLSearchParams(config.params).toString();
        url = `${url}${queryString ? '?' + queryString : ''}`;
      }
    } else {
      // Handle traditional parameter-style call
      method = methodOrConfig;
      url = `${this.baseURL}${path}`;
      requestData = data;
      currentAttempt = attempt;
    }

    // Ensure URL has base URL if not already present
    if (!url.startsWith('http')) {
      url = `${this.baseURL}${url}`;
    }

    try {
      const response = await axios({
        method,
        url,
        data: requestData,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      // Handle rate limiting with exponential backoff
      if (error.response?.status === 429 && currentAttempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, currentAttempt - 1);
        console.log(`Rate limited, retrying after ${delay}ms (attempt ${currentAttempt + 1}/${this.maxRetries})`);
        await new Promise(r => setTimeout(r, delay));

        // Retry with incremented attempt
        if (typeof methodOrConfig === 'object') {
          return this.apiCall({ ...methodOrConfig, attempt: currentAttempt + 1 });
        } else {
          return this.apiCall(method, path, requestData, currentAttempt + 1);
        }
      }

      // Handle other errors
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 500;

      console.error('HubSpot API Error Details:', {
        status: statusCode,
        message: errorMessage,
        fullResponse: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

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
        dominant_hand: bookingData.dominantHand.toString(),
        is_active: 'Active'  // Set booking as active when created
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

      // Reverse relationships (same IDs work bidirectionally)
      [`${HUBSPOT_OBJECTS.contacts}_${HUBSPOT_OBJECTS.bookings}`]: 1289,
      [`${HUBSPOT_OBJECTS.mock_exams}_${HUBSPOT_OBJECTS.bookings}`]: 1291,
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

    // CRITICAL FIX: Use empty payload to let HubSpot use default association types
    // Previous attempts with USER_DEFINED category and specific type IDs were failing
    // Empty array tells HubSpot to create a default association
    const payload = [];

    console.log(`🔗 Creating association: ${fromObjectType}(${fromObjectId}) → ${toObjectType}(${toObjectId})`);
    console.log(`📋 Using default HubSpot association (empty payload)`);

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
      'start_time',
      'end_time',
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
   * Update booking properties (for soft delete and other updates)
   */
  async updateBooking(bookingId, properties) {
    const payload = {
      properties: properties
    };

    return await this.apiCall('PATCH', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`, payload);
  }

  /**
   * Soft delete a booking by setting is_active to 'Cancelled'
   */
  async softDeleteBooking(bookingId) {
    return await this.updateBooking(bookingId, {
      is_active: 'Cancelled'
    });
  }

  /**
   * Delete a booking
   */
  /**
   * Get bookings for a contact with associated mock exam details
   * @param {string} contactId - The HubSpot contact ID
   * @param {string} filter - Filter type: 'all', 'upcoming', 'past'
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of results per page
   * @returns {Object} - Bookings with pagination info
   */
  /**
   * Map booking status based on is_active property and exam date
   * @param {Object} booking - The booking object
   * @param {Object} mockExamData - The mock exam data
   * @param {string} timeStatus - 'upcoming' or 'past' based on date comparison
   * @returns {string} - Final status: 'scheduled', 'completed', or 'cancelled'
   */
  mapBookingStatus(booking, mockExamData, timeStatus) {
    // First check is_active property for cancelled bookings
    const isActive = booking.properties?.is_active || mockExamData?.is_active;

    if (isActive === 'Cancelled' || isActive === 'cancelled' || isActive === false || isActive === 'false') {
      return 'cancelled';
    }

    if (isActive === 'Completed' || isActive === 'completed') {
      return 'completed';
    }

    // If booking is active, determine status based on time
    if (timeStatus === 'upcoming') {
      return 'scheduled';
    } else if (timeStatus === 'past') {
      return 'completed';
    }

    // Default to scheduled for active bookings
    return 'scheduled';
  }

  /**
   * Get contact's booking associations using HubSpot associations API
   * @param {string} contactId - The HubSpot contact ID
   * @returns {Promise<Array>} - Array of booking object IDs associated with the contact
   */
  async getContactBookingAssociations(contactId) {
    try {
      console.log(`🔗 Getting booking associations for contact ${contactId} using associations API`);

      // Use HubSpot Associations API to get all bookings associated with this contact
      const associations = await this.apiCall(
        'GET', 
        `/crm/v4/objects/${HUBSPOT_OBJECTS.contacts}/${contactId}/associations/${HUBSPOT_OBJECTS.bookings}?limit=100`
      );

      if (!associations?.results || associations.results.length === 0) {
        console.log(`No booking associations found for contact ${contactId}`);
        return [];
      }

      // Extract booking IDs from associations
      const bookingIds = associations.results.map(assoc => assoc.toObjectId);
      console.log(`✅ Found ${bookingIds.length} booking associations for contact ${contactId}:`, bookingIds);

      return bookingIds;

    } catch (error) {
      console.error(`❌ Error getting booking associations for contact ${contactId}:`, error);
      
      // Handle specific association API errors
      if (error.response?.status === 404) {
        console.log(`Contact ${contactId} not found or has no booking associations`);
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Get bookings for a contact with associated mock exam details - OPTIMIZED VERSION
   * @param {string} contactId - The HubSpot contact ID
   * @param {Object} options - Query options
   * @param {string} options.filter - Filter type: 'all', 'upcoming', 'past'
   * @param {number} options.page - Page number for pagination
   * @param {number} options.limit - Number of results per page
   * @returns {Object} - Bookings with pagination info
   */
  async getBookingsForContact(contactId, { filter = 'all', page = 1, limit = 10 } = {}) {
    try {
      console.log(`📋 Getting bookings for contact ${contactId} with filter: ${filter}, page: ${page}, limit: ${limit}`);

      // Step 1: Get all booking IDs associated with this contact using the dedicated method
      const bookingIds = await this.getContactBookingAssociations(contactId);

      if (bookingIds.length === 0) {
        return {
          bookings: [],
          total: 0,
          pagination: {
            current_page: page,
            total_pages: 0,
            total_bookings: 0,
            has_next: false,
            has_previous: false
          }
        };
      }

      // Step 2: Batch retrieve booking objects with CORRECTED properties
      // Fetch mock exam details directly if they're stored on booking, otherwise we'll need associations
      const bookingProperties = [
        'booking_id',
        'mock_type',      // Fetch directly from booking if available
        'location',       // Fetch directly from booking if available
        'start_time',     // Fetch directly from booking if available
        'end_time',       // Fetch directly from booking if available
        'exam_date',      // Fetch directly from booking if available
        'is_active',      // Fetch directly from booking if available
        'name',
        'email',
        'dominant_hand',
        'hs_createdate',
        'hs_object_id'
      ];

      const batchReadPayload = {
        inputs: bookingIds.map(id => ({ id })),
        properties: bookingProperties
      };

      console.log(`📦 Batch reading ${bookingIds.length} booking objects with optimized properties`);
      const bookingsResponse = await this.apiCall(
        'POST',
        `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/batch/read`,
        batchReadPayload
      );

      if (!bookingsResponse?.results || bookingsResponse.results.length === 0) {
        console.log(`No active booking objects found for contact ${contactId}`);
        return {
          bookings: [],
          total: 0,
          pagination: {
            current_page: page,
            total_pages: 0,
            total_bookings: 0,
            has_next: false,
            has_previous: false
          }
        };
      }

      // Step 3: Process bookings - check if we have mock exam data directly on bookings
      const bookingsWithExams = [];
      const now = new Date();
      const nowISOString = now.toISOString();
      const nowTimestamp = now.getTime();

      console.log(`🕐 [FILTER DEBUG] Current time reference:`, {
        now: nowISOString,
        timestamp: nowTimestamp,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // Collect booking IDs that need mock exam association fetching
      const bookingsNeedingMockExamData = [];
      const processedBookings = [];

      for (const booking of bookingsResponse.results) {
        console.log(`🔍 [BOOKING DEBUG] Processing booking ${booking.id}:`, {
          id: booking.id,
          booking_id: booking.properties.booking_id,
          has_mock_type: !!booking.properties.mock_type,
          has_exam_date: !!booking.properties.exam_date,
          raw_exam_date: booking.properties.exam_date,
          mock_type: booking.properties.mock_type
        });

        // Check if booking already has mock exam properties
        if (booking.properties.mock_type && booking.properties.exam_date) {
          // We have the data directly on the booking - no need for additional queries!
          const examDateRaw = booking.properties.exam_date;
          let examDate;
          let isValidDate = false;

          // Try multiple date parsing approaches to handle different formats
          try {
            // First try direct parsing
            examDate = new Date(examDateRaw);

            // Check if the parsed date is valid
            if (!isNaN(examDate.getTime())) {
              isValidDate = true;
            } else {
              // Try parsing as timestamp if it's a number
              if (!isNaN(Number(examDateRaw))) {
                examDate = new Date(Number(examDateRaw));
                isValidDate = !isNaN(examDate.getTime());
              }
            }

            // If still invalid, try parsing as ISO string with timezone handling
            if (!isValidDate && typeof examDateRaw === 'string') {
              // Handle potential timezone issues
              examDate = new Date(examDateRaw.replace(' ', 'T'));
              isValidDate = !isNaN(examDate.getTime());
            }
          } catch (dateError) {
            console.error(`❌ [DATE ERROR] Failed to parse exam_date for booking ${booking.id}:`, {
              raw_date: examDateRaw,
              error: dateError.message
            });
            isValidDate = false;
          }

          if (!isValidDate) {
            console.error(`❌ [DATE ERROR] Invalid exam_date for booking ${booking.id}, excluding from results:`, {
              raw_date: examDateRaw,
              type: typeof examDateRaw
            });
            // Skip this booking if we can't parse the date
            continue;
          }

          const examDateTimestamp = examDate.getTime();
          const isUpcoming = examDateTimestamp >= nowTimestamp;
          const status = isUpcoming ? 'upcoming' : 'past';

          console.log(`📅 [DATE DEBUG] Booking ${booking.id} date analysis:`, {
            raw_exam_date: examDateRaw,
            parsed_exam_date: examDate.toISOString(),
            exam_timestamp: examDateTimestamp,
            now_timestamp: nowTimestamp,
            time_diff_hours: Math.round((examDateTimestamp - nowTimestamp) / (1000 * 60 * 60) * 100) / 100,
            is_upcoming: isUpcoming,
            status: status,
            filter: filter,
            will_include: filter === 'all' || filter === status
          });

          if (filter === 'all' || filter === status) {
            console.log(`✅ [FILTER DEBUG] Including booking ${booking.id} (status: ${status}, filter: ${filter})`);
            const mockExamData = {
              mock_type: booking.properties.mock_type,
              exam_date: booking.properties.exam_date,
              location: booking.properties.location || 'Mississauga',
              start_time: booking.properties.start_time,
              end_time: booking.properties.end_time,
              is_active: booking.properties.is_active
            };
            processedBookings.push({
              booking,
              mockExamData,
              status,
              finalStatus: this.mapBookingStatus(booking, mockExamData, status)
            });
          } else {
            console.log(`❌ [FILTER DEBUG] Excluding booking ${booking.id} (status: ${status}, filter: ${filter})`);
          }
        } else {
          console.log(`⚠️ [BOOKING DEBUG] Booking ${booking.id} missing mock exam properties, will fetch via associations`);
          // We need to fetch mock exam data via associations
          bookingsNeedingMockExamData.push(booking);
        }
      }

      // Step 4: If any bookings need mock exam data, batch fetch the associations
      if (bookingsNeedingMockExamData.length > 0) {
        console.log(`⚠️ ${bookingsNeedingMockExamData.length} bookings missing mock exam properties, fetching via associations...`);

        // Batch get all mock exam associations
        const mockExamIds = new Set();
        const bookingToMockExamMap = new Map();

        // Get associations for all bookings that need it
        console.log(`🔍 Fetching mock exam associations for ${bookingsNeedingMockExamData.length} bookings...`);

        for (const booking of bookingsNeedingMockExamData) {
          try {
            const mockExamAssocs = await this.apiCall(
              'GET',
              `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${booking.id}/associations/${HUBSPOT_OBJECTS.mock_exams}`
            );

            if (mockExamAssocs?.results && mockExamAssocs.results.length > 0) {
              const mockExamId = mockExamAssocs.results[0].toObjectId;
              mockExamIds.add(mockExamId);
              bookingToMockExamMap.set(booking.id, mockExamId);
            } else {
              console.warn(`⚠️ No mock exam association found for booking ${booking.id} (${booking.properties.booking_id})`);
            }
          } catch (error) {
            console.error(`❌ Failed to get mock exam association for booking ${booking.id}:`, error.message);
          }
        }

        console.log(`✅ Found ${mockExamIds.size} mock exam associations`);

        // Batch fetch all unique mock exams
        if (mockExamIds.size > 0) {
          const mockExamBatchPayload = {
            inputs: Array.from(mockExamIds).map(id => ({ id })),
            properties: ['exam_date', 'start_time', 'end_time', 'capacity', 'total_bookings', 'mock_type', 'location', 'is_active']
          };

          console.log(`📦 Batch reading ${mockExamIds.size} mock exam objects...`);

          try {
            const mockExamsResponse = await this.apiCall(
              'POST',
              `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/batch/read`,
              mockExamBatchPayload
            );

            // Create a map of mock exam data
            const mockExamDataMap = new Map();
            if (mockExamsResponse?.results) {
              for (const mockExam of mockExamsResponse.results) {
                mockExamDataMap.set(mockExam.id, mockExam);
              }
              console.log(`✅ Retrieved ${mockExamsResponse.results.length} mock exam details`);
            } else {
              console.error(`❌ No mock exam data returned from batch read`);
            }

            // Process bookings with fetched mock exam data
            for (const booking of bookingsNeedingMockExamData) {
              const mockExamId = bookingToMockExamMap.get(booking.id);
              // Convert mockExamId to string since the map keys are strings
              const mockExam = mockExamId ? mockExamDataMap.get(String(mockExamId)) : null;


            if (mockExam) {
              const examDateRaw = mockExam.properties.exam_date;
              let examDate;
              let isValidDate = false;

              // Apply the same robust date parsing as above
              try {
                examDate = new Date(examDateRaw);

                if (!isNaN(examDate.getTime())) {
                  isValidDate = true;
                } else {
                  if (!isNaN(Number(examDateRaw))) {
                    examDate = new Date(Number(examDateRaw));
                    isValidDate = !isNaN(examDate.getTime());
                  }
                }

                if (!isValidDate && typeof examDateRaw === 'string') {
                  examDate = new Date(examDateRaw.replace(' ', 'T'));
                  isValidDate = !isNaN(examDate.getTime());
                }
              } catch (dateError) {
                console.error(`❌ [DATE ERROR] Failed to parse mock exam date for booking ${booking.id}:`, {
                  raw_date: examDateRaw,
                  error: dateError.message
                });
                isValidDate = false;
              }

              if (!isValidDate) {
                console.error(`❌ [DATE ERROR] Invalid mock exam date for booking ${booking.id}, excluding:`, {
                  raw_date: examDateRaw,
                  mock_exam_id: mockExamId
                });
                continue;
              }

              const examDateTimestamp = examDate.getTime();
              const isUpcoming = examDateTimestamp >= nowTimestamp;
              const status = isUpcoming ? 'upcoming' : 'past';

              console.log(`📅 [DATE DEBUG] Association booking ${booking.id} date analysis:`, {
                raw_exam_date: examDateRaw,
                parsed_exam_date: examDate.toISOString(),
                exam_timestamp: examDateTimestamp,
                now_timestamp: nowTimestamp,
                time_diff_hours: Math.round((examDateTimestamp - nowTimestamp) / (1000 * 60 * 60) * 100) / 100,
                is_upcoming: isUpcoming,
                status: status,
                filter: filter,
                will_include: filter === 'all' || filter === status
              });

              if (filter === 'all' || filter === status) {
                console.log(`✅ [FILTER DEBUG] Including association booking ${booking.id} (status: ${status}, filter: ${filter})`);
                const mockExamData = {
                  id: mockExamId,
                  mock_type: mockExam.properties.mock_type,
                  exam_date: mockExam.properties.exam_date,
                  location: mockExam.properties.location || 'Mississauga',
                  start_time: mockExam.properties.start_time,
                  end_time: mockExam.properties.end_time,
                  capacity: parseInt(mockExam.properties.capacity) || 0,
                  total_bookings: parseInt(mockExam.properties.total_bookings) || 0,
                  is_active: mockExam.properties.is_active
                };
                processedBookings.push({
                  booking,
                  mockExamData,
                  status,
                  finalStatus: this.mapBookingStatus(booking, mockExamData, status)
                });
              } else {
                console.log(`❌ [FILTER DEBUG] Excluding association booking ${booking.id} (status: ${status}, filter: ${filter})`);
              }
            } else {
              console.warn(`❌ No mock exam data found for booking ${booking.id} (${booking.properties.booking_id}), excluding from results`);
            }
          }
          } catch (batchError) {
            console.error(`❌ [BATCH ERROR] Failed to batch read mock exams:`, {
              error_message: batchError.message,
              error_status: batchError.response?.status,
              error_data: batchError.response?.data,
              mock_exam_ids: mockExamIdArray
            });
          }
        } else {
          console.error(`🚨 No mock exam associations found for any of the ${bookingsNeedingMockExamData.length} bookings`);
        }
      }

      // Step 5: Format all processed bookings for output
      for (const { booking, mockExamData, status, finalStatus } of processedBookings) {
        console.log('🔍 [HUBSPOT DEBUG] Adding booking to list:', {
          hubspotObjectId: booking.id,
          customBookingId: booking.properties.booking_id,
          mockType: mockExamData.mock_type,
          timeStatus: status,
          finalStatus: finalStatus
        });

        bookingsWithExams.push({
          id: booking.id,
          booking_id: booking.properties.booking_id,
          booking_number: booking.properties.booking_id, // For frontend compatibility
          name: booking.properties.name,
          email: booking.properties.email,
          dominant_hand: booking.properties.dominant_hand === 'true',
          // Flattened fields for frontend
          mock_type: mockExamData.mock_type,
          exam_date: mockExamData.exam_date,
          location: mockExamData.location,
          start_time: mockExamData.start_time,
          end_time: mockExamData.end_time,
          is_active: mockExamData.is_active,  // Include is_active for frontend use
          // Nested structure for backward compatibility
          mock_exam: mockExamData,
          status: finalStatus,  // Use the properly mapped status
          created_at: booking.properties.hs_createdate
        });
      }

      // Step 6: Sort bookings by exam date (with error handling)
      bookingsWithExams.sort((a, b) => {
        try {
          const dateA = new Date(a.exam_date);
          const dateB = new Date(b.exam_date);

          // Ensure both dates are valid before comparison
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            console.warn(`⚠️ [SORT WARNING] Invalid date in booking sort:`, {
              booking_a: { id: a.id, exam_date: a.exam_date },
              booking_b: { id: b.id, exam_date: b.exam_date }
            });
            return 0; // Keep original order if dates are invalid
          }

          return filter === 'past' ? dateB - dateA : dateA - dateB; // Past: newest first, Upcoming: soonest first
        } catch (sortError) {
          console.error(`❌ [SORT ERROR] Failed to sort bookings:`, sortError.message);
          return 0;
        }
      });

      // Step 7: Apply pagination
      const totalBookings = bookingsWithExams.length;
      const totalPages = Math.ceil(totalBookings / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBookings = bookingsWithExams.slice(startIndex, endIndex);

      console.log(`📊 [FINAL DEBUG] Booking processing summary:`, {
        initial_bookings_found: bookingsResponse?.results?.length || 0,
        bookings_with_direct_data: bookingsResponse?.results?.length - bookingsNeedingMockExamData.length,
        bookings_needing_associations: bookingsNeedingMockExamData.length,
        total_processed_bookings: processedBookings.length,
        final_bookings_count: totalBookings,
        paginated_bookings_count: paginatedBookings.length,
        filter: filter,
        page: page,
        current_time: nowISOString
      });

      // 🚨 CRITICAL DEBUG: If we expected bookings but got 0, log detailed analysis
      if ((bookingsResponse?.results?.length > 0) && (totalBookings === 0)) {
        console.error(`🚨 [CRITICAL DEBUG] Found ${bookingsResponse.results.length} bookings but processed 0!`);
        console.error('This indicates all bookings were filtered out. Reasons could be:');
        console.error('1. All exam dates are invalid/unparseable');
        console.error('2. All exam dates fail the upcoming/past filter');
        console.error('3. Missing mock exam associations for all bookings');

        // Log each original booking for analysis
        bookingsResponse.results.forEach((booking, idx) => {
          console.error(`[${idx + 1}] Booking ${booking.id}:`, {
            booking_id: booking.properties.booking_id,
            has_mock_type: !!booking.properties.mock_type,
            has_exam_date: !!booking.properties.exam_date,
            exam_date: booking.properties.exam_date,
            mock_type: booking.properties.mock_type
          });
        });
      }

      console.log(`✅ Successfully processed ${totalBookings} bookings (filter: ${filter}), returning ${paginatedBookings.length} for page ${page}`);

      return {
        bookings: paginatedBookings,
        total: totalBookings,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_bookings: totalBookings,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      };

    } catch (error) {
      console.error(`❌ Error getting bookings for contact ${contactId}:`, error);

      // Handle rate limiting and other API errors gracefully
      if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      }

      if (error.response?.status === 404) {
        throw new Error(`Contact not found or has no booking associations.`);
      }

      // Re-throw with more context
      throw new Error(`Failed to retrieve bookings: ${error.message}`);
    }
  }

  async deleteBooking(bookingId) {
    return await this.apiCall('DELETE', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`);
  }

  /**
   * Get a single booking by ID with associations
   * @param {string} bookingId - The booking ID
   * @returns {Promise<object>} Booking object with associations
   */
  async getBookingWithAssociations(bookingId) {
    console.log('🔍 [HUBSPOT DEBUG] Getting booking with associations:', {
      bookingId,
      bookingIdType: typeof bookingId,
      hubspotObjectType: HUBSPOT_OBJECTS.bookings,
      url: `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`
    });

    try {
      // Get booking properties with V3 API
      const bookingResult = await this.apiCall({
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
          ]
        }
      });

      // Get associations using V4 API for better reliability
      let contactAssocs = { results: [] };
      let mockExamAssocs = { results: [] };

      try {
        contactAssocs = await this.apiCall({
          method: 'GET',
          url: `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}`
        });
      } catch (e) {
        console.log('No contact associations found');
      }

      try {
        mockExamAssocs = await this.apiCall({
          method: 'GET',
          url: `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.mock_exams}`
        });
      } catch (e) {
        console.log('No mock exam associations found');
      }

      // Combine results in V3-compatible format
      // CRITICAL: Convert numeric IDs to strings for consistent comparison
      const result = {
        ...bookingResult,
        data: bookingResult.data || bookingResult,
        associations: {
          [HUBSPOT_OBJECTS.contacts]: {
            results: contactAssocs.results?.map(a => ({
              id: String(a.toObjectId),  // Convert to string for consistent comparison
              toObjectId: String(a.toObjectId),  // Convert to string for consistent comparison
              type: 'booking_to_contact'
            })) || []
          },
          [HUBSPOT_OBJECTS.mock_exams]: {
            results: mockExamAssocs.results?.map(a => ({
              id: String(a.toObjectId),  // Convert to string for consistent comparison
              toObjectId: String(a.toObjectId),  // Convert to string for consistent comparison
              type: 'booking_to_mock_exam'
            })) || []
          }
        }
      };

      console.log('🔍 [HUBSPOT DEBUG] Booking fetch successful:', {
        hasResult: !!result,
        bookingId: result?.id || result?.data?.id,
        contactAssociations: result.associations[HUBSPOT_OBJECTS.contacts].results.length,
        mockExamAssociations: result.associations[HUBSPOT_OBJECTS.mock_exams].results.length
      });

      return result;
    } catch (error) {
      console.error('❌ [HUBSPOT ERROR] Failed to fetch booking:', {
        bookingId,
        error: error.message,
        status: error.status || error.response?.status,
        details: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Restore credits to contact based on mock type
   * @param {string} contactId - The contact ID
   * @param {string} mockType - The mock type
   * @param {object} currentCredits - Current credit values
   * @returns {Promise<object>} Result of credit restoration
   */
  async restoreCredits(contactId, mockType, currentCredits) {
    const creditUpdate = {};
    let creditType = '';
    let amount = 1;

    // Determine which credit to restore based on mock type
    switch (mockType) {
      case 'Situational Judgment':
        // Check if sj_credits was used (> 0) or shared_mock_credits
        if (currentCredits.sj_credits > 0) {
          creditType = 'sj_credits';
          creditUpdate.sj_credits = currentCredits.sj_credits + 1;
        } else {
          creditType = 'shared_mock_credits';
          creditUpdate.shared_mock_credits = (currentCredits.shared_mock_credits || 0) + 1;
        }
        break;
        
      case 'Clinical Skills':
        // Check if cs_credits was used (> 0) or shared_mock_credits
        if (currentCredits.cs_credits > 0) {
          creditType = 'cs_credits';
          creditUpdate.cs_credits = currentCredits.cs_credits + 1;
        } else {
          creditType = 'shared_mock_credits';
          creditUpdate.shared_mock_credits = (currentCredits.shared_mock_credits || 0) + 1;
        }
        break;
        
      case 'Mini-mock':
        creditType = 'sjmini_credits';
        creditUpdate.sjmini_credits = (currentCredits.sjmini_credits || 0) + 1;
        break;
        
      default:
        throw new Error(`Unknown mock type: ${mockType}`);
    }

    // Update contact with restored credits
    await this.apiCall({
      method: 'PATCH',
      url: `/crm/v3/objects/contacts/${contactId}`,
      data: {
        properties: creditUpdate
      }
    });

    return {
      credit_type: creditType,
      amount: amount,
      new_balance: creditUpdate[creditType]
    };
  }

  /**
   * Decrement mock exam booking count
   * @param {string} mockExamId - The mock exam ID
   * @returns {Promise<object>} Updated mock exam info
   */
  async decrementMockExamBookings(mockExamId) {
    // First get current booking count
    const mockExamResponse = await this.getMockExam(mockExamId);
    if (!mockExamResponse || !mockExamResponse.data) {
      throw new Error('Mock exam not found');
    }

    const currentBookings = parseInt(mockExamResponse.data.properties.total_bookings) || 0;
    const capacity = parseInt(mockExamResponse.data.properties.capacity) || 0;
    const newBookings = Math.max(0, currentBookings - 1);

    // Update the mock exam
    await this.apiCall({
      method: 'PATCH',
      url: `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/${mockExamId}`,
      data: {
        properties: {
          total_bookings: newBookings
        }
      }
    });

    return {
      id: mockExamId,
      new_total_bookings: newBookings,
      available_slots: capacity - newBookings
    };
  }

  /**
   * Create a cancellation note on the associated deal
   * @param {string} dealId - The deal ID
   * @param {object} cancellationData - Cancellation details
   * @returns {Promise<void>}
   */
  async createCancellationNote(dealId, cancellationData) {
    const timestamp = new Date().toISOString();
    const noteContent = `
❌ <strong>Booking Canceled</strong>
━━━━━━━━━━━━━━━━━━━━━━
<strong>Booking ID:</strong> ${cancellationData.booking_id}
<strong>Mock Type:</strong> ${cancellationData.mock_type}
<strong>Exam Date:</strong> ${cancellationData.exam_date}
<strong>Canceled At:</strong> ${timestamp}
${cancellationData.reason ? `<strong>Reason:</strong> ${cancellationData.reason}` : ''}
<strong>Credits Restored:</strong> ${cancellationData.credits_restored.amount} ${cancellationData.credits_restored.credit_type}
━━━━━━━━━━━━━━━━━━━━━━
<em>Automated cancellation via booking system</em>`;

    await this.apiCall({
      method: 'POST',
      url: `/crm/v3/objects/notes`,
      data: {
        properties: {
          hs_timestamp: timestamp,
          hs_note_body: noteContent
        },
        associations: [
          {
            to: { id: dealId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 214  // Note to Deal association
              }
            ]
          }
        ]
      }
    });
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