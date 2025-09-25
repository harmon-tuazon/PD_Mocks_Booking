/**
 * Integration Tests: My Bookings Feature
 * Tests the complete integration between frontend components and backend APIs
 */

const request = require('supertest');
const { HubSpotService } = require('../../api/_shared/hubspot');

// Mock HubSpot Service
jest.mock('../../api/_shared/hubspot');

// Create test server with all booking endpoints
const express = require('express');
const cors = require('cors');
const listHandler = require('../../api/bookings/list');
const detailsHandler = require('../../api/bookings/[id]');

function createTestServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mount booking endpoints
  app.get('/api/bookings/list', listHandler);
  app.get('/api/bookings/:id', (req, res) => {
    req.query.id = req.params.id;
    return detailsHandler(req, res);
  });
  app.delete('/api/bookings/:id', (req, res) => {
    req.query.id = req.params.id;
    return detailsHandler(req, res);
  });

  return app;
}

describe('My Bookings Integration Tests', () => {
  let app;
  let mockHubSpotService;

  beforeEach(() => {
    app = createTestServer();
    jest.clearAllMocks();

    mockHubSpotService = {
      searchContacts: jest.fn(),
      getBookingsForContact: jest.fn(),
      apiCall: jest.fn(),
      getMockExam: jest.fn(),
      getBookingWithAssociations: jest.fn(),
      restoreCredits: jest.fn(),
      decrementMockExamBookings: jest.fn(),
      deleteBooking: jest.fn(),
      createCancellationNote: jest.fn()
    };

    HubSpotService.mockImplementation(() => mockHubSpotService);
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user and load bookings list', async () => {
      const mockContact = {
        id: '12345',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          sj_credits: '10',
          cs_credits: '5',
          sjmini_credits: '3',
          shared_mock_credits: '2'
        }
      };

      const mockBookingsData = {
        bookings: [
          {
            id: '1001',
            booking_id: 'BK1001',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'confirmed',
            created_at: '2024-01-01T10:00:00Z',
            mock_exam: {
              id: '5001',
              exam_date: '2024-12-25',
              mock_type: 'SJT',
              location: 'London Campus'
            }
          }
        ],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(mockBookingsData);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bookings).toHaveLength(1);
      expect(response.body.data.bookings[0]).toMatchObject({
        id: '1001',
        booking_id: 'BK1001',
        status: 'confirmed'
      });
      expect(response.body.data.credits).toEqual({
        sj_credits: 10,
        cs_credits: 5,
        sjmini_credits: 3,
        shared_mock_credits: 2
      });
    });

    it('should handle authentication failure', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'INVALID123',
          email: 'invalid@example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication failed');
    });
  });

  describe('Booking Details Workflow', () => {
    it('should fetch complete booking details with associations', async () => {
      const mockContact = {
        id: '12345',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          student_id: 'STU123'
        }
      };

      const mockBookingResponse = {
        data: {
          id: '54321',
          properties: {
            booking_id: 'BK54321',
            name: 'John Doe',
            email: 'john@example.com',
            dominant_hand: 'true',
            status: 'confirmed',
            createdate: '2024-01-01T10:00:00Z',
            hs_lastmodifieddate: '2024-01-01T10:00:00Z'
          },
          associations: {
            '0-1': { results: [{ id: '12345' }] },
            '2-50158913': { results: [{ id: '90001' }] },
            '2-41701559': { results: [{ id: '80001' }] }
          }
        }
      };

      const mockExamResponse = {
        data: {
          id: '90001',
          properties: {
            exam_date: '2024-12-25',
            mock_type: 'SJT',
            location: 'London Campus',
            capacity: '50',
            total_bookings: '25',
            address: '123 London St',
            start_time: '09:00',
            end_time: '17:00'
          }
        }
      };

      const mockEnrollmentResponse = {
        data: {
          id: '80001',
          properties: {
            enrollment_id: 'ENR80001',
            course_id: 'COURSE123',
            enrollment_status: 'active'
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.apiCall
        .mockResolvedValueOnce(mockBookingResponse)
        .mockResolvedValueOnce(mockEnrollmentResponse);
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const { data } = response.body;
      expect(data.booking).toMatchObject({
        id: '54321',
        booking_id: 'BK54321',
        name: 'John Doe',
        dominant_hand: true,
        status: 'confirmed'
      });
      
      expect(data.mock_exam).toMatchObject({
        id: '90001',
        exam_date: '2024-12-25',
        mock_type: 'SJT',
        location: 'London Campus',
        capacity: 50,
        total_bookings: 25
      });
      
      expect(data.enrollment).toMatchObject({
        id: '80001',
        enrollment_id: 'ENR80001',
        course_id: 'COURSE123'
      });
    });
  });

  describe('Booking Cancellation Workflow', () => {
    it('should successfully cancel booking and restore credits', async () => {
      const mockContact = {
        id: '12345',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          sj_credits: '5',
          cs_credits: '3',
          sjmini_credits: '2',
          shared_mock_credits: '1'
        }
      };

      const mockBookingResponse = {
        data: {
          id: '54321',
          properties: {
            booking_id: 'BK54321',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: '12345' }] },
            '2-50158913': { results: [{ id: '90001' }] },
            '0-3': { results: [{ id: '70001' }] }
          }
        }
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockExamResponse = {
        data: {
          id: '90001',
          properties: {
            exam_date: futureDate.toISOString(),
            mock_type: 'SJT',
            total_bookings: '25'
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount_restored: 1,
        new_balance: 6
      });
      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        mock_exam_id: '90001',
        new_booking_count: 24
      });
      mockHubSpotService.deleteBooking.mockResolvedValue({ success: true });
      mockHubSpotService.createCancellationNote.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com',
          reason: 'Schedule conflict'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const { data } = response.body;
      expect(data.canceled_booking).toMatchObject({
        booking_id: 'BK54321',
        mock_type: 'SJT',
        reason: 'Schedule conflict'
      });
      
      expect(data.credits_restored).toMatchObject({
        credit_type: 'sj_credits',
        amount_restored: 1,
        new_balance: 6
      });

      // Verify all operations were called in order
      expect(mockHubSpotService.restoreCredits).toHaveBeenCalledWith(
        '12345',
        'SJT',
        expect.objectContaining({
          sj_credits: 5,
          cs_credits: 3
        })
      );
      expect(mockHubSpotService.decrementMockExamBookings).toHaveBeenCalledWith('90001');
      expect(mockHubSpotService.deleteBooking).toHaveBeenCalledWith('54321');
      expect(mockHubSpotService.createCancellationNote).toHaveBeenCalledWith(
        '70001',
        expect.objectContaining({
          booking_id: 'BK54321',
          reason: 'Schedule conflict'
        })
      );
    });

    it('should prevent cancellation of past exams', async () => {
      const mockContact = {
        id: '12345',
        properties: {
          firstname: 'John',
          lastname: 'Doe'
        }
      };

      const mockBookingResponse = {
        data: {
          id: '54321',
          properties: {
            booking_id: 'BK54321',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: '12345' }] },
            '2-50158913': { results: [{ id: '90001' }] }
          }
        }
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockExamResponse = {
        data: {
          id: '90001',
          properties: {
            exam_date: pastDate.toISOString(),
            mock_type: 'SJT'
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot cancel bookings for past exams');
      
      // Verify no operations were performed
      expect(mockHubSpotService.restoreCredits).not.toHaveBeenCalled();
      expect(mockHubSpotService.deleteBooking).not.toHaveBeenCalled();
    });
  });

  describe('Filtering and Pagination', () => {
    it('should filter bookings by status', async () => {
      const mockContact = {
        id: '12345',
        properties: {
          firstname: 'John',
          lastname: 'Doe',
          sj_credits: '10'
        }
      };

      const upcomingBookingsData = {
        bookings: [
          {
            id: '1001',
            booking_id: 'BK1001',
            status: 'scheduled',
            mock_exam: {
              exam_date: '2024-12-25',
              mock_type: 'SJT'
            }
          }
        ],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          total_pages: 1
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(upcomingBookingsData);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          filter: 'upcoming'
        });

      expect(response.status).toBe(200);
      expect(mockHubSpotService.getBookingsForContact).toHaveBeenCalledWith(
        '12345',
        'upcoming',
        1,
        20
      );
    });

    it('should handle pagination correctly', async () => {
      const mockContact = {
        id: '12345',
        properties: { firstname: 'John', lastname: 'Doe' }
      };

      const paginatedData = {
        bookings: [],
        total: 50,
        pagination: {
          page: 2,
          limit: 10,
          total_pages: 5,
          has_next: true,
          has_previous: true
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(paginatedData);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          page: '2',
          limit: '10'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total_pages: 5,
        has_next: true,
        has_previous: true
      });
      
      expect(mockHubSpotService.getBookingsForContact).toHaveBeenCalledWith(
        '12345',
        'all',
        2,
        10
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle HubSpot API errors gracefully', async () => {
      mockHubSpotService.searchContacts.mockRejectedValue(
        new Error('HubSpot API temporarily unavailable')
      );

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('HubSpot API temporarily unavailable');
    });

    it('should handle missing associations gracefully', async () => {
      const mockContact = {
        id: '12345',
        properties: { firstname: 'John', lastname: 'Doe' }
      };

      const bookingWithoutAssociations = {
        data: {
          id: '54321',
          properties: {
            booking_id: 'BK54321',
            status: 'confirmed'
          },
          associations: {
            '0-1': { results: [{ id: '12345' }] }
            // Missing mock exam and enrollment associations
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.apiCall.mockResolvedValue(bookingWithoutAssociations);

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.mock_exam).toBeNull();
      expect(response.body.data.enrollment).toBeNull();
    });

    it('should handle rollback on cancellation failure', async () => {
      const mockContact = {
        id: '12345',
        properties: { sj_credits: '5' }
      };

      const mockBookingResponse = {
        data: {
          id: '54321',
          properties: { booking_id: 'BK54321', status: 'confirmed' },
          associations: {
            '0-1': { results: [{ id: '12345' }] },
            '2-50158913': { results: [{ id: '90001' }] }
          }
        }
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const mockExamResponse = {
        data: {
          properties: {
            exam_date: futureDate.toISOString(),
            mock_type: 'SJT',
            total_bookings: '25'
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount_restored: 1
      });
      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({});
      mockHubSpotService.deleteBooking.mockRejectedValue(
        new Error('Booking deletion failed')
      );
      // Mock rollback API call
      mockHubSpotService.apiCall.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      
      // Verify rollback was attempted
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: expect.stringContaining('/contacts/12345'),
          data: { properties: { sj_credits: 5 } }
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields for listing', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123'
          // Missing email
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'invalid-email-format'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          page: 'invalid',
          limit: '-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate filter values', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          filter: 'invalid_filter'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockContact = {
        id: '12345',
        properties: { firstname: 'John', lastname: 'Doe' }
      };

      const mockBookingsData = {
        bookings: [],
        total: 0,
        pagination: { page: 1, limit: 20, total_pages: 0 }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(mockBookingsData);

      // Make 5 concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/bookings/list')
          .query({
            student_id: 'STU123',
            email: 'john@example.com'
          })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify efficient caching or handling
      expect(mockHubSpotService.searchContacts).toHaveBeenCalledTimes(5);
    });
  });
});
