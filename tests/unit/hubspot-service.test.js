// Mock axios before requiring HubSpotService
jest.mock('axios');
const axios = require('axios');

const { HubSpotService } = require('../../api/_shared/hubspot');

describe('HubSpotService - Booking Operations', () => {
  let hubspotService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HS_PRIVATE_APP_TOKEN = 'test-token-12345';
    hubspotService = new HubSpotService();
  });

  describe('createBooking with conditional fields', () => {
    test('should include dominant_hand for Clinical Skills bookings', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        tokenUsed: 'CS-TOKEN-123',
        dominantHand: true
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            properties: expect.objectContaining({
              booking_id: 'BOOK-12345',
              name: 'Test Student',
              email: 'test@example.com',
              token_used: 'CS-TOKEN-123',
              dominant_hand: 'true',
              is_active: 'Active'
            })
          })
        })
      );
    });

    test('should include dominant_hand=false correctly', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        dominantHand: false
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            properties: expect.objectContaining({
              dominant_hand: 'false'
            })
          })
        })
      );
    });

    test('should include attending_location for location-based exams', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        tokenUsed: 'SJ-TOKEN-123',
        attendingLocation: 'mississauga'
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            properties: expect.objectContaining({
              booking_id: 'BOOK-12345',
              attending_location: 'mississauga'
            })
          })
        })
      );
    });

    test('should handle all valid locations', async () => {
      const validLocations = [
        'mississauga',
        'calgary',
        'vancouver',
        'montreal',
        'richmond_hill'
      ];

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      for (const location of validLocations) {
        jest.clearAllMocks();

        const bookingData = {
          bookingId: 'BOOK-12345',
          name: 'Test Student',
          email: 'test@example.com',
          attendingLocation: location
        };

        await hubspotService.createBooking(bookingData);

        expect(axios).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              properties: expect.objectContaining({
                attending_location: location
              })
            })
          })
        );
      }
    });

    test('should not include conditional fields when not provided', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com'
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      const callArgs = axios.mock.calls[0][0];
      const properties = callArgs.data.properties;

      expect(properties).not.toHaveProperty('dominant_hand');
      expect(properties).not.toHaveProperty('attending_location');
    });

    test('should handle both optional fields separately', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        tokenUsed: 'TOKEN-123'
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      // Test with only dominant_hand
      await hubspotService.createBooking({
        ...bookingData,
        dominantHand: true
      });

      let callArgs = axios.mock.calls[0][0];
      expect(callArgs.data.properties).toHaveProperty('dominant_hand', 'true');
      expect(callArgs.data.properties).not.toHaveProperty('attending_location');

      jest.clearAllMocks();

      // Test with only attending_location
      await hubspotService.createBooking({
        ...bookingData,
        attendingLocation: 'calgary'
      });

      callArgs = axios.mock.calls[0][0];
      expect(callArgs.data.properties).toHaveProperty('attending_location', 'calgary');
      expect(callArgs.data.properties).not.toHaveProperty('dominant_hand');
    });

    test('should include token_used when provided', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        tokenUsed: 'SJ-TOKEN-123',
        attendingLocation: 'vancouver'
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            properties: expect.objectContaining({
              token_used: 'SJ-TOKEN-123',
              attending_location: 'vancouver'
            })
          })
        })
      );
    });

    test('should not include token_used when not provided', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com',
        dominantHand: false
      };

      axios.mockResolvedValue({
        data: { id: 'booking-123', properties: {} }
      });

      await hubspotService.createBooking(bookingData);

      const callArgs = axios.mock.calls[0][0];
      const properties = callArgs.data.properties;

      expect(properties).not.toHaveProperty('token_used');
      expect(properties).toHaveProperty('dominant_hand', 'false');
    });
  });

  describe('HubSpot API error handling', () => {
    test('should handle network errors', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com'
      };

      axios.mockRejectedValue(new Error('Network error'));

      await expect(hubspotService.createBooking(bookingData)).rejects.toThrow(
        'Network error'
      );
    });

    test('should handle API rate limit errors', async () => {
      const bookingData = {
        bookingId: 'BOOK-12345',
        name: 'Test Student',
        email: 'test@example.com'
      };

      axios.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      });

      await expect(hubspotService.createBooking(bookingData)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });
});
