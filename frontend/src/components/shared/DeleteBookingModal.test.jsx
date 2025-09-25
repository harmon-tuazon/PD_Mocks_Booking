import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteBookingModal from './DeleteBookingModal';

describe('DeleteBookingModal', () => {
  const mockBooking = {
    id: '123',
    mockExam: {
      examType: 'Situational Judgment',
      campus: 'London Campus'
    },
    examDate: '2025-10-15',
    examTime: '14:30',
    creditsUsed: 1
  };

  const mockBookingAlternative = {
    recordId: '456',
    mock_type: 'Clinical Skills',
    location: 'Manchester Campus',
    exam_date: '2025-10-20',
    start_time: '09:00',
    credits: 2
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
  });

  it('renders when isOpen is true', () => {
    render(<DeleteBookingModal {...defaultProps} />);
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
    expect(screen.getByText('Situational Judgment')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DeleteBookingModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  it('displays booking details correctly', () => {
    render(<DeleteBookingModal {...defaultProps} />);

    // Check exam type
    expect(screen.getByText('Situational Judgment')).toBeInTheDocument();

    // Check formatted date
    expect(screen.getByText(/Oct 15, 2025/)).toBeInTheDocument();

    // Check formatted time
    expect(screen.getByText(/2:30 PM/)).toBeInTheDocument();

    // Check location
    expect(screen.getByText('London Campus')).toBeInTheDocument();

    // Check credits
    expect(screen.getByText('1 credit will be restored')).toBeInTheDocument();
  });

  it('handles alternative booking field names', () => {
    render(<DeleteBookingModal {...defaultProps} booking={mockBookingAlternative} />);

    expect(screen.getByText('Clinical Skills')).toBeInTheDocument();
    expect(screen.getByText(/Oct 20, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText('Manchester Campus')).toBeInTheDocument();
    expect(screen.getByText('2 credits will be restored')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    const errorMessage = 'Failed to cancel booking. Please try again.';
    render(<DeleteBookingModal {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onClose when Keep Booking button is clicked', () => {
    render(<DeleteBookingModal {...defaultProps} />);

    const keepButton = screen.getByText('Keep Booking');
    fireEvent.click(keepButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with booking id when Yes, Cancel Booking is clicked', async () => {
    render(<DeleteBookingModal {...defaultProps} />);

    const confirmButton = screen.getByText('Yes, Cancel Booking');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('123');
    });
  });

  it('shows loading state when isDeleting is true', () => {
    render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);

    expect(screen.getByText('Cancelling...')).toBeInTheDocument();
    expect(screen.getByText('Yes, Cancel Booking')).not.toBeInTheDocument();

    // Buttons should be disabled
    const keepButton = screen.getByText('Keep Booking');
    expect(keepButton).toBeDisabled();
  });

  it('closes modal when background overlay is clicked', () => {
    const { container } = render(<DeleteBookingModal {...defaultProps} />);

    const overlay = container.querySelector('.bg-gray-500.bg-opacity-75');
    fireEvent.click(overlay);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close modal when overlay is clicked during deletion', () => {
    const { container } = render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);

    const overlay = container.querySelector('.bg-gray-500.bg-opacity-75');
    fireEvent.click(overlay);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalBooking = {
      id: '789',
      mock_type: 'Mini-mock'
    };

    render(<DeleteBookingModal {...defaultProps} booking={minimalBooking} />);

    expect(screen.getByText('Mini-mock')).toBeInTheDocument();
    expect(screen.getByText('Location TBD')).toBeInTheDocument();
    expect(screen.queryByText(/credit/)).not.toBeInTheDocument();
  });

  it('closes modal on Escape key press', () => {
    render(<DeleteBookingModal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape when deleting', () => {
    render(<DeleteBookingModal {...defaultProps} isDeleting={true} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('applies correct accessibility attributes', () => {
    render(<DeleteBookingModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

    const title = screen.getByText('Cancel Booking');
    expect(title).toHaveAttribute('id', 'modal-title');
  });
});