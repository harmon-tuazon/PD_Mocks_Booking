/**
 * Integration Tests for HubSpot DELETE API Operations
 * Tests the complete booking deletion workflow including credit restoration
 */

const request = require('supertest');
const handler = require('../../api/bookings/[id].js');
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

// Mock the HubSpot service
jest.mock('../../api/_shared/hubspot');
const MockHubSpotService = HubSpotService;

// Create express-like app for testing
const express = require('express');
const app = express();
app.use(express.json());
app.delete('/api/bookings/:id', handler);
app.get('/api/bookings/:id', handler);

describe('HubSpot DELETE API Integration Tests', () => {
  let mockHubSpot;

  const mockContact = {
    id: '12345',
    properties: {
      firstname: 'John',
      lastname: 'Doe',
      student_id: 'STU123',
      email: 'john@example.com',
      sj_credits: '5',
      cs_credits: '3',
      sjmini_credits: '2',
      shared_mock_credits: '10'
    }
  };

  const mockBooking = {
    id: '67890',
    properties: {
      booking_id: 'BK001',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'scheduled',
      createdate: '2024-01-15T10:00:00Z',
      hs_lastmodifieddate: '2024-01-15T10:00:00Z'
    },
    associations: {
      [HUBSPOT_OBJECTS.contacts]: {
        results: [{ id: '12345' }]
      },
      [HUBSPOT_OBJECTS.mock_exams]: {
        results: [{ id: '11111' }]
      },
      [HUBSPOT_OBJECTS.enrollments]: {
        results: [{ id: '22222' }]
      }
    }
  };

  const mockExam = {
    data: {
      id: '11111',
      properties: {
        exam_date: '2024-12-25',
        mock_type: 'SJT',
        location: 'London Campus',
        capacity: '50',
        total_bookings: '10',
        start_time: '09:00',
        end_time: '17:00'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementation
    mockHubSpot = {
      searchContacts: jest.fn(),
      getBookingWithAssociations: jest.fn(),
      getMockExam: jest.fn(),
      restoreCredits: jest.fn(),
      decrementMockExamBookings: jest.fn(),
      deleteBooking: jest.fn(),
      createCancellationNote: jest.fn(),
      apiCall: jest.fn()
    };

    MockHubSpotService.mockImplementation(() => mockHubSpot);

    // Setup environment variables
    process.env.HS_PRIVATE_APP_TOKEN = 'test-token';
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  describe('Authentication and Authorization', () => {
    it('should authenticate user successfully before deletion', async () => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({ credit_type: 'sj_credits', amount: 1 });
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({ total_bookings: 9 });
      mockHubSpot.deleteBooking.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com',
          reason: 'Schedule conflict'
        });

      expect(mockHubSpot.searchContacts).toHaveBeenCalledWith('STU123', 'john@example.com');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid student credentials', async () => {
      mockHubSpot.searchContacts.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'INVALID',
          email: 'invalid@example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication failed');
    });

    it('should verify booking ownership before deletion', async () => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      
      // Booking that doesn't belong to the user
      const unauthorizedBooking = {
        ...mockBooking,
        associations: {
          [HUBSPOT_OBJECTS.contacts]: {
            results: [{ id: '99999' }] // Different contact ID
          },
          [HUBSPOT_OBJECTS.mock_exams]: {
            results: [{ id: '11111' }]
          }
        }
      };
      
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: unauthorizedBooking });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Booking Validation', () => {
    beforeEach(() => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
    });

    it('should return 404 when booking not found', async () => {
      mockHubSpot.getBookingWithAssociations.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/bookings/nonexistent')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Booking not found');
    });

    it('should prevent deletion of already canceled bookings', async () => {
      const canceledBooking = {
        ...mockBooking,
        properties: {
          ...mockBooking.properties,
          status: 'canceled'
        }
      };
      
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: canceledBooking });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already canceled');
    });

    it('should prevent deletion of past exam bookings', async () => {
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      
      const pastExam = {
        ...mockExam,
        data: {
          ...mockExam.data,
          properties: {
            ...mockExam.data.properties,
            exam_date: '2024-01-01' // Past date
          }
        }
      };
      
      mockHubSpot.getMockExam.mockResolvedValue(pastExam);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Cannot cancel bookings for past exams');
    });

    it('should handle bookings without mock exam association', async () => {
      const bookingWithoutExam = {
        ...mockBooking,
        associations: {
          [HUBSPOT_OBJECTS.contacts]: {
            results: [{ id: '12345' }]
          },
          [HUBSPOT_OBJECTS.mock_exams]: {
            results: [] // No mock exam association
          }
        }
      };
      
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: bookingWithoutExam });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No mock exam associated');
    });
  });

  describe('Credit Restoration', () => {
    beforeEach(() => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({ total_bookings: 9 });
      mockHubSpot.deleteBooking.mockResolvedValue(true);
    });

    it('should restore credits for SJT exam type', async () => {
      mockHubSpot.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount: 1,
        new_balance: 6
      });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(mockHubSpot.restoreCredits).toHaveBeenCalledWith(
        '12345',
        'SJT',
        {
          sj_credits: 5,
          cs_credits: 3,
          sjmini_credits: 2,
          shared_mock_credits: 10
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.body.data.credits_restored.credit_type).toBe('sj_credits');
      expect(response.body.data.credits_restored.amount).toBe(1);
    });

    it('should restore credits for CS exam type', async () => {
      const csExam = {
        ...mockExam,
        data: {
          ...mockExam.data,
          properties: {
            ...mockExam.data.properties,
            mock_type: 'CS'
          }
        }
      };
      
      mockHubSpot.getMockExam.mockResolvedValue(csExam);
      mockHubSpot.restoreCredits.mockResolvedValue({
        credit_type: 'cs_credits',
        amount: 1,
        new_balance: 4
      });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(mockHubSpot.restoreCredits).toHaveBeenCalledWith(
        '12345',
        'CS',
        expect.any(Object)
      );
      
      expect(response.body.data.credits_restored.credit_type).toBe('cs_credits');
    });

    it('should handle credit restoration failures with rollback', async () => {
      mockHubSpot.restoreCredits.mockRejectedValue(new Error('Credit restoration failed'));

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Credit restoration failed');
      
      // Verify no other operations were attempted
      expect(mockHubSpot.decrementMockExamBookings).not.toHaveBeenCalled();
      expect(mockHubSpot.deleteBooking).not.toHaveBeenCalled();
    });
  });

  describe('Mock Exam Capacity Updates', () => {
    beforeEach(() => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({ credit_type: 'sj_credits', amount: 1 });
      mockHubSpot.deleteBooking.mockResolvedValue(true);
    });

    it('should decrement mock exam booking count', async () => {
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({
        total_bookings: 9,
        available_spots: 41
      });

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(mockHubSpot.decrementMockExamBookings).toHaveBeenCalledWith('11111');
      expect(response.status).toBe(200);
      expect(response.body.data.mock_exam_updated.total_bookings).toBe(9);
    });

    it('should handle mock exam update failures with rollback', async () => {
      mockHubSpot.decrementMockExamBookings.mockRejectedValue(new Error('Capacity update failed'));
      
      // Mock the rollback API call for credits
      mockHubSpot.apiCall.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Capacity update failed');
      
      // Verify rollback was attempted for credits
      expect(mockHubSpot.apiCall).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PATCH',
        url: '/crm/v3/objects/contacts/12345'
      }));
      
      // Verify booking deletion was not attempted
      expect(mockHubSpot.deleteBooking).not.toHaveBeenCalled();
    });
  });

  describe('Booking Deletion', () => {
    beforeEach(() => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({ credit_type: 'sj_credits', amount: 1 });
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({ total_bookings: 9 });
    });

    it('should successfully delete booking after all operations', async () => {
      mockHubSpot.deleteBooking.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(mockHubSpot.deleteBooking).toHaveBeenCalledWith('67890');
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Booking canceled successfully');
    });

    it('should handle booking deletion failures with complete rollback', async () => {
      mockHubSpot.deleteBooking.mockRejectedValue(new Error('Deletion failed'));
      mockHubSpot.apiCall.mockResolvedValue(true); // For rollback operations

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Deletion failed');
      
      // Verify rollback operations were attempted
      expect(mockHubSpot.apiCall).toHaveBeenCalledTimes(2); // Credits + mock exam rollback
    });
  });

  describe('Audit Trail Creation', () => {
    beforeEach(() => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({ credit_type: 'sj_credits', amount: 1 });
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({ total_bookings: 9 });
      mockHubSpot.deleteBooking.mockResolvedValue(true);
    });

    it('should create audit trail when deal association exists', async () => {
      const bookingWithDeal = {
        ...mockBooking,
        associations: {
          ...mockBooking.associations,
          [HUBSPOT_OBJECTS.deals]: {
            results: [{ id: '33333' }]
          }
        }
      };
      
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: bookingWithDeal });
      mockHubSpot.createCancellationNote.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com',
          reason: 'Emergency'
        });

      expect(mockHubSpot.createCancellationNote).toHaveBeenCalledWith(
        '33333',
        expect.objectContaining({
          booking_id: 'BK001',
          mock_type: 'SJT',
          exam_date: '2024-12-25',
          reason: 'Emergency',
          credits_restored: expect.any(Object)
        })
      );
      
      expect(response.status).toBe(200);
    });

    it('should continue without audit trail if deal association fails', async () => {
      mockHubSpot.createCancellationNote.mockRejectedValue(new Error('Note creation failed'));

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      // Should still succeed despite audit trail failure
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Booking canceled successfully');
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields for deletion', async () => {
      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          // Missing student_id and email
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid input');
    });

    it('should validate booking ID parameter', async () => {
      const response = await request(app)
        .delete('/api/bookings/')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(404); // Route not found for missing ID
    });

    it('should sanitize input parameters', async () => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({ credit_type: 'sj_credits', amount: 1 });
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({ total_bookings: 9 });
      mockHubSpot.deleteBooking.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123<script>',
          email: 'john@example.com',
          reason: 'Test<script>alert(1)</script>'
        });

      // Verify sanitized inputs were passed to HubSpot
      expect(mockHubSpot.searchContacts).toHaveBeenCalledWith(
        'STU123&lt;script&gt;',
        'john@example.com'
      );
      
      expect(response.status).toBe(200);
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute complete successful deletion workflow', async () => {
      // Setup all mocks for successful workflow
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.getBookingWithAssociations.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);
      mockHubSpot.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount: 1,
        new_balance: 6
      });
      mockHubSpot.decrementMockExamBookings.mockResolvedValue({
        total_bookings: 9,
        available_spots: 41
      });
      mockHubSpot.deleteBooking.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com',
          reason: 'Personal emergency'
        });

      // Verify complete workflow execution
      expect(mockHubSpot.searchContacts).toHaveBeenCalledTimes(1);
      expect(mockHubSpot.getBookingWithAssociations).toHaveBeenCalledTimes(1);
      expect(mockHubSpot.getMockExam).toHaveBeenCalledTimes(1);
      expect(mockHubSpot.restoreCredits).toHaveBeenCalledTimes(1);
      expect(mockHubSpot.decrementMockExamBookings).toHaveBeenCalledTimes(1);
      expect(mockHubSpot.deleteBooking).toHaveBeenCalledTimes(1);

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Booking canceled successfully');
      expect(response.body.data).toHaveProperty('canceled_booking');
      expect(response.body.data).toHaveProperty('credits_restored');
      expect(response.body.data).toHaveProperty('mock_exam_updated');
      expect(response.body.data.canceled_booking.reason).toBe('Personal emergency');
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      
      // We'd need to mock the rate limit middleware, but for now just test error handling
      mockHubSpot.searchContacts.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .delete('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(429);
    });
  });

  describe('Method Support', () => {
    it('should support GET method for booking details', async () => {
      mockHubSpot.searchContacts.mockResolvedValue(mockContact);
      mockHubSpot.apiCall.mockResolvedValue({ data: mockBooking });
      mockHubSpot.getMockExam.mockResolvedValue(mockExam);

      const response = await request(app)
        .get('/api/bookings/67890?student_id=STU123&email=john@example.com');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('booking');
      expect(response.body.data).toHaveProperty('mock_exam');
      expect(response.body.data).toHaveProperty('contact');
    });

    it('should reject unsupported methods', async () => {
      const response = await request(app)
        .put('/api/bookings/67890')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(404); // Express default for unsupported route
    });
  });
});
