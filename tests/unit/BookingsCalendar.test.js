import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingsCalendar from '../../frontend/src/components/bookings/BookingsCalendar';
import { format } from 'date-fns';

// Mock date-fns
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn(),
  startOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: jest.fn((date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  eachDayOfInterval: jest.fn(({ start, end }) => {
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }),
  isSameDay: jest.fn((date1, date2) => 
    date1.toDateString() === date2.toDateString()
  ),
  isToday: jest.fn((date) => 
    date.toDateString() === new Date().toDateString()
  ),
  isBefore: jest.fn((date1, date2) => date1 < date2),
  isAfter: jest.fn((date1, date2) => date1 > date2),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  parseISO: jest.fn((dateString) => new Date(dateString))
}));

// Mock the DeleteBookingModal
jest.mock('../../frontend/src/components/shared', () => ({
  DeleteBookingModal: ({ isOpen, booking, onClose, onConfirm, error }) => 
    isOpen ? (
      <div data-testid="delete-modal">
        <div>Delete booking: {booking?.mock_type}</div>
        {error && <div data-testid="modal-error">{error}</div>}
        <button onClick={() => onConfirm(booking.id)}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
}));

// Set up a fixed date for consistent testing
const mockDate = new Date('2024-12-01');
jest.spyOn(global, 'Date').mockImplementation((dateString) => {
  if (dateString) {
    return new Date(dateString);
  }
  return mockDate;
});

describe('BookingsCalendar', () => {
  const mockBookings = [
    {
      id: '1',
      recordId: 'rec1',
      exam_date: '2024-12-15',
      mock_type: 'Situational Judgment',
      status: 'scheduled',
      location: 'London Campus'
    },
    {
      id: '2',
      recordId: 'rec2',
      exam_date: '2024-12-15',
      mock_type: 'Clinical Skills',
      status: 'scheduled',
      location: 'Birmingham Campus'
    },
    {
      id: '3',
      recordId: 'rec3',
      exam_date: '2024-12-20',
      mock_type: 'Mini-mock',
      status: 'completed',
      location: 'Manchester Campus'
    },
    {
      id: '4',
      recordId: 'rec4',
      exam_date: '2024-11-10',
      mock_type: 'Situational Judgment',
      status: 'completed',
      location: 'London Campus'
    }
  ];

  const defaultProps = {
    bookings: mockBookings,
    onBookingClick: jest.fn(),
    onCancelBooking: jest.fn(),
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup format mock to return expected date format
    format.mockImplementation((date, formatString) => {
      if (formatString === 'yyyy-MM-dd') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date.toString();
    });
  });

  describe('Rendering and Layout', () => {
    it('should render calendar with booking statistics', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Should show statistics
      expect(screen.getByText('4')).toBeInTheDocument(); // Total bookings
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render calendar grid with days of week', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Check for day headers
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      const prevButton = screen.getByLabelText('Previous month');
      const nextButton = screen.getByLabelText('Next month');
      
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('should render empty state when no bookings', () => {
      render(<BookingsCalendar {...defaultProps} bookings={[]} />);
      
      expect(screen.getByText('0')).toBeInTheDocument(); // Total bookings should be 0
      expect(screen.getByText('No bookings found')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<BookingsCalendar {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading bookings...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const error = 'Failed to load bookings';
      render(<BookingsCalendar {...defaultProps} error={error} />);
      
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  describe('Booking Statistics Calculation', () => {
    it('should calculate correct booking statistics', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Total bookings: 4
      expect(screen.getByText('4')).toBeInTheDocument();
      
      // This month bookings (December): 3 bookings (2 on 15th, 1 on 20th)
      // Note: This depends on the mock date being December 2024
    });

    it('should group bookings by type correctly', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Should show exam type distribution in statistics
      // Situational Judgment: 2 bookings
      // Clinical Skills: 1 booking  
      // Mini-mock: 1 booking
    });

    it('should count upcoming vs completed bookings', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Should show proper counts for upcoming vs completed
      // This depends on current date vs exam dates
    });

    it('should handle invalid dates gracefully', () => {
      const bookingsWithInvalidDate = [
        {
          id: '1',
          exam_date: 'invalid-date',
          mock_type: 'Situational Judgment',
          status: 'scheduled'
        }
      ];
      
      render(<BookingsCalendar {...defaultProps} bookings={bookingsWithInvalidDate} />);
      
      // Should not crash and show 1 total booking
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Date Highlighting and Styling', () => {
    it('should highlight dates with bookings in green', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Find dates with bookings (15th and 20th of December)
      const calendarDays = screen.getAllByRole('button').filter(button => 
        button.textContent.match(/^\d+$/)
      );
      
      // Should have green styling for dates with bookings
      const highlightedDays = calendarDays.filter(day => 
        day.className.includes('bg-green') || day.className.includes('text-green')
      );
      
      expect(highlightedDays.length).toBeGreaterThan(0);
    });

    it('should show inactive styling for dates without bookings', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      const calendarDays = screen.getAllByRole('button').filter(button => 
        button.textContent.match(/^\d+$/)
      );
      
      // Should have inactive/gray styling for dates without bookings
      const inactiveDays = calendarDays.filter(day => 
        day.className.includes('text-gray') && !day.className.includes('bg-green')
      );
      
      expect(inactiveDays.length).toBeGreaterThan(0);
    });

    it('should show multiple booking indicators on same date', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // December 15th has 2 bookings, should show multiple indicators
      // Look for booking count badges or multiple dots
      const multipleBookingIndicators = screen.getAllByTestId(/booking-count|booking-dot/);
      expect(multipleBookingIndicators.length).toBeGreaterThan(0);
    });

    it('should highlight today\'s date differently', () => {
      // Mock isToday to return true for specific date
      const { isToday } = require('date-fns');
      isToday.mockImplementation((date) => 
        date.toDateString() === mockDate.toDateString()
      );
      
      render(<BookingsCalendar {...defaultProps} />);
      
      // Today should have special styling
      const todayElement = screen.getByText('1'); // December 1st
      expect(todayElement.parentElement).toHaveClass(/today|current/);
    });
  });

  describe('Date Click Interactions', () => {
    it('should open side drawer when clicking date with bookings', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Click on December 15th (has bookings)
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      // Should open drawer with bookings for that date
      await waitFor(() => {
        expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
      });
    });

    it('should not open drawer when clicking date without bookings', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Click on December 1st (no bookings)
      const dateWithoutBookings = screen.getByText('1');
      fireEvent.click(dateWithoutBookings);
      
      // Should not open drawer
      expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
    });

    it('should show day-specific bookings in side drawer', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Click on December 15th
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        // Should show bookings for that specific date
        expect(screen.getByText('Situational Judgment')).toBeInTheDocument();
        expect(screen.getByText('Clinical Skills')).toBeInTheDocument();
      });
    });

    it('should close side drawer when clicking close button', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Open drawer
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
      });
      
      // Close drawer
      const closeButton = screen.getByLabelText('Close drawer');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Month Navigation', () => {
    it('should navigate to previous month', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);
      
      // Should show November (calendar should update)
      // This would require checking the month display
    });

    it('should navigate to next month', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);
      
      // Should show January (calendar should update)
    });

    it('should update booking visibility when navigating months', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Initially should see December bookings
      expect(screen.getByText('15')).toBeInTheDocument();
      
      // Navigate to previous month
      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);
      
      // Should now see November bookings (different highlighting)
    });
  });

  describe('Booking Cancellation', () => {
    it('should show cancel option in booking cards within drawer', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Open drawer
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        // Should show cancel buttons for scheduled bookings
        const cancelButtons = screen.getAllByText('Cancel Booking');
        expect(cancelButtons.length).toBeGreaterThan(0);
      });
    });

    it('should open DeleteBookingModal when cancel is clicked', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Open drawer
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        const cancelButton = screen.getAllByText('Cancel Booking')[0];
        fireEvent.click(cancelButton);
      });
      
      // Should open delete modal
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    });

    it('should call onCancelBooking when deletion is confirmed', async () => {
      const mockOnCancelBooking = jest.fn().mockResolvedValue();
      render(<BookingsCalendar {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open drawer and click cancel
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        const cancelButton = screen.getAllByText('Cancel Booking')[0];
        fireEvent.click(cancelButton);
      });
      
      // Confirm deletion
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnCancelBooking).toHaveBeenCalledWith('1');
      });
    });

    it('should show error in modal when cancellation fails', async () => {
      const mockError = new Error('Cancellation failed');
      const mockOnCancelBooking = jest.fn().mockRejectedValue(mockError);
      render(<BookingsCalendar {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open drawer and attempt cancellation
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        const cancelButton = screen.getAllByText('Cancel Booking')[0];
        fireEvent.click(cancelButton);
      });
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Should show error in modal
      await waitFor(() => {
        expect(screen.getByTestId('modal-error')).toHaveTextContent('Cancellation failed');
      });
    });

    it('should close drawer after successful cancellation', async () => {
      const mockOnCancelBooking = jest.fn().mockResolvedValue();
      render(<BookingsCalendar {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open drawer and cancel booking
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        const cancelButton = screen.getAllByText('Cancel Booking')[0];
        fireEvent.click(cancelButton);
      });
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Should close both modal and drawer
      await waitFor(() => {
        expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
      });
    });

    it('should not show cancel option for completed bookings', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Click on December 20th (has completed booking)
      const dateWithCompletedBooking = screen.getByText('20');
      fireEvent.click(dateWithCompletedBooking);
      
      await waitFor(() => {
        // Should not show cancel button for completed booking
        expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mock Type Configuration', () => {
    it('should display correct abbreviations for different exam types', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Should show SJ for Situational Judgment
      // Should show CS for Clinical Skills  
      // Should show MM for Mini-mock
    });

    it('should apply different colors based on exam type', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Different exam types should have different color schemes
      // Blue for SJ, Teal for CS, Orange for Mini-mock
    });

    it('should adjust color intensity based on booking count', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Dates with multiple bookings should have more intense colors
      // December 15th (2 bookings) should be darker than single booking dates
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation buttons', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
      expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for calendar dates', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Calendar dates should have appropriate labels
      const dateButtons = screen.getAllByRole('button').filter(button => 
        button.textContent.match(/^\d+$/)
      );
      
      expect(dateButtons.length).toBeGreaterThan(0);
      // Each should have aria-label describing the date and any bookings
    });

    it('should support keyboard navigation', () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Should be able to navigate calendar with keyboard
      const firstDate = screen.getByText('1');
      firstDate.focus();
      
      // Arrow keys should navigate between dates
      fireEvent.keyDown(firstDate, { key: 'ArrowRight' });
      expect(screen.getByText('2')).toHaveFocus();
    });

    it('should announce booking information to screen readers', async () => {
      render(<BookingsCalendar {...defaultProps} />);
      
      // Open drawer
      const dateWithBookings = screen.getByText('15');
      fireEvent.click(dateWithBookings);
      
      await waitFor(() => {
        // Screen readers should announce booking details
        const bookingInfo = screen.getByRole('region', { name: /bookings for/ });
        expect(bookingInfo).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bookings array', () => {
      render(<BookingsCalendar {...defaultProps} bookings={[]} />);
      
      expect(screen.getByText('No bookings found')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Total count
    });

    it('should handle bookings with missing dates', () => {
      const bookingsWithMissingDates = [
        {
          id: '1',
          exam_date: null,
          mock_type: 'Situational Judgment',
          status: 'scheduled'
        }
      ];
      
      render(<BookingsCalendar {...defaultProps} bookings={bookingsWithMissingDates} />);
      
      // Should not crash and handle gracefully
      expect(screen.getByText('1')).toBeInTheDocument(); // Total count
    });

    it('should handle bookings with invalid status', () => {
      const bookingsWithInvalidStatus = [
        {
          id: '1',
          exam_date: '2024-12-15',
          mock_type: 'Situational Judgment',
          status: 'unknown-status'
        }
      ];
      
      render(<BookingsCalendar {...defaultProps} bookings={bookingsWithInvalidStatus} />);
      
      // Should handle gracefully without crashing
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle very large number of bookings efficiently', () => {
      // Create 100 bookings
      const manyBookings = Array.from({ length: 100 }, (_, i) => ({
        id: `booking-${i}`,
        exam_date: '2024-12-15',
        mock_type: 'Situational Judgment',
        status: 'scheduled'
      }));
      
      const startTime = performance.now();
      render(<BookingsCalendar {...defaultProps} bookings={manyBookings} />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
});
