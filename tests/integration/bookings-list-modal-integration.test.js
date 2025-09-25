import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingsList from '../../frontend/src/components/bookings/BookingsList';

describe('BookingsList - DeleteBookingModal Integration', () => {
  const mockBookings = [
    {
      id: '1',
      recordId: 'REC-001',
      examDate: '2025-10-01',
      examTime: '09:00',
      status: 'confirmed',
      mockExam: {
        examType: 'USMLE Step 1',
        campus: 'New York Campus'
      }
    },
    {
      id: '2',
      recordId: 'REC-002',
      examDate: '2025-11-15',
      examTime: '14:00',
      status: 'confirmed',
      mockExam: {
        examType: 'COMLEX Level 2',
        campus: 'Los Angeles Campus'
      }
    }
  ];

  const mockOnCancelBooking = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('opens DeleteBookingModal when cancel button is clicked', () => {
    const { container } = render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Click the cancel button on the first booking
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Check that modal is now visible with correct booking details
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
    expect(screen.getByText('USMLE Step 1')).toBeInTheDocument();
    expect(screen.getByText('New York Campus')).toBeInTheDocument();
    expect(screen.getByText('Yes, Cancel Booking')).toBeInTheDocument();
    expect(screen.getByText('Keep Booking')).toBeInTheDocument();
  });

  test('closes modal when Keep Booking is clicked', () => {
    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click Keep Booking
    fireEvent.click(screen.getByText('Keep Booking'));

    // Modal should be closed
    expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
  });

  test('calls onCancelBooking when confirmation is clicked', async () => {
    mockOnCancelBooking.mockResolvedValueOnce();

    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click confirmation button
    fireEvent.click(screen.getByText('Yes, Cancel Booking'));

    // Wait for the async operation
    await waitFor(() => {
      expect(mockOnCancelBooking).toHaveBeenCalledWith('1');
    });

    // Modal should be closed after successful cancellation
    await waitFor(() => {
      expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
    });
  });

  test('displays error in modal when cancellation fails', async () => {
    const errorMessage = 'Unable to cancel booking. Please try again later.';
    mockOnCancelBooking.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click confirmation button
    fireEvent.click(screen.getByText('Yes, Cancel Booking'));

    // Wait for error to appear in modal
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Modal should remain open with error displayed
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
  });

  test('shows loading state during cancellation', async () => {
    // Create a promise that we can control
    let resolvePromise;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockOnCancelBooking.mockReturnValueOnce(delayedPromise);

    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click confirmation button
    fireEvent.click(screen.getByText('Yes, Cancel Booking'));

    // Check loading state is shown
    await waitFor(() => {
      expect(screen.getByText('Cancelling...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise();

    // Modal should close after completion
    await waitFor(() => {
      expect(screen.queryByText('Cancel Booking')).not.toBeInTheDocument();
    });
  });

  test('disables buttons while deletion is in progress', async () => {
    let resolvePromise;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockOnCancelBooking.mockReturnValueOnce(delayedPromise);

    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click confirmation button
    fireEvent.click(screen.getByText('Yes, Cancel Booking'));

    // Both buttons should be disabled during deletion
    await waitFor(() => {
      const confirmButton = screen.getByText('Cancelling...').closest('button');
      const keepButton = screen.getByText('Keep Booking').closest('button');
      expect(confirmButton).toBeDisabled();
      expect(keepButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise();
  });

  test('handles API error response with custom message', async () => {
    const apiError = {
      response: {
        data: {
          message: 'Booking cannot be cancelled within 24 hours of the exam.'
        }
      }
    };
    mockOnCancelBooking.mockRejectedValueOnce(apiError);

    render(
      <BookingsList
        bookings={mockBookings}
        onCancelBooking={mockOnCancelBooking}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Open the modal
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    // Click confirmation button
    fireEvent.click(screen.getByText('Yes, Cancel Booking'));

    // Wait for custom error message to appear
    await waitFor(() => {
      expect(screen.getByText('Booking cannot be cancelled within 24 hours of the exam.')).toBeInTheDocument();
    });
  });
});

export default describe;