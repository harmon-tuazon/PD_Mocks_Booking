// Mock the HubSpot service before requiring the handler
jest.mock('../../../api/_shared/hubspot', () => {
  return {
    HubSpotService: jest.fn().mockImplementation(() => ({
      createBooking: jest.fn(),
      associateBookingWithContact: jest.fn(),
      associateBookingWithMockExam: jest.fn(),
      deductToken: jest.fn()
    })),
    HUBSPOT_OBJECTS: {
      bookings: '2-50158943',
      mockExams: '2-50158913',
      contacts: '0-1'
    }
  };
});

const { HubSpotService } = require('../../../api/_shared/hubspot');

describe('POST /api/bookings/create', () => {
  let mockHubSpotService;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock HubSpot service instance
    mockHubSpotService = {
      createBooking: jest.fn(),
      associateBookingWithContact: jest.fn(),
      associateBookingWithMockExam: jest.fn(),
      deductToken: jest.fn()
    };

    HubSpotService.mockImplementation(() => mockHubSpotService);

    // Setup mock request and response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Clinical Skills bookings', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          contact_id: '123456',
          mock_exam_id: '789012',
          student_id: '1598999',
          name: 'Test Student',
          email: 'test@example.com',
          exam_date: '2025-10-15',
          mock_type: 'Clinical Skills',
          dominant_hand: true
        }
      };
    });

    test('should create booking with dominant_hand field', async () => {
      // Mock successful HubSpot operations
      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockResolvedValue({});
      mockHubSpotService.associateBookingWithMockExam.mockResolvedValue({});
      mockHubSpotService.deductToken.mockResolvedValue({});

      // Import and call handler
      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      // Verify createBooking was called with dominant_hand
      expect(mockHubSpotService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          dominantHand: true
        })
      );

      // Verify successful response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should handle dominant_hand=false', async () => {
      mockRequest.body.dominant_hand = false;

      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockResolvedValue({});
      mockHubSpotService.associateBookingWithMockExam.mockResolvedValue({});
      mockHubSpotService.deductToken.mockResolvedValue({});

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockHubSpotService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          dominantHand: false
        })
      );
    });

    test('should reject Clinical Skills booking without dominant_hand', async () => {
      delete mockRequest.body.dominant_hand;

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Dominant hand')
        })
      );
    });

    test('should reject Clinical Skills booking with attending_location', async () => {
      mockRequest.body.attending_location = 'mississauga';

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('only applicable')
        })
      );
    });
  });

  describe('Situational Judgment bookings', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          contact_id: '123456',
          mock_exam_id: '789012',
          student_id: '1598999',
          name: 'Test Student',
          email: 'test@example.com',
          exam_date: '2025-10-15',
          mock_type: 'Situational Judgment',
          attending_location: 'mississauga'
        }
      };
    });

    test('should create booking with attending_location field', async () => {
      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockResolvedValue({});
      mockHubSpotService.associateBookingWithMockExam.mockResolvedValue({});
      mockHubSpotService.deductToken.mockResolvedValue({});

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockHubSpotService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          attendingLocation: 'mississauga'
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should accept all valid locations', async () => {
      const validLocations = [
        'mississauga',
        'calgary',
        'vancouver',
        'montreal',
        'richmond_hill'
      ];

      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockResolvedValue({});
      mockHubSpotService.associateBookingWithMockExam.mockResolvedValue({});
      mockHubSpotService.deductToken.mockResolvedValue({});

      for (const location of validLocations) {
        jest.clearAllMocks();
        mockRequest.body.attending_location = location;

        const handler = require('../../../api/bookings/create');
        await handler(mockRequest, mockResponse);

        expect(mockHubSpotService.createBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            attendingLocation: location
          })
        );
      }
    });

    test('should reject SJ booking without attending_location', async () => {
      delete mockRequest.body.attending_location;

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    test('should reject SJ booking with invalid location', async () => {
      mockRequest.body.attending_location = 'invalid_city';

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    test('should reject SJ booking with dominant_hand', async () => {
      mockRequest.body.dominant_hand = true;

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Mini-mock bookings', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          contact_id: '123456',
          mock_exam_id: '789012',
          student_id: '1598999',
          name: 'Test Student',
          email: 'test@example.com',
          exam_date: '2025-10-15',
          mock_type: 'Mini-mock',
          attending_location: 'calgary'
        }
      };
    });

    test('should create Mini-mock booking with attending_location', async () => {
      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockResolvedValue({});
      mockHubSpotService.associateBookingWithMockExam.mockResolvedValue({});
      mockHubSpotService.deductToken.mockResolvedValue({});

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockHubSpotService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          attendingLocation: 'calgary'
        })
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should reject Mini-mock booking without attending_location', async () => {
      delete mockRequest.body.attending_location;

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          contact_id: '123456',
          mock_exam_id: '789012',
          student_id: '1598999',
          name: 'Test Student',
          email: 'test@example.com',
          exam_date: '2025-10-15',
          mock_type: 'Clinical Skills',
          dominant_hand: true
        }
      };
    });

    test('should handle HubSpot API errors gracefully', async () => {
      mockHubSpotService.createBooking.mockRejectedValue(
        new Error('HubSpot API Error')
      );

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    test('should handle association errors', async () => {
      mockHubSpotService.createBooking.mockResolvedValue({
        id: 'booking-123',
        properties: {}
      });
      mockHubSpotService.associateBookingWithContact.mockRejectedValue(
        new Error('Association failed')
      );

      const handler = require('../../../api/bookings/create');
      await handler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
