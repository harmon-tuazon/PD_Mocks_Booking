/**
 * Test suite for GET /api/bookings/[id] endpoint
 */

const handler = require('../../../api/bookings/[id]');
const { HubSpotService } = require('../../../api/_shared/hubspot');
const { rateLimitMiddleware } = require('../../../api/_shared/validation');

// Mock dependencies
jest.mock('../../../api/_shared/hubspot');
jest.mock('../../../api/_shared/validation', () => ({
  ...jest.requireActual('../../../api/_shared/validation'),
  rateLimitMiddleware: jest.fn().mockResolvedValue(undefined),
  verifyEnvironmentVariables: jest.fn()
}));

describe('GET /api/bookings/[id]', () => {
  let req, res;
  let mockHubSpotService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response objects
    req = {
      method: 'GET',
      query: {
        id: 'booking_123',
        student_id: 'SMPC12345',
        email: 'john.doe@example.com'
      },
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };

    // Setup HubSpot service mock
    mockHubSpotService = {
      searchContacts: jest.fn(),
      apiCall: jest.fn(),
      getMockExam: jest.fn(),
      baseUrl: 'https://api.hubapi.com/crm/v3'
    };

    HubSpotService.mockImplementation(() => mockHubSpotService);
  });

  describe('Success Cases', () => {
    it('should return booking details with mock exam and enrollment', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock booking fetch with associations
      mockHubSpotService.apiCall.mockResolvedValueOnce({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'Clinical Skills-John Doe - 2025-01-20',
            name: 'John Doe',
            email: 'john.doe@example.com',
            dominant_hand: 'true',
            status: 'upcoming',
            createdate: '2025-01-15T10:30:00.000Z',
            hs_lastmodifieddate: '2025-01-15T10:30:00.000Z'
          },
          associations: {
            '0-1': {
              results: [{ id: 'contact_789' }]
            },
            '2-50158913': {
              results: [{ id: 'exam_456' }]
            },
            '2-41701559': {
              results: [{ id: 'enrollment_101' }]
            }
          }
        }
      });

      // Mock mock exam details
      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          id: 'exam_456',
          properties: {
            exam_date: '2025-01-20',
            mock_type: 'Clinical Skills',
            location: 'Mississauga',
            capacity: '15',
            total_bookings: '8',
            address: '100 City Centre Dr, Mississauga, ON L5B 2C9',
            start_time: '09:00',
            end_time: '13:00'
          }
        }
      });

      // Mock enrollment details
      mockHubSpotService.apiCall.mockResolvedValueOnce({
        data: {
          id: 'enrollment_101',
          properties: {
            enrollment_id: 'John Doe-NDECC Clinical Skills',
            course_id: 'CS-2025-01',
            enrollment_status: 'Registered'
          }
        }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully retrieved booking details',
        data: {
          booking: {
            id: 'booking_123',
            booking_id: 'Clinical Skills-John Doe - 2025-01-20',
            name: 'John Doe',
            email: 'john.doe@example.com',
            dominant_hand: true,
            status: 'upcoming',
            created_at: '2025-01-15T10:30:00.000Z',
            updated_at: '2025-01-15T10:30:00.000Z'
          },
          mock_exam: {
            id: 'exam_456',
            exam_date: '2025-01-20',
            mock_type: 'Clinical Skills',
            location: 'Mississauga',
            capacity: 15,
            total_bookings: 8,
            address: '100 City Centre Dr, Mississauga, ON L5B 2C9',
            start_time: '09:00',
            end_time: '13:00'
          },
          contact: {
            id: 'contact_789',
            firstname: 'John',
            lastname: 'Doe',
            student_id: 'SMPC12345'
          },
          enrollment: {
            id: 'enrollment_101',
            enrollment_id: 'John Doe-NDECC Clinical Skills',
            course_id: 'CS-2025-01',
            enrollment_status: 'Registered'
          }
        }
      });
    });

    it('should return booking without mock exam and enrollment if not associated', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock booking fetch without associations
      mockHubSpotService.apiCall.mockResolvedValueOnce({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'Clinical Skills-John Doe - 2025-01-20',
            name: 'John Doe',
            email: 'john.doe@example.com',
            dominant_hand: 'false',
            status: 'completed',
            createdate: '2025-01-15T10:30:00.000Z',
            hs_lastmodifieddate: '2025-01-15T10:30:00.000Z'
          },
          associations: {
            '0-1': {
              results: [{ id: 'contact_789' }]
            }
          }
        }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.mock_exam).toBeNull();
      expect(response.data.enrollment).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should return 400 if booking ID is missing', async () => {
      req.query.id = undefined;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Booking ID is required',
        code: 'MISSING_BOOKING_ID'
      });
    });

    it('should return 400 if student_id or email is missing', async () => {
      delete req.query.student_id;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input: "student_id" is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 401 if authentication fails', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed. Please check your Student ID and email.',
        code: 'AUTH_FAILED'
      });
    });

    it('should return 404 if booking is not found', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock booking not found
      mockHubSpotService.apiCall.mockResolvedValueOnce(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    });

    it('should return 403 if booking does not belong to authenticated user', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock booking with different contact association
      mockHubSpotService.apiCall.mockResolvedValueOnce({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'Clinical Skills-Jane Doe - 2025-01-20',
            name: 'Jane Doe',
            email: 'jane.doe@example.com'
          },
          associations: {
            '0-1': {
              results: [{ id: 'contact_999' }] // Different contact ID
            }
          }
        }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. This booking does not belong to you.',
        code: 'ACCESS_DENIED'
      });
    });

    it('should return 405 for non-GET methods', async () => {
      req.method = 'POST';

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should handle HubSpot API errors gracefully', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock HubSpot API error
      mockHubSpotService.apiCall.mockRejectedValueOnce(new Error('HubSpot API error'));

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'HubSpot API error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should gracefully handle mock exam fetch failures', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_789',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'SMPC12345'
        }
      });

      // Mock booking fetch with associations
      mockHubSpotService.apiCall.mockResolvedValueOnce({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'Clinical Skills-John Doe - 2025-01-20',
            name: 'John Doe',
            email: 'john.doe@example.com',
            dominant_hand: 'true',
            status: 'upcoming'
          },
          associations: {
            '0-1': {
              results: [{ id: 'contact_789' }]
            },
            '2-50158913': {
              results: [{ id: 'exam_456' }]
            }
          }
        }
      });

      // Mock mock exam fetch failure
      mockHubSpotService.getMockExam.mockRejectedValue(new Error('Failed to fetch mock exam'));

      await handler(req, res);

      // Should still return 200 with null mock_exam
      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.mock_exam).toBeNull();
    });
  });

  describe('OPTIONS request', () => {
    it('should handle OPTIONS request for CORS', async () => {
      req.method = 'OPTIONS';

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});