/**
 * Test suite for DELETE /api/bookings/[id]
 * Tests booking cancellation with credit restoration and atomic operations
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const handler = require('../../../api/bookings/[id]');
const { HubSpotService } = require('../../../api/_shared/hubspot');

// Mock the HubSpot service
jest.mock('../../../api/_shared/hubspot');

// Mock environment variables
process.env.HS_PRIVATE_APP_TOKEN = 'test-token';
process.env.NODE_ENV = 'test';

describe('DELETE /api/bookings/[id]', () => {
  let req, res;
  let mockHubSpotService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request object
    req = {
      method: 'DELETE',
      query: {
        id: 'booking_123'
      },
      body: {
        student_id: 'STUDENT123',
        email: 'student@example.com',
        reason: 'Schedule conflict'
      },
      headers: {}
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn()
    };

    // Setup HubSpot service mock
    mockHubSpotService = {
      searchContacts: jest.fn(),
      getBookingWithAssociations: jest.fn(),
      getMockExam: jest.fn(),
      restoreCredits: jest.fn(),
      decrementMockExamBookings: jest.fn(),
      deleteBooking: jest.fn(),
      createCancellationNote: jest.fn(),
      apiCall: jest.fn(),
      baseUrl: 'https://api.hubapi.com/crm/v3'
    };

    HubSpotService.mockImplementation(() => mockHubSpotService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful cancellation', () => {
    it('should successfully cancel a booking and restore credits for Situational Judgment', async () => {
      // Mock contact authentication
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'STUDENT123',
          sj_credits: 2,
          cs_credits: 1,
          sjmini_credits: 3,
          shared_mock_credits: 5
        }
      });

      // Mock booking with associations
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'SJ-John-2025-01-20',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] }, // Contact
            '2-50158913': { results: [{ id: 'exam_789' }] }, // Mock Exam
            '0-3': { results: [{ id: 'deal_111' }] } // Deal
          }
        }
      });

      // Mock mock exam data
      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Situational Judgment',
            exam_date: '2025-02-15',
            total_bookings: 10,
            capacity: 15
          }
        }
      });

      // Mock credit restoration
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount: 1,
        new_balance: 3
      });

      // Mock mock exam update
      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        id: 'exam_789',
        new_total_bookings: 9,
        available_slots: 6
      });

      // Mock booking deletion
      mockHubSpotService.deleteBooking.mockResolvedValue({});

      // Mock note creation
      mockHubSpotService.createCancellationNote.mockResolvedValue({});

      // Execute the handler
      await handler(req, res);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Booking canceled successfully',
        data: {
          canceled_booking: {
            booking_id: 'SJ-John-2025-01-20',
            mock_type: 'Situational Judgment',
            exam_date: '2025-02-15',
            canceled_at: expect.any(String),
            reason: 'Schedule conflict'
          },
          credits_restored: {
            credit_type: 'sj_credits',
            amount: 1,
            new_balance: 3
          },
          mock_exam_updated: {
            id: 'exam_789',
            new_total_bookings: 9,
            available_slots: 6
          }
        }
      });

      // Verify all operations were called
      expect(mockHubSpotService.searchContacts).toHaveBeenCalledWith('STUDENT123', 'student@example.com');
      expect(mockHubSpotService.getBookingWithAssociations).toHaveBeenCalledWith('booking_123');
      expect(mockHubSpotService.restoreCredits).toHaveBeenCalled();
      expect(mockHubSpotService.decrementMockExamBookings).toHaveBeenCalledWith('exam_789');
      expect(mockHubSpotService.deleteBooking).toHaveBeenCalledWith('booking_123');
      expect(mockHubSpotService.createCancellationNote).toHaveBeenCalled();
    });

    it('should restore shared_mock_credits when sj_credits is 0', async () => {
      // Mock contact with 0 sj_credits
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          firstname: 'Jane',
          lastname: 'Smith',
          student_id: 'STUDENT123',
          sj_credits: 0,
          cs_credits: 1,
          sjmini_credits: 2,
          shared_mock_credits: 5
        }
      });

      // Mock booking and exam data
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'SJ-Jane-2025-01-20',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Situational Judgment',
            exam_date: '2025-02-15',
            total_bookings: 10,
            capacity: 15
          }
        }
      });

      // Mock credit restoration to shared_mock_credits
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'shared_mock_credits',
        amount: 1,
        new_balance: 6
      });

      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        id: 'exam_789',
        new_total_bookings: 9,
        available_slots: 6
      });

      mockHubSpotService.deleteBooking.mockResolvedValue({});

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.credits_restored.credit_type).toBe('shared_mock_credits');
      expect(response.data.credits_restored.new_balance).toBe(6);
    });
  });

  describe('Error handling', () => {
    it('should return 401 when authentication fails', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed. Please check your Student ID and email.',
        code: 'AUTH_FAILED'
      });
    });

    it('should return 404 when booking not found', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: { student_id: 'STUDENT123' }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(null);

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    });

    it('should return 403 when booking belongs to another user', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: { student_id: 'STUDENT123' }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: { booking_id: 'SJ-Other-2025-01-20' },
          associations: {
            '0-1': { results: [{ id: 'contact_999' }] } // Different contact
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

    it('should return 409 when booking is already canceled', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: { student_id: 'STUDENT123' }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'SJ-John-2025-01-20',
            status: 'canceled'
          },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] }
          }
        }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Booking is already canceled',
        code: 'ALREADY_CANCELED'
      });
    });

    it('should return 409 when exam is in the past', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: { student_id: 'STUDENT123' }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: {
            booking_id: 'SJ-John-2024-01-20',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Situational Judgment',
            exam_date: '2024-01-20', // Past date
            total_bookings: 10
          }
        }
      });

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot cancel bookings for past exams',
        code: 'EXAM_IN_PAST'
      });
    });

    it('should return 400 for missing required parameters', async () => {
      req.body = { email: 'student@example.com' }; // Missing student_id

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Student ID is required'),
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return 405 for unsupported methods', async () => {
      req.method = 'PUT';

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Method not allowed',
        code: 'INTERNAL_ERROR'
      });
    });
  });

  describe('Atomic operations and rollback', () => {
    it('should rollback credit restoration if mock exam update fails', async () => {
      // Setup successful initial operations
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          student_id: 'STUDENT123',
          sj_credits: 2,
          shared_mock_credits: 5
        }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: { booking_id: 'SJ-John-2025-01-20', status: 'confirmed' },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Situational Judgment',
            exam_date: '2025-02-15',
            total_bookings: 10
          }
        }
      });

      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount: 1,
        new_balance: 3
      });

      // Mock exam update failure
      mockHubSpotService.decrementMockExamBookings.mockRejectedValue(
        new Error('Failed to update mock exam')
      );

      // Mock rollback operation
      mockHubSpotService.apiCall.mockResolvedValue({});

      await handler(req, res);

      // Verify rollback was attempted
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith({
        method: 'PATCH',
        url: 'https://api.hubapi.com/crm/v3/objects/contacts/contact_456',
        data: { properties: { sj_credits: 2 } } // Original value
      });

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should rollback both credits and mock exam if deletion fails', async () => {
      // Setup successful initial operations
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          student_id: 'STUDENT123',
          cs_credits: 1,
          shared_mock_credits: 5
        }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: { booking_id: 'CS-John-2025-01-20', status: 'confirmed' },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Clinical Skills',
            exam_date: '2025-02-15',
            total_bookings: 10,
            capacity: 15
          }
        }
      });

      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'cs_credits',
        amount: 1,
        new_balance: 2
      });

      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        id: 'exam_789',
        new_total_bookings: 9,
        available_slots: 6
      });

      // Mock deletion failure
      mockHubSpotService.deleteBooking.mockRejectedValue(
        new Error('Failed to delete booking')
      );

      // Mock rollback operations
      mockHubSpotService.apiCall.mockResolvedValue({});

      await handler(req, res);

      // Verify both rollbacks were attempted
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith({
        method: 'PATCH',
        url: 'https://api.hubapi.com/crm/v3/objects/2-50158913/exam_789',
        data: { properties: { total_bookings: 10 } } // Original value
      });

      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith({
        method: 'PATCH',
        url: 'https://api.hubapi.com/crm/v3/objects/contacts/contact_456',
        data: { properties: { cs_credits: 1 } } // Original value
      });

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Credit restoration logic', () => {
    it('should restore sjmini_credits for Mini-mock cancellation', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          student_id: 'STUDENT123',
          sjmini_credits: 5
        }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: { booking_id: 'MM-John-2025-01-20', status: 'confirmed' },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Mini-mock',
            exam_date: '2025-02-15',
            total_bookings: 10
          }
        }
      });

      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sjmini_credits',
        amount: 1,
        new_balance: 6
      });

      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        id: 'exam_789',
        new_total_bookings: 9,
        available_slots: 6
      });

      mockHubSpotService.deleteBooking.mockResolvedValue({});

      await handler(req, res);

      expect(mockHubSpotService.restoreCredits).toHaveBeenCalledWith(
        'contact_456',
        'Mini-mock',
        expect.objectContaining({ sjmini_credits: 5 })
      );

      const response = res.json.mock.calls[0][0];
      expect(response.data.credits_restored.credit_type).toBe('sjmini_credits');
    });

    it('should restore shared_mock_credits when cs_credits is 0', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue({
        id: 'contact_456',
        properties: {
          student_id: 'STUDENT123',
          cs_credits: 0,
          shared_mock_credits: 3
        }
      });

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue({
        data: {
          id: 'booking_123',
          properties: { booking_id: 'CS-John-2025-01-20', status: 'confirmed' },
          associations: {
            '0-1': { results: [{ id: 'contact_456' }] },
            '2-50158913': { results: [{ id: 'exam_789' }] }
          }
        }
      });

      mockHubSpotService.getMockExam.mockResolvedValue({
        data: {
          properties: {
            mock_type: 'Clinical Skills',
            exam_date: '2025-02-15',
            total_bookings: 10
          }
        }
      });

      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'shared_mock_credits',
        amount: 1,
        new_balance: 4
      });

      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        id: 'exam_789',
        new_total_bookings: 9,
        available_slots: 6
      });

      mockHubSpotService.deleteBooking.mockResolvedValue({});

      await handler(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data.credits_restored.credit_type).toBe('shared_mock_credits');
      expect(response.data.credits_restored.new_balance).toBe(4);
    });
  });
});