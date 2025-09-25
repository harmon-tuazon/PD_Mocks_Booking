/**
 * Test Suite: GET /api/bookings/list
 * Purpose: Test the bookings list endpoint with authentication, filtering, and pagination
 */

const request = require('supertest');
const handler = require('../../../api/bookings/list');
const { HubSpotService } = require('../../../api/_shared/hubspot');

// Mock the HubSpotService
jest.mock('../../../api/_shared/hubspot');

// Create mock Express app for testing
function createMockApp(handler) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.get('/api/bookings/list', handler);
  return app;
}

describe('GET /api/bookings/list', () => {
  let mockHubSpotService;
  let app;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instance
    mockHubSpotService = {
      searchContacts: jest.fn(),
      getBookingsForContact: jest.fn()
    };
    
    // Mock the constructor
    HubSpotService.mockImplementation(() => mockHubSpotService);
    
    // Create test app
    app = createMockApp(handler);
  });

  describe('Authentication and Input Validation', () => {
    it('should return 400 for missing student_id', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('student_id');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid filter value', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'test@example.com',
          filter: 'invalid_filter'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when contact is not found', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication failed');
    });
  });

  describe('Successful Requests', () => {
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
        },
        {
          id: '1002',
          booking_id: 'BK1002',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'confirmed',
          created_at: '2024-01-02T14:00:00Z',
          mock_exam: {
            id: '5002',
            exam_date: '2024-12-30',
            mock_type: 'Clinical',
            location: 'Manchester Campus'
          }
        }
      ],
      total: 2,
      pagination: {
        page: 1,
        limit: 20,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    };

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(mockBookingsData);
    });

    it('should return bookings for authenticated user', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('bookings');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('credits');
      
      expect(response.body.data.bookings).toHaveLength(2);
      expect(response.body.data.credits).toEqual({
        sj_credits: 10,
        cs_credits: 5,
        sjmini_credits: 3,
        shared_mock_credits: 2
      });
    });

    it('should handle pagination parameters correctly', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          page: '2',
          limit: '10'
        });

      expect(response.status).toBe(200);
      expect(mockHubSpotService.getBookingsForContact).toHaveBeenCalledWith(
        '12345', // contact ID
        'all',   // filter
        2,       // page
        10       // limit
      );
    });

    it('should handle filter parameters correctly', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com',
          filter: 'upcoming'
        });

      expect(response.status).toBe(200);
      expect(mockHubSpotService.getBookingsForContact).toHaveBeenCalledWith(
        '12345',   // contact ID
        'upcoming', // filter
        1,         // page
        20         // limit
      );
    });

    it('should return empty bookings array when no bookings found', async () => {
      const emptyBookingsData = {
        bookings: [],
        total: 0,
        pagination: {
          page: 1,
          limit: 20,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      };
      
      mockHubSpotService.getBookingsForContact.mockResolvedValue(emptyBookingsData);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.bookings).toHaveLength(0);
      expect(response.body.data.pagination.total_pages).toBe(0);
    });

    it('should handle default values for optional parameters', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
          // No filter, page, or limit specified
        });

      expect(response.status).toBe(200);
      expect(mockHubSpotService.getBookingsForContact).toHaveBeenCalledWith(
        '12345', // contact ID
        'all',   // default filter
        1,       // default page
        20       // default limit
      );
    });
  });

  describe('Error Handling', () => {
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

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      const response = await request(app)
        .post('/api/bookings/list')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(405);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle HubSpot API errors gracefully', async () => {
      const hubspotError = new Error('HubSpot API error');
      hubspotError.status = 503;
      mockHubSpotService.getBookingsForContact.mockRejectedValue(hubspotError);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle unexpected server errors', async () => {
      mockHubSpotService.getBookingsForContact.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('OPTIONS Request Handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const response = await request(app)
        .options('/api/bookings/list');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Input Sanitization', () => {
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
      bookings: [],
      total: 0,
      pagination: {
        page: 1,
        limit: 20,
        total_pages: 0,
        has_next: false,
        has_previous: false
      }
    };

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(mockBookingsData);
    });

    it('should sanitize malicious input in student_id', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: '<script>alert("xss")</script>',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      // Verify that searchContacts was called with sanitized input
      expect(mockHubSpotService.searchContacts).toHaveBeenCalled();
      const [sanitizedStudentId] = mockHubSpotService.searchContacts.mock.calls[0];
      expect(sanitizedStudentId).not.toContain('<script>');
    });

    it('should sanitize malicious input in email', async () => {
      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com<script>alert("xss")</script>'
        });

      expect(response.status).toBe(400); // Should fail validation due to invalid email format
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle rate limiting middleware', async () => {
      // This test would require implementing rate limiting mock
      // For now, we verify the endpoint doesn't crash with legitimate requests
      const mockContact = {
        id: '12345',
        properties: { firstname: 'John', lastname: 'Doe', sj_credits: '10' }
      };
      const mockBookingsData = { bookings: [], total: 0, pagination: { page: 1, limit: 20 } };
      
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingsForContact.mockResolvedValue(mockBookingsData);

      const response = await request(app)
        .get('/api/bookings/list')
        .query({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
    });
  });
});
