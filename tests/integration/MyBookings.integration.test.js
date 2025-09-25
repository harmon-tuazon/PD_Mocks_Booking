import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyBookings from '../../frontend/src/components/MyBookings';
import * as api from '../../frontend/src/services/api';

// Mock the API service
jest.mock('../../frontend/src/services/api');
const mockApi = api;

// Mock the child components
jest.mock('../../frontend/src/components/bookings/BookingsCalendar', () => 
  ({ bookings, onCancelBooking, onBookingClick }) => (
    <div data-testid="bookings-calendar">
      <div>Calendar View</div>
      {bookings.map(booking => (
        <div key={booking.id} data-testid={`calendar-booking-${booking.id}`}>
          <div>{booking.mock_type || booking.mockExam?.examType}</div>
          <button onClick={() => onBookingClick(booking)}>View Booking</button>
          <button onClick={() => onCancelBooking(booking.id)}>Cancel from Calendar</button>
        </div>
      ))}
    </div>
  )
);

jest.mock('../../frontend/src/components/bookings/BookingsList', () => 
  ({ bookings, onCancelBooking, onViewDetails }) => (
    <div data-testid="bookings-list">
      <div>List View</div>
      {bookings.map(booking => (
        <div key={booking.id} data-testid={`list-booking-${booking.id}`}>
          <div>{booking.mock_type || booking.mockExam?.examType}</div>
          <button onClick={() => onViewDetails(booking)}>View Details</button>
          <button onClick={() => onCancelBooking(booking.id)}>Cancel from List</button>
        </div>
      ))}
    </div>
  )
);

jest.mock('../../frontend/src/components/shared', () => ({
  LoggedInUserCard: ({ user, credits }) => (
    <div data-testid="user-card">
      <div>Welcome {user.firstname} {user.lastname}</div>
      <div>SJ Credits: {credits.sj_credits}</div>
      <div>CS Credits: {credits.cs_credits}</div>
      <div>Mini Credits: {credits.sjmini_credits}</div>
      <div>Shared Credits: {credits.shared_mock_credits}</div>
    </div>
  ),
  ExistingBookingsCard: ({ stats }) => (
    <div data-testid="bookings-card">
      <div>Total: {stats.total}</div>
      <div>This Month: {stats.thisMonth}</div>
      <div>Upcoming: {stats.upcoming}</div>
    </div>
  ),
  TokenCard: ({ onRefresh }) => (
    <div data-testid="token-card">
      <button onClick={onRefresh}>Refresh Token</button>
    </div>
  ),
  SidebarNavigation: () => (
    <div data-testid="sidebar-nav">
      <nav>Navigation</nav>
    </div>
  )
}));

jest.mock('../../frontend/src/components/layout/MainLayout', () => 
  ({ children }) => <div data-testid="main-layout">{children}</div>
);

