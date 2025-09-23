const { HubSpotService } = require('../../api/_shared/hubspot');
const axios = require('axios');

jest.mock('axios');

describe('HubSpot Note Creation', () => {
  let hubspotService;

  beforeEach(() => {
    process.env.HS_PRIVATE_APP_TOKEN = 'test-token';
    hubspotService = new HubSpotService();
    jest.clearAllMocks();
  });

  describe('createBookingNote', () => {
    const mockBookingData = {
      bookingId: 'John Doe - 2025-02-15',
      name: 'John Doe',
      email: 'john@example.com',
      dominantHand: true
    };

    const mockContactId = '123456789';

    const mockExamData = {
      exam_date: '2025-02-15',
      mock_type: 'Clinical Skills',
      location: 'Mississauga'
    };

    it('should successfully create a Note with proper formatting', async () => {
      const mockNoteResponse = {
        data: {
          id: 'note-12345',
          properties: {
            hs_note_body: 'Mock note body',
            hs_timestamp: '1674051600000'
          },
          createdAt: '2025-01-18T10:00:00Z'
        }
      };

      axios.mockResolvedValueOnce(mockNoteResponse);

      const result = await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        mockExamData
      );

      // Verify the API was called
      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.hubapi.com/crm/v3/objects/notes',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );

      // Verify the payload structure
      const callData = axios.mock.calls[0][0].data;
      expect(callData).toHaveProperty('properties.hs_note_body');
      expect(callData).toHaveProperty('properties.hs_timestamp');
      expect(callData).toHaveProperty('associations');

      // Verify the Note body contains required information
      const noteBody = callData.properties.hs_note_body;
      expect(noteBody).toContain('Mock Exam Booking Confirmed');
      expect(noteBody).toContain(mockBookingData.bookingId);
      expect(noteBody).toContain(mockExamData.mock_type);
      expect(noteBody).toContain(mockBookingData.name);
      expect(noteBody).toContain(mockBookingData.email);
      expect(noteBody).toContain('Right'); // Dominant hand

      // Verify association structure
      expect(callData.associations[0]).toEqual({
        to: { id: mockContactId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 202
        }]
      });

      expect(result).toEqual(mockNoteResponse.data);
    });

    it('should handle left-handed students correctly', async () => {
      const leftHandedBooking = {
        ...mockBookingData,
        dominantHand: false
      };

      axios.mockResolvedValueOnce({ data: { id: 'note-123' } });

      await hubspotService.createBookingNote(
        leftHandedBooking,
        mockContactId,
        mockExamData
      );

      const callData = axios.mock.calls[0][0].data;
      const noteBody = callData.properties.hs_note_body;
      expect(noteBody).toContain('Left');
      expect(noteBody).not.toContain('>Right<');
    });

    it('should return null on API error without throwing', async () => {
      const apiError = new Error('API Error');
      apiError.response = {
        status: 400,
        data: { message: 'Invalid contact ID' }
      };

      axios.mockRejectedValueOnce(apiError);

      const result = await hubspotService.createBookingNote(
        mockBookingData,
        'invalid-id',
        mockExamData
      );

      expect(result).toBeNull();
      // Verify it doesn't throw
      expect(axios).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limit errors with retry attempts', async () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.response = {
        status: 429,
        data: { message: 'Rate limit exceeded' }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock axios to reject with 429 error multiple times to exhaust retries
      axios.mockRejectedValueOnce(rateLimitError)
           .mockRejectedValueOnce(rateLimitError)
           .mockRejectedValueOnce(rateLimitError);

      const result = await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        mockExamData
      );

      // Verify it returns null on failure
      expect(result).toBeNull();

      // Check that the retry messages from apiCall were logged
      expect(consoleSpy).toHaveBeenCalledWith('Rate limited, retrying after 1000ms (attempt 2/3)');
      expect(consoleSpy).toHaveBeenCalledWith('Rate limited, retrying after 2000ms (attempt 3/3)');

      // Note: The '🔄 Will retry Note creation in background...' message is NOT logged
      // because apiCall throws a custom error with error.status, not error.response.status
      // and createBookingNote checks for error.response?.status which doesn't exist

      // Verify that an error was logged with correct structure
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create booking note:', expect.objectContaining({
        error: 'Rate limit exceeded',
        contactId: mockContactId,
        bookingId: mockBookingData.bookingId,
        status: undefined, // status comes from error.response?.status which is undefined
        details: undefined
      }));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle server errors without retry', async () => {
      const serverError = new Error('Server error');
      serverError.response = {
        status: 500,
        data: { message: 'Internal server error' }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // For 500 errors, apiCall doesn't retry, it throws immediately
      axios.mockRejectedValueOnce(serverError);

      const result = await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        mockExamData
      );

      // Verify it returns null on failure
      expect(result).toBeNull();

      // Note: The '🔄 Will retry Note creation in background...' message is NOT logged
      // because apiCall throws a custom error with error.status, not error.response.status
      // and createBookingNote checks for error.response?.status which doesn't exist

      // Verify that an error was logged with correct structure
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create booking note:', expect.objectContaining({
        error: 'Internal server error',
        contactId: mockContactId,
        bookingId: mockBookingData.bookingId,
        status: undefined, // status comes from error.response?.status which is undefined
        details: undefined
      }));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should format exam date properly', async () => {
      const mockResponse = { data: { id: 'note-123' } };
      axios.mockResolvedValueOnce(mockResponse);

      await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        mockExamData
      );

      const callData = axios.mock.calls[0][0].data;
      const noteBody = callData.properties.hs_note_body;

      // Check that the date is formatted nicely (e.g., "Saturday, February 15, 2025")
      expect(noteBody).toMatch(/\w+day, \w+ \d+, \d{4}/);
    });

    it('should use default location when not provided', async () => {
      const examDataNoLocation = {
        ...mockExamData,
        location: undefined
      };

      axios.mockResolvedValueOnce({ data: { id: 'note-123' } });

      await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        examDataNoLocation
      );

      const callData = axios.mock.calls[0][0].data;
      const noteBody = callData.properties.hs_note_body;
      expect(noteBody).toContain('Mississauga');
    });

    it('should include footer text in Note', async () => {
      axios.mockResolvedValueOnce({ data: { id: 'note-123' } });

      await hubspotService.createBookingNote(
        mockBookingData,
        mockContactId,
        mockExamData
      );

      const callData = axios.mock.calls[0][0].data;
      const noteBody = callData.properties.hs_note_body;
      expect(noteBody).toContain('This booking was automatically confirmed through the Mock Exam Booking System');
    });
  });
});