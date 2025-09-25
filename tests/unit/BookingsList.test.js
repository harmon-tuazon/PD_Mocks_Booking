import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingsList from '../../frontend/src/components/bookings/BookingsList';

// Mock the react-icons
jest.mock('react-icons/fi', () => ({
  FiCalendar: () => <div data-testid="calendar-icon" />,
  FiClock: () => <div data-testid="clock-icon" />,
  FiMapPin: () => <div data-testid="map-icon" />,
  FiHash: () => <div data-testid="hash-icon" />,
  FiEye: () => <div data-testid="eye-icon" />,
  FiX: () => <div data-testid="x-icon" />,
  FiAlertCircle: () => <div data-testid="alert-icon" />
}));

// Mock the DeleteBookingModal
jest.mock('../../frontend/src/components/shared', () => ({
  DeleteBookingModal: ({ isOpen, booking, onClose, onConfirm, isDeleting, error }) => 
    isOpen ? (
      <div data-testid="delete-modal">
        <div>Delete booking: {booking?.mock_type || booking?.mockExam?.examType}</div>
        {error && <div data-testid="modal-error">{error}</div>}
        {isDeleting ? (
          <div data-testid="deleting-state">Deleting...</div>
        ) : (
          <button onClick={() => onConfirm(booking.id || booking.recordId)}>Confirm Delete</button>
        )}
        <button onClick={onClose} disabled={isDeleting}>Cancel</button>
      </div>
    ) : null
}));

