import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteBookingModal from '../../frontend/src/components/shared/DeleteBookingModal';

// Mock the react-icons
jest.mock('react-icons/fi', () => ({
  FiAlertCircle: () => <div data-testid="alert-icon" />,
  FiX: () => <div data-testid="close-icon" />,
  FiCalendar: () => <div data-testid="calendar-icon" />,
  FiClock: () => <div data-testid="clock-icon" />,
  FiMapPin: () => <div data-testid="map-icon" />,
  FiRefreshCw: () => <div data-testid="refresh-icon" />
}));

describe('DeleteBookingModal', () => {
  const mockBooking = {
    id: '123',
    examDate: '2024-12-25',
    examTime: '14:30',
    mockExam: {
      examType: 'SJT',
      campus: 'London Campus'
    },
    creditsUsed: 5
  };

  const defaultProps = {
    isOpen: true,
    booking: mockBooking,
    isDeleting: false,
    error: null,
    onClose: jest.fn(),
    onConfirm: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    // Clean up body overflow
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to cancel this booking? This action cannot be undone.')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<DeleteBookingModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render modal when booking is null', () => {
      render(<DeleteBookingModal {...defaultProps} booking={null} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render booking details correctly', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(screen.getByText('SJT')).toBeInTheDocument();
      expect(screen.getByText('Wed, Dec 25, 2024')).toBeInTheDocument();
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
      expect(screen.getByText('London Campus')).toBeInTheDocument();
      expect(screen.getByText('5 credits will be restored')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Yes, Cancel Booking' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep Booking' })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('Date and Time Formatting', () => {
    it('should handle different date formats correctly', () => {
      const booking = { ...mockBooking, examDate: '2024-01-15' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Mon, Jan 15, 2024')).toBeInTheDocument();
    });

    it('should handle different time formats correctly', () => {
      const booking = { ...mockBooking, examTime: '09:00' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    });

    it('should handle 24-hour time format correctly', () => {
      const booking = { ...mockBooking, examTime: '15:45' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('3:45 PM')).toBeInTheDocument();
    });

    it('should handle midnight time correctly', () => {
      const booking = { ...mockBooking, examTime: '00:00' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    });

    it('should handle noon time correctly', () => {
      const booking = { ...mockBooking, examTime: '12:00' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    });

    it('should show fallback text when date is missing', () => {
      const booking = { ...mockBooking, examDate: null };
      delete booking.examDate;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Date TBD')).toBeInTheDocument();
    });

    it('should handle invalid date gracefully', () => {
      const booking = { ...mockBooking, examDate: 'invalid-date' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });

    it('should handle invalid time gracefully', () => {
      const booking = { ...mockBooking, examTime: 'invalid-time' };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('invalid-time')).toBeInTheDocument();
    });
  });

  describe('Different Field Name Handling', () => {
    it('should handle exam_date field name', () => {
      const booking = { ...mockBooking };
      delete booking.examDate;
      booking.exam_date = '2024-12-25';
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Wed, Dec 25, 2024')).toBeInTheDocument();
    });

    it('should handle exam_time field name', () => {
      const booking = { ...mockBooking };
      delete booking.examTime;
      booking.exam_time = '14:30';
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('should handle mock_type field name', () => {
      const booking = { ...mockBooking };
      delete booking.mockExam;
      booking.mock_type = 'OSCE';
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('OSCE')).toBeInTheDocument();
    });

    it('should handle location field name', () => {
      const booking = { ...mockBooking };
      delete booking.mockExam;
      booking.location = 'Birmingham Campus';
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Birmingham Campus')).toBeInTheDocument();
    });

    it('should handle credits_used field name', () => {
      const booking = { ...mockBooking };
      delete booking.creditsUsed;
      booking.credits_used = 3;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('3 credits will be restored')).toBeInTheDocument();
    });

    it('should handle recordId instead of id', () => {
      const booking = { ...mockBooking };
      delete booking.id;
      booking.recordId = '456';
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Yes, Cancel Booking' });
      fireEvent.click(confirmButton);
      
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('456');
    });
  });

  describe('Credits Display', () => {
    it('should show singular credit text for 1 credit', () => {
      const booking = { ...mockBooking, creditsUsed: 1 };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('1 credit will be restored')).toBeInTheDocument();
    });

    it('should show plural credits text for multiple credits', () => {
      const booking = { ...mockBooking, creditsUsed: 3 };
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('3 credits will be restored')).toBeInTheDocument();
    });

    it('should not show credits section when credits are not available', () => {
      const booking = { ...mockBooking };
      delete booking.creditsUsed;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.queryByText(/credits will be restored/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isDeleting is true', () => {
      render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);
      
      expect(screen.getByText('Cancelling...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancelling/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Keep Booking' })).toBeDisabled();
    });

    it('should hide close button when isDeleting is true', () => {
      render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);
      
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });

    it('should prevent overlay click when isDeleting is true', () => {
      render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);
      
      const overlay = screen.getByRole('dialog').parentElement.querySelector('.bg-gray-500');
      fireEvent.click(overlay);
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to cancel booking. Please try again.';
      render(<DeleteBookingModal {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not display error section when error is null', () => {
      render(<DeleteBookingModal {...defaultProps} error={null} />);
      
      expect(screen.queryByText(/Failed to cancel/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Keep Booking button is clicked', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      const keepButton = screen.getByRole('button', { name: 'Keep Booking' });
      fireEvent.click(keepButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with booking ID when Yes, Cancel Booking is clicked', async () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Yes, Cancel Booking' });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith('123');
      });
    });

    it('should call onClose when close button (X) is clicked', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      const overlay = screen.getByRole('dialog').parentElement.querySelector('.bg-gray-500');
      fireEvent.click(overlay);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape is pressed during deletion', () => {
      render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should focus first button when modal opens', async () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Yes, Cancel Booking' });
        expect(confirmButton).toHaveFocus();
      }, { timeout: 200 });
    });

    it('should have screen reader text for close button', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });
  });

  describe('Body Scroll Management', () => {
    it('should prevent body scroll when modal is open', () => {
      render(<DeleteBookingModal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(<DeleteBookingModal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<DeleteBookingModal {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Fallback Handling', () => {
    it('should show default exam type when not provided', () => {
      const booking = { ...mockBooking };
      delete booking.mockExam;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
    });

    it('should show default location when not provided', () => {
      const booking = { ...mockBooking };
      delete booking.mockExam;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Location TBD')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle booking without ID gracefully', () => {
      const booking = { ...mockBooking };
      delete booking.id;
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Yes, Cancel Booking' });
      fireEvent.click(confirmButton);
      
      // Should not call onConfirm if no ID is present
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('should handle empty booking object', () => {
      const booking = {};
      render(<DeleteBookingModal {...defaultProps} booking={booking} />);
      
      expect(screen.getByText('Mock Exam')).toBeInTheDocument();
      expect(screen.getByText('Location TBD')).toBeInTheDocument();
    });
  });
});
