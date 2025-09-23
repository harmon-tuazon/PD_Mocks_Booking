require('dotenv').config();
const { HubSpotService } = require('../_shared/hubspot');
const { validateInput } = require('../_shared/validation');
const {
  setCorsHeaders,
  handleOptionsRequest,
  createErrorResponse,
  createSuccessResponse,
  verifyEnvironmentVariables,
  rateLimitMiddleware
} = require('../_shared/auth');

// Simple in-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/mock-exams/available
 * Fetch all active mock exam sessions filtered by type with available capacity
 */
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request
  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(
      createErrorResponse(new Error('Method not allowed'))
    );
  }

  try {
    // Verify environment variables
    verifyEnvironmentVariables();

    // Apply rate limiting
    const rateLimiter = rateLimitMiddleware({
      maxRequests: 30,
      windowMs: 60000 // 1 minute
    });

    if (await rateLimiter(req, res)) {
      return; // Request was rate limited
    }

    // Validate query parameters
    const validatedData = await validateInput(req.query, 'availableExams');
    const { mock_type, include_capacity, realtime } = validatedData;

    // Check if real-time capacity calculation is requested
    const useRealTimeCapacity = realtime;

    // Fetch from HubSpot
    const hubspot = new HubSpotService();
    const searchResult = await hubspot.searchMockExams(mock_type, true);

    // Process exams with optional real-time capacity calculation
    const processedExams = await Promise.all(searchResult.results.map(async exam => {
      const capacity = parseInt(exam.properties.capacity) || 0;
      let totalBookings = parseInt(exam.properties.total_bookings) || 0;

      // If real-time capacity is requested, recalculate from actual associations
      if (useRealTimeCapacity) {
        try {
          console.log(`Fetching real-time booking count for mock exam ${exam.id}`);
          const actualCount = await hubspot.getActiveBookingsCount(exam.id);

          // Update the stored count if it differs
          if (actualCount !== totalBookings) {
            console.log(`Updating mock exam ${exam.id}: stored=${totalBookings}, actual=${actualCount}`);
            await hubspot.updateMockExamBookings(exam.id, actualCount);
            totalBookings = actualCount;
          }
        } catch (error) {
          console.error(`Failed to get real-time capacity for exam ${exam.id}, using cached value:`, error);
          // Fall back to cached value on error
        }
      }

      const availableSlots = Math.max(0, capacity - totalBookings);

      // Generate fallback times if missing from HubSpot
      if (!exam.properties.start_time || !exam.properties.end_time) {

        if (exam.properties.exam_date) {
          const examDate = exam.properties.exam_date;
          const isAfternoon = exam.id.endsWith('980');
          const examDateObj = new Date(examDate + 'T00:00:00');

          let localStartHour, localEndHour;
          if (isAfternoon) {
            localStartHour = 12; // 12 PM
            localEndHour = 13;   // 1 PM
          } else {
            localStartHour = 8;  // 8 AM
            localEndHour = 9;    // 9 AM
          }

          const startDate = new Date(examDateObj);
          startDate.setHours(localStartHour, 0, 0, 0);
          const endDate = new Date(examDateObj);
          endDate.setHours(localEndHour, 0, 0, 0);

          // Convert to UTC (Toronto is UTC-4 during DST)
          const timeZoneOffset = 4;
          startDate.setHours(startDate.getHours() + timeZoneOffset);
          endDate.setHours(endDate.getHours() + timeZoneOffset);

          exam.properties.start_time = startDate.toISOString();
          exam.properties.end_time = endDate.toISOString();
        }
      }

      const processedExam = {
        mock_exam_id: exam.id,
        exam_date: exam.properties.exam_date,
        start_time: exam.properties.start_time,
        end_time: exam.properties.end_time,
        mock_type: exam.properties.mock_type,
        capacity: capacity,
        total_bookings: totalBookings,
        available_slots: availableSlots,
        location: exam.properties.location || 'TBD',
        is_active: true,
        status: availableSlots === 0 ? 'full' :
                 availableSlots <= 3 ? 'limited' : 'available'
      };

      return processedExam;
    }));

    // Filter out full exams unless specifically requested
    const filteredExams = include_capacity
      ? processedExams
      : processedExams.filter(exam => exam.available_slots > 0);

    // Sort by date (already sorted by HubSpot, but ensure consistency)
    filteredExams.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

    // CACHING DISABLED - No cache storage

    // Return response
    res.status(200).json(createSuccessResponse(filteredExams));

  } catch (error) {
    console.error('Error fetching available mock exams:', error);

    const statusCode = error.status || 500;
    res.status(statusCode).json(createErrorResponse(error));
  }
};