const request = require('supertest');

// Mock the HubSpot service
jest.mock('../../api/_shared/hubspot', () => ({
  HubSpotService: jest.fn().mockImplementation(() => ({
    searchContacts: jest.fn().mockResolvedValue({
      id: 'contact-123',
      properties: {
        student_id: 'STU123456',
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        sj_credits: '3',
        cs_credits: '2',
        sjmini_credits: '1',
        shared_mock_credits: '2'
      }
    }),
    searchMockExams: jest.fn().mockResolvedValue({
      results: [
        {
          id: 'mock-exam-1',
          properties: {
            exam_date: '2025-02-01',
            capacity: '10',
            total_bookings: '3',
            mock_type: 'Situational Judgment',
            location: 'Test Location',
            is_active: 'true'
          }
        }
      ]
    }),
    checkExistingBooking: jest.fn().mockResolvedValue(false),
    createBooking: jest.fn().mockResolvedValue({
      id: 'booking-123',
      properties: {
        booking_id: 'John Doe - 2025-02-01'
      }
    }),
    getMockExam: jest.fn().mockResolvedValue({
      properties: {
        exam_date: '2025-02-01',
        capacity: '10',
        total_bookings: '3',
        mock_type: 'Situational Judgment',
        location: 'Test Location',
        is_active: 'true'
      }
    }),
    createAssociation: jest.fn().mockResolvedValue(true),
    updateMockExamBookings: jest.fn().mockResolvedValue(true),
    updateContactCredits: jest.fn().mockResolvedValue(true),
    searchEnrollments: jest.fn().mockResolvedValue({
      id: 'enrollment-123'
    }),
    apiCall: jest.fn().mockResolvedValue({
      properties: {
        student_id: 'STU123456',
        email: 'test@example.com',
        sj_credits: '3',
        cs_credits: '2',
        sjmini_credits: '1',
        shared_mock_credits: '2'
      }
    })
  })),
  HUBSPOT_OBJECTS: {
    contacts: '0-1',
    bookings: '2-50158943',
    mock_exams: '2-50158913',
    enrollments: '2-41701559'
  }
}));

describe('Booking Flow Integration Tests', () => {
  describe('GET /api/mock-exams/available', () => {
    it('should return available mock exams', async () => {
      const availableExams = require('../../api/mock-exams/available');

      const req = {
        method: 'GET',
        query: {
          mock_type: 'Situational Judgment',
          include_capacity: true
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await availableExams(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              mock_exam_id: 'mock-exam-1',
              exam_date: '2025-02-01',
              available_slots: 7
            })
          ])
        })
      );
    });

    it('should handle invalid mock type', async () => {
      const availableExams = require('../../api/mock-exams/available');

      const req = {
        method: 'GET',
        query: {
          mock_type: 'Invalid Type'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await availableExams(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /api/mock-exams/validate-credits', () => {
    it('should validate sufficient credits', async () => {
      const validateCredits = require('../../api/mock-exams/validate-credits');

      const req = {
        method: 'POST',
        body: {
          student_id: 'STU123456',
          email: 'test@example.com',
          mock_type: 'Situational Judgment'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await validateCredits(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            eligible: true,
            available_credits: 5, // 3 sj_credits + 2 shared_mock_credits
            credit_breakdown: {
              specific_credits: 3,
              shared_credits: 2
            }
          })
        })
      );
    });

    it('should handle insufficient credits', async () => {
      const { HubSpotService } = require('../../api/_shared/hubspot');

      // Mock insufficient credits
      HubSpotService.mockImplementationOnce(() => ({
        searchContacts: jest.fn().mockResolvedValue({
          id: 'contact-123',
          properties: {
            student_id: 'STU123456',
            email: 'test@example.com',
            sj_credits: '0',
            cs_credits: '0',
            shared_mock_credits: '0'
          }
        })
      }));

      const validateCredits = require('../../api/mock-exams/validate-credits');

      const req = {
        method: 'POST',
        body: {
          student_id: 'STU123456',
          email: 'test@example.com',
          mock_type: 'Situational Judgment'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await validateCredits(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            eligible: false,
            available_credits: 0
          })
        })
      );
    });
  });

  describe('POST /api/bookings/create', () => {
    it('should create a booking successfully', async () => {
      const createBooking = require('../../api/bookings/create');

      const req = {
        method: 'POST',
        body: {
          mock_exam_id: 'mock-exam-1',
          contact_id: 'contact-123',
          enrollment_id: 'enrollment-123',
          student_id: 'STU123456',
          name: 'John Doe',
          email: 'test@example.com',
          dominant_hand: true,
          mock_type: 'Situational Judgment',
          exam_date: '2025-02-01'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            booking_id: 'John Doe - 2025-02-01',
            booking_record_id: 'booking-123'
          })
        })
      );
    });

    it('should prevent duplicate bookings', async () => {
      const { HubSpotService } = require('../../api/_shared/hubspot');

      // Mock duplicate booking exists
      const mockService = {
        getMockExam: jest.fn().mockResolvedValue({
          properties: {
            is_active: 'true',
            capacity: '10',
            total_bookings: '3'
          }
        }),
        checkExistingBooking: jest.fn().mockResolvedValue(true) // Duplicate exists
      };

      HubSpotService.mockImplementationOnce(() => mockService);

      const createBooking = require('../../api/bookings/create');

      const req = {
        method: 'POST',
        body: {
          mock_exam_id: 'mock-exam-1',
          contact_id: 'contact-123',
          enrollment_id: 'enrollment-123',
          student_id: 'STU123456',
          name: 'John Doe',
          email: 'test@example.com',
          dominant_hand: true,
          mock_type: 'Situational Judgment',
          exam_date: '2025-02-01'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await createBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('already have a booking')
        })
      );
    });
  });

  describe('GET /api/bookings/my-bookings', () => {
    it('should return user bookings', async () => {
      const { HubSpotService } = require('../../api/_shared/hubspot');

      HubSpotService.mockImplementationOnce(() => ({
        searchContacts: jest.fn().mockResolvedValue({
          id: 'contact-123',
          properties: {
            student_id: 'STU123456',
            email: 'test@example.com',
            firstname: 'John',
            lastname: 'Doe',
            sj_credits: '3',
            cs_credits: '2',
            sjmini_credits: '1',
            shared_mock_credits: '2'
          }
        }),
        getContactBookings: jest.fn().mockResolvedValue([
          {
            id: 'booking-1',
            properties: {
              booking_id: 'John Doe - 2025-02-01',
              name: 'John Doe',
              email: 'test@example.com',
              dominant_hand: 'true',
              createdate: '2025-01-15T10:00:00Z'
            }
          }
        ]),
        apiCall: jest.fn().mockResolvedValue({
          results: []
        })
      }));

      const myBookings = require('../../api/bookings/my-bookings');

      const req = {
        method: 'GET',
        query: {
          student_id: 'STU123456',
          email: 'test@example.com'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      await myBookings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            student_info: expect.objectContaining({
              student_id: 'STU123456'
            }),
            bookings: expect.objectContaining({
              total: 1
            })
          })
        })
      );
    });
  });
});