/**
 * Test Suite: DELETE /api/bookings/[id]
 * Purpose: Test the booking cancellation endpoint with credit restoration
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
  app.delete('/api/bookings/:id', (req, res) => {
    req.query.id = req.params.id;
    return handler(req, res);
  });
  return app;
}

describe('DELETE /api/bookings/[id]', () => {
  let mockHubSpotService;
  let app;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instance
    mockHubSpotService = {
      searchContacts: jest.fn(),
      getBookingWithAssociations: jest.fn(),
      getMockExam: jest.fn(),
      restoreCredits: jest.fn(),
      decrementMockExamBookings: jest.fn(),
      deleteBooking: jest.fn(),
      createCancellationNote: jest.fn(),
      apiCall: jest.fn()
    };
    
    // Mock the constructor
    HubSpotService.mockImplementation(() => mockHubSpotService);
    
    // Create test app
    app = createMockApp(handler);
  });

  describe('Input Validation', () => {
    it('should return 400 for missing booking ID', async () => {
      const mockReq = {
        method: 'DELETE',
        query: {},
        body: {
          student_id: 'STU123',
          email: 'test@example.com'
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
        .delete('/api/bookings/12345')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('student_id');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .delete('/api/bookings/12345')
        .send({
          student_id: 'STU123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should accept optional reason parameter', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null); // Will fail auth, but validates input first

      const response = await request(app)
        .delete('/api/bookings/12345')
        .send({
          student_id: 'STU123',
          email: 'test@example.com',
          reason: 'Personal emergency'
        });

      expect(response.status).toBe(401); // Auth failure, not validation error
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when contact is not found', async () => {
      mockHubSpotService.searchContacts.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/bookings/12345')
        .send({
          student_id: 'STU123',
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication failed');
    });

    it('should return 403 when booking does not belong to user', async () => {
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
            '0-1': { // CONTACTS
              results: [
                { id: '99999' } // Different contact ID
              ]
            }
          }
        }
      };

      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Business Logic Validation', () => {
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
          '0-1': { // CONTACTS
            results: [{ id: '12345' }]
          },
          '2-50158913': { // MOCK_EXAMS
            results: [{ id: '90001' }]
          }
        }
      }
    };

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);
    });

    it('should return 404 when booking is not found', async () => {
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/bookings/99999')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Booking not found');
    });

    it('should return 409 when booking is already canceled', async () => {
      const canceledBooking = {
        data: {
          ...mockBookingResponse.data,
          properties: {
            ...mockBookingResponse.data.properties,
            status: 'canceled'
          }
        }
      };

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(canceledBooking);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already canceled');
    });

    it('should return 400 when no mock exam is associated', async () => {
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

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(bookingWithoutExam);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No mock exam associated');
    });

    it('should return 409 when exam is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const mockExamResponse = {
        data: {
          id: '90001',
          properties: {
            exam_date: pastDate.toISOString(),
            mock_type: 'SJT'
          }
        }
      };

      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot cancel bookings for past exams');
    });
  });

  describe('Successful Cancellation', () => {
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
          '0-1': { // CONTACTS
            results: [{ id: '12345' }]
          },
          '2-50158913': { // MOCK_EXAMS
            results: [{ id: '90001' }]
          },
          '0-3': { // DEALS
            results: [{ id: '70001' }]
          }
        }
      }
    };

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Next week

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

    beforeEach(() => {
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
    });

    it('should successfully cancel booking and restore credits', async () => {
      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com',
          reason: 'Schedule conflict'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('canceled_booking');
      expect(response.body.data).toHaveProperty('credits_restored');
      expect(response.body.data).toHaveProperty('mock_exam_updated');

      // Verify all operations were called
      expect(mockHubSpotService.restoreCredits).toHaveBeenCalledWith(
        '12345',
        'SJT',
        {
          sj_credits: 5,
          cs_credits: 3,
          sjmini_credits: 2,
          shared_mock_credits: 1
        }
      );
      expect(mockHubSpotService.decrementMockExamBookings).toHaveBeenCalledWith('90001');
      expect(mockHubSpotService.deleteBooking).toHaveBeenCalledWith('54321');
      expect(mockHubSpotService.createCancellationNote).toHaveBeenCalledWith(
        '70001',
        expect.objectContaining({
          booking_id: 'BK54321',
          mock_type: 'SJT',
          reason: 'Schedule conflict'
        })
      );
    });

    it('should successfully cancel booking without reason', async () => {
      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Verify cancellation note includes undefined reason
      expect(mockHubSpotService.createCancellationNote).toHaveBeenCalledWith(
        '70001',
        expect.objectContaining({
          booking_id: 'BK54321',
          mock_type: 'SJT'
          // reason should be undefined
        })
      );
    });

    it('should handle case where deal association is missing', async () => {
      const bookingWithoutDeal = {
        data: {
          ...mockBookingResponse.data,
          associations: {
            '0-1': { // CONTACTS
              results: [{ id: '12345' }]
            },
            '2-50158913': { // MOCK_EXAMS
              results: [{ id: '90001' }]
            }
            // No deal association
          }
        }
      };

      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(bookingWithoutDeal);

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      // Should not call createCancellationNote when no deal is associated
      expect(mockHubSpotService.createCancellationNote).not.toHaveBeenCalled();
    });

    it('should continue successfully even if cancellation note creation fails', async () => {
      mockHubSpotService.createCancellationNote.mockRejectedValue(new Error('Note creation failed'));

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Rollback Mechanism', () => {
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
          '2-50158913': { results: [{ id: '90001' }] }
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

    beforeEach(() => {
      mockHubSpotService.searchContacts.mockResolvedValue(mockContact);
      mockHubSpotService.getBookingWithAssociations.mockResolvedValue(mockBookingResponse);
      mockHubSpotService.getMockExam.mockResolvedValue(mockExamResponse);
    });

    it('should rollback credit restoration when mock exam update fails', async () => {
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount_restored: 1,
        new_balance: 6
      });
      mockHubSpotService.decrementMockExamBookings.mockRejectedValue(new Error('Mock exam update failed'));
      
      // Mock the rollback API call
      mockHubSpotService.apiCall.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      
      // Verify rollback was attempted
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: expect.stringContaining('/contacts/12345'),
          data: {
            properties: {
              sj_credits: 5 // Original value
            }
          }
        })
      );
    });

    it('should rollback both credit and exam updates when booking deletion fails', async () => {
      mockHubSpotService.restoreCredits.mockResolvedValue({
        credit_type: 'sj_credits',
        amount_restored: 1,
        new_balance: 6
      });
      mockHubSpotService.decrementMockExamBookings.mockResolvedValue({
        mock_exam_id: '90001',
        new_booking_count: 24
      });
      mockHubSpotService.deleteBooking.mockRejectedValue(new Error('Booking deletion failed'));
      
      // Mock the rollback API calls
      mockHubSpotService.apiCall.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      
      // Verify both rollbacks were attempted
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: expect.stringContaining('/contacts/12345')
        })
      );
      expect(mockHubSpotService.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: expect.stringContaining('/2-50158913/90001')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/bookings/12345')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      // This would need to be handled by the routing, but we test the handler directly
      const mockReq = {
        method: 'PATCH',
        query: { id: '12345' },
        body: { student_id: 'STU123', email: 'john@example.com' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should handle unexpected server errors', async () => {
      mockHubSpotService.searchContacts.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .delete('/api/bookings/54321')
        .send({
          student_id: 'STU123',
          email: 'john@example.com'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
