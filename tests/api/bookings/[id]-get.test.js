/**
 * Test Suite: GET /api/bookings/[id]
 * Purpose: Test the individual booking details endpoint
 */

const request = require('supertest');
const handler = require('../../../api/bookings/[id]');
const { HubSpotService } = require('../../../api/_shared/hubspot');

// Mock the HubSpotService
jest.mock('../../../api/_shared/hubspot');

// Create mock Express app for testing
function createMockApp(handler) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.get('/api/bookings/:id', (req, res) => {
    req.query.id = req.params.id;
    return handler(req, res);
  });
  return app;
}

describe('GET /api/bookings/[id]', () => {
  let mockHubSpotService;
  let app;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instance
    mockHubSpotService = {
      searchContacts: jest.fn(),
      apiCall: jest.fn(),
      getMockExam: jest.fn()
    };
    
    // Mock the constructor
    HubSpotService.mockImplementation(() => mockHubSpotService);
    
    // Create test app
    app = createMockApp(handler);
  });

  describe('Input Validation', () => {
    it('should return 400 for missing booking ID', async () => {
      const response = await request(app)
        .get('/api/bookings/')
        .query({
          student_id: 'STU123',
          email: 'test@example.com'
        });

      // This will hit a different route, but we test the handler directly
      const mockReq = {
        method: 'GET',
        query: {
          student_id: 'STU123',
          email: 'test@example.com'
          // No booking ID
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Booking ID is required')
        })
      );
    });

    it('should return 400 for missing student_id', async () => {
      const response = await request(app)
        .get('/api/bookings/12345')
        .query({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('student_id');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .get('/api/bookings/12345')
        .query({
          student_id: 'STU123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 401 when contact is not found', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/12345')
        .query({
          student_id: 'STU123',
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication failed');
    });
  });

  describe('Booking Access Control', () => {
    const mockContact = {
      id: '12345',
      properties: {
        firstname: 'John',
        lastname: 'Doe',
        student_id: 'STU123'
      }
    };

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
    });

    it('should return 404 when booking is not found', async () => {
      mockHubSpotService.apiCall.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/99999')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Booking not found');
    });

    it('should return 403 when booking does not belong to user', async () => {
      const mockBookingResponse = {
        data: {
          id: '54321',
          properties: {
            booking_id: 'BK54321',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'confirmed'
          },
          associations: {
            '0-1': { // CONTACTS
              results: [
                { id: '99999' } // Different contact ID
              ]
            }
          }
        }
      };

      mockHubSpotService.apiCall.mockResolvedValue(mockBookingResponse);

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Successful Booking Retrieval', () => {
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
          '0-1': { // CONTACTS
            results: [
              { id: '12345' }
            ]
          },
          '2-50158913': { // MOCK_EXAMS
            results: [
              { id: '90001' }
            ]
          },
          '2-41701559': { // ENROLLMENTS
            results: [
              { id: '80001' }
            ]
          }
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
          address: '123 London St, London',
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

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.apiCall
        .mockResolvedValueOnce(mockBookingResponse) // First call for booking
        .mockResolvedValueOnce(mockEnrollmentResponse); // Third call for enrollment
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);
    });

    it('should return complete booking details with all associations', async () => {
      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const { data } = response.body;
      
      // Verify booking details
      expect(data).toHaveProperty('booking');
      expect(data.booking).toEqual({
        id: '54321',
        booking_id: 'BK54321',
        name: 'John Doe',
        email: 'john@example.com',
        dominant_hand: true,
        status: 'confirmed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      });
      
      // Verify mock exam details
      expect(data).toHaveProperty('mock_exam');
      expect(data.mock_exam).toEqual({
        id: '90001',
        exam_date: '2024-12-25',
        mock_type: 'SJT',
        location: 'London Campus',
        capacity: 50,
        total_bookings: 25,
        address: '123 London St, London',
        start_time: '09:00',
        end_time: '17:00'
      });
      
      // Verify contact details
      expect(data).toHaveProperty('contact');
      expect(data.contact).toEqual({
        id: '12345',
        firstname: 'John',
        lastname: 'Doe',
        student_id: 'STU123'
      });
      
      // Verify enrollment details
      expect(data).toHaveProperty('enrollment');
      expect(data.enrollment).toEqual({
        id: '80001',
        enrollment_id: 'ENR80001',
        course_id: 'COURSE123',
        enrollment_status: 'active'
      });
    });

    it('should handle missing mock exam association gracefully', async () => {
      const bookingWithoutExam = {
        data: {
          ...mockBookingResponse.data,
          associations: {
            '0-1': { // CONTACTS
              results: [{ id: '12345' }]
            }
            // No mock exam association
          }
        }
      };

      mockHubSpotService.apiCall.mockResolvedValueOnce(bookingWithoutExam);

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.mock_exam).toBeNull();
    });

    it('should handle missing enrollment association gracefully', async () => {
      const bookingWithoutEnrollment = {
        data: {
          ...mockBookingResponse.data,
          associations: {
            '0-1': { // CONTACTS
              results: [{ id: '12345' }]
            },
            '2-50158913': { // MOCK_EXAMS
              results: [{ id: '90001' }]
            }
            // No enrollment association
          }
        }
      };

      mockHubSpotService.apiCall.mockResolvedValueOnce(bookingWithoutEnrollment);

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enrollment).toBeNull();
    });

    it('should handle API errors when fetching associations', async () => {
      mockHubSpotService.getMockExam.mockRejectedValue(new Error('Mock exam API error'));
      mockHubSpotService.apiCall
        .mockResolvedValueOnce(mockBookingResponse) // Booking fetch succeeds
        .mockRejectedValue(new Error('Enrollment API error')); // Enrollment fetch fails

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
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const response = await request(app)
        .post('/api/bookings/12345')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(405);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle unexpected server errors', async () => {
      const mockContact = {
        id: '12345',
        properties: { firstname: 'John', lastname: 'Doe' }
      };
      
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.apiCall.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/bookings/54321')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Input Sanitization', () => {
    const mockContact = {
      id: '12345',
      properties: { firstname: 'John', lastname: 'Doe' }
    };

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.apiCall.mockResolvedValue(null); // Will return 404, but that's fine for sanitization test
    });

    it('should sanitize malicious input in booking ID', async () => {
      const response = await request(app)
        .get('/api/bookings/<script>alert("xss")</script>')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      // Should not crash the server
      expect(response.status).toBe(404); // Will be 404 because booking doesn't exist, but that's expected
    });

    it('should sanitize malicious input in student_id', async () => {
      const response = await request(app)
        .get('/api/bookings/12345')
        .query({
          student_id: '<script>alert("xss")</script>',
          email: 'john@example.com'
        });

      // Verify that searchContacts was called with sanitized input
      expect(mockHubSpotService.searchContacts).toHaveBeenCalled();
      const [sanitizedStudentId] = mockHubSpotService.searchContacts.mock.calls[0];
      expect(sanitizedStudentId).not.toContain('<script>');
    });
  });
});