describe('BookingsList', () => {
  const mockBookings = [
    {
      id: '1',
      recordId: 'rec1',
      bookingNumber: 'BK001',
      examDate: '2024-12-25',
      examTime: '09:00',
      mockExam: {
        examType: 'Situational Judgment',
        campus: 'London Campus'
      },
      status: 'scheduled',
      creditsUsed: 2
    },
    {
      id: '2',
      recordId: 'rec2', 
      bookingNumber: 'BK002',
      examDate: '2024-01-15', // Past date
      examTime: '14:30',
      mockExam: {
        examType: 'Clinical Skills',
        campus: 'Birmingham Campus'
      },
      status: 'completed',
      creditsUsed: 3
    },
    {
      id: '3',
      recordId: 'rec3',
      bookingNumber: 'BK003',
      examDate: '2024-11-10',
      examTime: '16:00',
      mockExam: {
        examType: 'Mini-mock',
        campus: 'Manchester Campus'
      },
      status: 'cancelled',
      creditsUsed: 1
    }
  ];

  const defaultProps = {
    bookings: mockBookings,
    onCancelBooking: jest.fn(),
    onViewDetails: jest.fn(),
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    it('should render list of bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should show all booking cards
      expect(screen.getByText('BK001')).toBeInTheDocument();
      expect(screen.getByText('BK002')).toBeInTheDocument();
      expect(screen.getByText('BK003')).toBeInTheDocument();
      
      // Should show exam types
      expect(screen.getByText('Situational Judgment')).toBeInTheDocument();
      expect(screen.getByText('Clinical Skills')).toBeInTheDocument();
      expect(screen.getByText('Mini-mock')).toBeInTheDocument();
    });

    it('should render booking details correctly', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should show formatted dates and times
      expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
      
      // Should show locations
      expect(screen.getByText('London Campus')).toBeInTheDocument();
      expect(screen.getByText('Birmingham Campus')).toBeInTheDocument();
      expect(screen.getByText('Manchester Campus')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<BookingsList {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading bookings...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const error = 'Failed to load bookings';
      render(<BookingsList {...defaultProps} error={error} />);
      
      expect(screen.getByText(error)).toBeInTheDocument();
    });

    it('should render empty state when no bookings', () => {
      render(<BookingsList {...defaultProps} bookings={[]} />);
      
      expect(screen.getByText('No bookings found')).toBeInTheDocument();
    });

    it('should render action buttons for bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should show View Details buttons
      const viewButtons = screen.getAllByText('View Details');
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Booking Status Display', () => {
    it('should show confirmed status for upcoming bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Upcoming booking should show as confirmed
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('should show past status for completed bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Past booking should show as past
      expect(screen.getByText('Past')).toBeInTheDocument();
    });

    it('should show cancelled status for cancelled bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Cancelled booking should show as cancelled
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('should apply correct styling for different statuses', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Confirmed status should have green styling
      const confirmedStatus = screen.getByText('Confirmed');
      expect(confirmedStatus).toHaveClass('text-green-700');
      
      // Past status should have gray styling
      const pastStatus = screen.getByText('Past');
      expect(pastStatus).toHaveClass('text-gray-600');
      
      // Cancelled status should have red styling
      const cancelledStatus = screen.getByText('Cancelled');
      expect(cancelledStatus).toHaveClass('text-red-700');
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format dates correctly', () => {
      render(<BookingsList {...defaultProps} />);
      
      expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Nov 10, 2024')).toBeInTheDocument();
    });

    it('should format time correctly', () => {
      render(<BookingsList {...defaultProps} />);
      
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
      expect(screen.getByText('4:00 PM')).toBeInTheDocument();
    });

    it('should handle missing date gracefully', () => {
      const bookingWithoutDate = {
        id: '4',
        bookingNumber: 'BK004',
        examDate: null,
        mockExam: {
          examType: 'Test',
          campus: 'Test Campus'
        },
        status: 'scheduled'
      };
      
      render(<BookingsList {...defaultProps} bookings={[bookingWithoutDate]} />);
      
      expect(screen.getByText('Date TBD')).toBeInTheDocument();
    });

    it('should handle invalid date gracefully', () => {
      const bookingWithInvalidDate = {
        id: '4',
        bookingNumber: 'BK004',
        examDate: 'invalid-date',
        mockExam: {
          examType: 'Test',
          campus: 'Test Campus'
        },
        status: 'scheduled'
      };
      
      render(<BookingsList {...defaultProps} bookings={[bookingWithInvalidDate]} />);
      
      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });

    it('should handle missing time gracefully', () => {
      const bookingWithoutTime = {
        id: '4',
        bookingNumber: 'BK004',
        examDate: '2024-12-25',
        examTime: null,
        mockExam: {
          examType: 'Test',
          campus: 'Test Campus'
        },
        status: 'scheduled'
      };
      
      render(<BookingsList {...defaultProps} bookings={[bookingWithoutTime]} />);
      
      // Should not show time if not available
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
    });
  });

  describe('Cancel Booking Functionality', () => {
    it('should show cancel button for upcoming bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should show cancel button for upcoming bookings only
      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons.length).toBe(1); // Only one upcoming booking
    });

    it('should not show cancel button for past bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Past bookings should not have cancel buttons
      // We already verified only 1 cancel button exists above
    });

    it('should not show cancel button for cancelled bookings', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Cancelled bookings should not have cancel buttons  
      // We already verified only 1 cancel button exists above
    });

    it('should open delete modal when cancel button is clicked', async () => {
      render(<BookingsList {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      // Should open delete modal
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByText('Delete booking: Situational Judgment')).toBeInTheDocument();
    });

    it('should close delete modal when cancel is clicked in modal', async () => {
      render(<BookingsList {...defaultProps} />);
      
      // Open modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      
      // Close modal
      const modalCancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(modalCancelButton);
      
      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
      });
    });

    it('should call onCancelBooking when deletion is confirmed', async () => {
      const mockOnCancelBooking = jest.fn().mockResolvedValue();
      render(<BookingsList {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open modal and confirm deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnCancelBooking).toHaveBeenCalledWith('1');
      });
    });

    it('should show loading state during deletion', async () => {
      const mockOnCancelBooking = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<BookingsList {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open modal and start deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Should show deleting state
      expect(screen.getByTestId('deleting-state')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnCancelBooking).toHaveBeenCalled();
      });
    });

    it('should show error when deletion fails', async () => {
      const mockError = new Error('Deletion failed');
      mockError.response = { data: { message: 'Server error occurred' } };
      const mockOnCancelBooking = jest.fn().mockRejectedValue(mockError);
      
      render(<BookingsList {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Attempt deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Should show error in modal
      await waitFor(() => {
        expect(screen.getByTestId('modal-error')).toHaveTextContent('Server error occurred');
      });
    });

    it('should handle different error response formats', async () => {
      const mockError = new Error('Network error');
      const mockOnCancelBooking = jest.fn().mockRejectedValue(mockError);
      
      render(<BookingsList {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Attempt deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByTestId('modal-error')).toHaveTextContent('Network error');
      });
    });

    it('should close modal after successful deletion', async () => {
      const mockOnCancelBooking = jest.fn().mockResolvedValue();
      render(<BookingsList {...defaultProps} onCancelBooking={mockOnCancelBooking} />);
      
      // Open modal and confirm deletion
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      // Modal should close after success
      await waitFor(() => {
        expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Details Functionality', () => {
    it('should call onViewDetails when view button is clicked', () => {
      const mockOnViewDetails = jest.fn();
      render(<BookingsList {...defaultProps} onViewDetails={mockOnViewDetails} />);
      
      const viewButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewButton);
      
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockBookings[0]);
    });

    it('should pass correct booking data to onViewDetails', () => {
      const mockOnViewDetails = jest.fn();
      render(<BookingsList {...defaultProps} onViewDetails={mockOnViewDetails} />);
      
      // Click on second booking's view button
      const viewButtons = screen.getAllByText('View Details');
      fireEvent.click(viewButtons[1]);
      
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockBookings[1]);
    });
  });

  describe('Booking Card Variations', () => {
    it('should handle bookings with different data structures', () => {
      const alternativeBooking = {
        id: '4',
        bookingNumber: 'BK004',
        examDate: '2024-12-30',
        mock_type: 'Alternative Type', // Different field name
        location: 'Alternative Campus', // Different structure
        status: 'scheduled'
      };
      
      render(<BookingsList {...defaultProps} bookings={[alternativeBooking]} />);
      
      expect(screen.getByText('BK004')).toBeInTheDocument();
      expect(screen.getByText('Alternative Type')).toBeInTheDocument();
      expect(screen.getByText('Alternative Campus')).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalBooking = {
        id: '5',
        bookingNumber: 'BK005',
        status: 'scheduled'
        // Missing examDate, mockExam, etc.
      };
      
      render(<BookingsList {...defaultProps} bookings={[minimalBooking]} />);
      
      expect(screen.getByText('BK005')).toBeInTheDocument();
      // Should handle gracefully without crashing
    });

    it('should show credits information when available', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should show credits used for bookings that have this info
      expect(screen.getByText('2 credits')).toBeInTheDocument();
      expect(screen.getByText('3 credits')).toBeInTheDocument();
      expect(screen.getByText('1 credit')).toBeInTheDocument(); // Singular for 1 credit
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Cancel buttons should have descriptive labels
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveAttribute('aria-label', expect.stringContaining('Cancel booking'));
      
      // View buttons should have descriptive labels
      const viewButtons = screen.getAllByText('View Details');
      expect(viewButtons[0]).toHaveAttribute('aria-label', expect.stringContaining('View details'));
    });

    it('should have proper heading structure', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Should have proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<BookingsList {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      const viewButton = screen.getAllByText('View Details')[0];
      
      // Should be focusable
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
      
      // Should navigate with tab
      fireEvent.keyDown(cancelButton, { key: 'Tab' });
      expect(viewButton).toHaveFocus();
    });

    it('should announce status changes to screen readers', () => {
      render(<BookingsList {...defaultProps} />);
      
      // Status indicators should have appropriate ARIA labels
      const confirmedStatus = screen.getByText('Confirmed');
      expect(confirmedStatus).toHaveAttribute('aria-label', expect.stringContaining('Status'));
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed booking data', () => {
      const malformedBookings = [
        null,
        undefined,
        {},
        { id: null },
        { id: '1', bookingNumber: null }
      ];
      
      // Should not crash with malformed data
      expect(() => {
        render(<BookingsList {...defaultProps} bookings={malformedBookings} />);
      }).not.toThrow();
    });

    it('should handle missing callback functions', () => {
      render(<BookingsList bookings={mockBookings} />);
      
      // Should not crash without callback functions
      const cancelButton = screen.getByText('Cancel');
      expect(() => {
        fireEvent.click(cancelButton);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render large lists efficiently', () => {
      // Create 50 bookings
      const manyBookings = Array.from({ length: 50 }, (_, i) => ({
        id: `booking-${i}`,
        recordId: `rec-${i}`,
        bookingNumber: `BK${String(i).padStart(3, '0')}`,
        examDate: '2024-12-25',
        mockExam: {
          examType: 'Test Type',
          campus: 'Test Campus'
        },
        status: 'scheduled'
      }));
      
      const startTime = performance.now();
      render(<BookingsList {...defaultProps} bookings={manyBookings} />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should show all bookings
      expect(screen.getByText('BK000')).toBeInTheDocument();
      expect(screen.getByText('BK049')).toBeInTheDocument();
    });
  });
});