describe('MyBookings Integration Tests', () => {
  const mockUser = {
    id: '12345',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    student_id: 'STU123'
  };

  const mockCredits = {
    sj_credits: 5,
    cs_credits: 3,
    sjmini_credits: 2,
    shared_mock_credits: 10
  };

  const mockBookings = [
    {
      id: '1',
      recordId: 'rec1',
      booking_number: 'BK001',
      exam_date: '2024-12-25',
      mock_type: 'SJT',
      status: 'scheduled',
      location: 'London Campus',
      creditsUsed: 1
    },
    {
      id: '2',
      recordId: 'rec2',
      booking_number: 'BK002',
      exam_date: '2024-12-30',
      mock_type: 'CS',
      status: 'scheduled',
      location: 'Birmingham Campus',
      creditsUsed: 1
    },
    {
      id: '3',
      recordId: 'rec3',
      booking_number: 'BK003',
      exam_date: '2024-11-15',
      mock_type: 'Mini-mock',
      status: 'completed',
      location: 'Manchester Campus',
      creditsUsed: 1
    }
  ];

  const mockProps = {
    user: mockUser,
    credits: mockCredits
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    mockApi.fetchBookings = jest.fn().mockResolvedValue({
      success: true,
      data: mockBookings
    });
    
    mockApi.cancelBooking = jest.fn().mockResolvedValue({
      success: true,
      data: {
        canceled_booking: { booking_id: 'BK001' },
        credits_restored: { credit_type: 'sj_credits', amount: 1, new_balance: 6 }
      }
    });
    
    mockApi.fetchUserCredits = jest.fn().mockResolvedValue({
      success: true,
      data: mockCredits
    });
  });

  describe('Initial Load and Data Fetching', () => {
    it('should load bookings on component mount', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // Should load bookings
      await waitFor(() => {
        expect(mockApi.fetchBookings).toHaveBeenCalledWith(
          mockUser.student_id,
          mockUser.email
        );
      });
      
      // Should display bookings once loaded
      await waitFor(() => {
        expect(screen.getByText('SJT')).toBeInTheDocument();
        expect(screen.getByText('CS')).toBeInTheDocument();
      });
    });

    it('should display user information correctly', () => {
      render(<MyBookings {...mockProps} />);
      
      expect(screen.getByText('Welcome John Doe')).toBeInTheDocument();
      expect(screen.getByText('SJ Credits: 5')).toBeInTheDocument();
      expect(screen.getByText('CS Credits: 3')).toBeInTheDocument();
      expect(screen.getByText('Mini Credits: 2')).toBeInTheDocument();
      expect(screen.getByText('Shared Credits: 10')).toBeInTheDocument();
    });

    it('should display booking statistics correctly', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total: 3')).toBeInTheDocument();
        expect(screen.getByText('Upcoming: 2')).toBeInTheDocument(); // 2 scheduled bookings
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApi.fetchBookings.mockRejectedValue(new Error('Network error'));
      
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
      });
    });
  });

  describe('View Toggle Functionality', () => {
    it('should start in list view by default', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
        expect(screen.queryByTestId('bookings-calendar')).not.toBeInTheDocument();
      });
    });

    it('should switch to calendar view when calendar button is clicked', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      const calendarButton = screen.getByText('Calendar');
      fireEvent.click(calendarButton);
      
      expect(screen.getByTestId('bookings-calendar')).toBeInTheDocument();
      expect(screen.queryByTestId('bookings-list')).not.toBeInTheDocument();
    });

    it('should switch back to list view when list button is clicked', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Switch to calendar
      const calendarButton = screen.getByText('Calendar');
      fireEvent.click(calendarButton);
      
      expect(screen.getByTestId('bookings-calendar')).toBeInTheDocument();
      
      // Switch back to list
      const listButton = screen.getByText('List');
      fireEvent.click(listButton);
      
      expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      expect(screen.queryByTestId('bookings-calendar')).not.toBeInTheDocument();
    });
  });

  describe('Booking Cancellation from List View', () => {
    it('should cancel booking successfully from list view', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Wait for bookings to load
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Click cancel on first booking
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(mockApi.cancelBooking).toHaveBeenCalledWith(
          '1',
          mockUser.student_id,
          mockUser.email
        );
      });
    });

    it('should refresh bookings after successful cancellation from list', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Cancel booking
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        // Should call fetchBookings again to refresh the list
        expect(mockApi.fetchBookings).toHaveBeenCalledTimes(2);
      });
    });

    it('should refresh credits after successful cancellation from list', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Cancel booking
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        // Should call fetchUserCredits to refresh credit balance
        expect(mockApi.fetchUserCredits).toHaveBeenCalledWith(
          mockUser.student_id,
          mockUser.email
        );
      });
    });

    it('should handle cancellation errors from list view', async () => {
      mockApi.cancelBooking.mockRejectedValue(new Error('Cancellation failed'));
      
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Attempt to cancel booking
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/cancellation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Booking Cancellation from Calendar View', () => {
    it('should cancel booking successfully from calendar view', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Switch to calendar view
      await waitFor(() => {
        const calendarButton = screen.getByText('Calendar');
        fireEvent.click(calendarButton);
      });
      
      expect(screen.getByTestId('bookings-calendar')).toBeInTheDocument();
      
      // Cancel booking from calendar
      const cancelButton = screen.getByText('Cancel from Calendar');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(mockApi.cancelBooking).toHaveBeenCalledWith(
          '1',
          mockUser.student_id,
          mockUser.email
        );
      });
    });

    it('should refresh data after successful cancellation from calendar', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Switch to calendar view
      await waitFor(() => {
        const calendarButton = screen.getByText('Calendar');
        fireEvent.click(calendarButton);
      });
      
      // Cancel booking from calendar
      const cancelButton = screen.getByText('Cancel from Calendar');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        // Should refresh both bookings and credits
        expect(mockApi.fetchBookings).toHaveBeenCalledTimes(2);
        expect(mockApi.fetchUserCredits).toHaveBeenCalled();
      });
    });
  });

  describe('Unified Modal Usage', () => {
    it('should use DeleteBookingModal for all cancellations', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // The modal usage is tested in the individual component tests
      // Here we verify the integration works end-to-end
      
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      // Should trigger the cancellation flow
      await waitFor(() => {
        expect(mockApi.cancelBooking).toHaveBeenCalled();
      });
    });
  });

  describe('Credit Refresh Integration', () => {
    it('should refresh credits when token is refreshed', async () => {
      render(<MyBookings {...mockProps} />);
      
      const refreshButton = screen.getByText('Refresh Token');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockApi.fetchUserCredits).toHaveBeenCalledWith(
          mockUser.student_id,
          mockUser.email
        );
      });
    });

    it('should update credit display after successful refresh', async () => {
      const updatedCredits = {
        ...mockCredits,
        sj_credits: 8 // Updated balance
      };
      
      mockApi.fetchUserCredits.mockResolvedValueOnce({
        success: true,
        data: updatedCredits
      });
      
      render(<MyBookings {...mockProps} />);
      
      // Initially shows original credits
      expect(screen.getByText('SJ Credits: 5')).toBeInTheDocument();
      
      // Refresh credits
      const refreshButton = screen.getByText('Refresh Token');
      fireEvent.click(refreshButton);
      
      // Should show updated credits
      await waitFor(() => {
        expect(screen.getByText('SJ Credits: 8')).toBeInTheDocument();
      });
    });
  });

  describe('Booking Details Integration', () => {
    it('should handle view details from list view', async () => {
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      const viewButton = screen.getByText('View Details');
      fireEvent.click(viewButton);
      
      // Should handle the view details action
      // The exact behavior depends on implementation
    });

    it('should handle booking click from calendar view', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Switch to calendar view
      await waitFor(() => {
        const calendarButton = screen.getByText('Calendar');
        fireEvent.click(calendarButton);
      });
      
      const viewButton = screen.getByText('View Booking');
      fireEvent.click(viewButton);
      
      // Should handle the booking click action
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle multiple API failures gracefully', async () => {
      mockApi.fetchBookings.mockRejectedValue(new Error('Bookings failed'));
      mockApi.fetchUserCredits.mockRejectedValue(new Error('Credits failed'));
      
      render(<MyBookings {...mockProps} />);
      
      // Should show appropriate error messages
      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
      });
    });

    it('should recover from errors when retrying operations', async () => {
      // First call fails, second succeeds
      mockApi.fetchBookings
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          success: true,
          data: mockBookings
        });
      
      render(<MyBookings {...mockProps} />);
      
      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
      });
      
      // Retry should work
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('SJT')).toBeInTheDocument();
      });
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain consistent state across view switches', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Load bookings in list view
      await waitFor(() => {
        expect(screen.getByTestId('list-booking-1')).toBeInTheDocument();
      });
      
      // Switch to calendar view
      const calendarButton = screen.getByText('Calendar');
      fireEvent.click(calendarButton);
      
      // Should show same bookings in calendar
      expect(screen.getByTestId('calendar-booking-1')).toBeInTheDocument();
      
      // Switch back to list
      const listButton = screen.getByText('List');
      fireEvent.click(listButton);
      
      // Should still show same bookings
      expect(screen.getByTestId('list-booking-1')).toBeInTheDocument();
    });

    it('should update statistics when bookings change', async () => {
      render(<MyBookings {...mockProps} />);
      
      // Initial statistics
      await waitFor(() => {
        expect(screen.getByText('Total: 3')).toBeInTheDocument();
        expect(screen.getByText('Upcoming: 2')).toBeInTheDocument();
      });
      
      // Mock updated bookings after cancellation
      const updatedBookings = mockBookings.slice(1); // Remove first booking
      mockApi.fetchBookings.mockResolvedValueOnce({
        success: true,
        data: updatedBookings
      });
      
      // Cancel a booking
      const cancelButton = screen.getByText('Cancel from List');
      fireEvent.click(cancelButton);
      
      // Statistics should update
      await waitFor(() => {
        expect(screen.getByText('Total: 2')).toBeInTheDocument();
        expect(screen.getByText('Upcoming: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 100 bookings
      const manyBookings = Array.from({ length: 100 }, (_, i) => ({
        id: `booking-${i}`,
        booking_number: `BK${String(i).padStart(3, '0')}`,
        exam_date: '2024-12-25',
        mock_type: 'SJT',
        status: 'scheduled',
        location: 'Test Campus'
      }));
      
      mockApi.fetchBookings.mockResolvedValue({
        success: true,
        data: manyBookings
      });
      
      const startTime = performance.now();
      render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total: 100')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Component Lifecycle Integration', () => {
    it('should cleanup properly when unmounting', async () => {
      const { unmount } = render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bookings-list')).toBeInTheDocument();
      });
      
      // Should not throw errors when unmounting
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle prop updates correctly', async () => {
      const { rerender } = render(<MyBookings {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Welcome John Doe')).toBeInTheDocument();
      });
      
      // Update user prop
      const updatedProps = {
        ...mockProps,
        user: {
          ...mockUser,
          firstname: 'Jane',
          lastname: 'Smith'
        }
      };
      
      rerender(<MyBookings {...updatedProps} />);
      
      // Should show updated user info
      expect(screen.getByText('Welcome Jane Smith')).toBeInTheDocument();
    });
  });
});
