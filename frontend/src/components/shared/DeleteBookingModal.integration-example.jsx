/**
 * DeleteBookingModal Integration Examples
 *
 * This file demonstrates how to integrate the DeleteBookingModal component
 * into existing booking components like BookingsList, BookingsCalendar, and MyBookings.
 */

import React, { useState } from 'react';
import DeleteBookingModal from './DeleteBookingModal';
import apiService from '../../services/api';

/**
 * Example 1: Integration with BookingsList Component
 */
export const BookingsListWithModal = ({ bookings, onBookingDeleted }) => {
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    booking: null,
    isDeleting: false,
    error: null
  });

  const handleDeleteClick = (booking) => {
    setDeleteModalState({
      isOpen: true,
      booking: booking,
      isDeleting: false,
      error: null
    });
  };

  const handleCloseModal = () => {
    if (!deleteModalState.isDeleting) {
      setDeleteModalState({
        isOpen: false,
        booking: null,
        isDeleting: false,
        error: null
      });
    }
  };

  const handleConfirmDelete = async (bookingId) => {
    setDeleteModalState(prev => ({
      ...prev,
      isDeleting: true,
      error: null
    }));

    try {
      // Call your API to delete the booking
      const response = await apiService.bookings.delete(bookingId);

      if (response.success) {
        // Close modal on success
        setDeleteModalState({
          isOpen: false,
          booking: null,
          isDeleting: false,
          error: null
        });

        // Notify parent component
        if (onBookingDeleted) {
          onBookingDeleted(bookingId);
        }

        // Show success message (you can use a toast library)
        console.log('Booking deleted successfully');
      } else {
        throw new Error(response.error || 'Failed to delete booking');
      }
    } catch (error) {
      // Show error in modal
      setDeleteModalState(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'An error occurred while deleting the booking. Please try again.'
      }));
    }
  };

  return (
    <>
      {/* Your existing BookingsList UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            {/* ... other booking details ... */}
            <button
              onClick={() => handleDeleteClick(booking)}
              className="text-red-600 hover:text-red-700"
            >
              Cancel Booking
            </button>
          </div>
        ))}
      </div>

      {/* Unified Delete Modal */}
      <DeleteBookingModal
        isOpen={deleteModalState.isOpen}
        booking={deleteModalState.booking}
        isDeleting={deleteModalState.isDeleting}
        error={deleteModalState.error}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

/**
 * Example 2: Integration with BookingsCalendar Component
 */
export const BookingsCalendarWithModal = ({ bookings, onBookingDeleted }) => {
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    booking: null,
    isDeleting: false,
    error: null
  });

  const handleCancelBooking = (booking) => {
    setDeleteModalState({
      isOpen: true,
      booking: booking,
      isDeleting: false,
      error: null
    });
  };

  const handleConfirmDelete = async (bookingId) => {
    setDeleteModalState(prev => ({
      ...prev,
      isDeleting: true,
      error: null
    }));

    try {
      const response = await apiService.bookings.delete(bookingId);

      if (response.success) {
        setDeleteModalState({
          isOpen: false,
          booking: null,
          isDeleting: false,
          error: null
        });

        // Refresh calendar or notify parent
        if (onBookingDeleted) {
          onBookingDeleted(bookingId);
        }
      } else {
        throw new Error(response.error || 'Failed to delete booking');
      }
    } catch (error) {
      setDeleteModalState(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message
      }));
    }
  };

  return (
    <>
      {/* Your calendar view */}
      <div className="calendar">
        {/* Calendar implementation with handleCancelBooking callback */}
      </div>

      {/* Unified Delete Modal */}
      <DeleteBookingModal
        isOpen={deleteModalState.isOpen}
        booking={deleteModalState.booking}
        isDeleting={deleteModalState.isDeleting}
        error={deleteModalState.error}
        onClose={() => {
          if (!deleteModalState.isDeleting) {
            setDeleteModalState(prev => ({ ...prev, isOpen: false }));
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

/**
 * Example 3: Custom Hook for Delete Modal Logic
 * This can be reused across multiple components
 */
export const useDeleteBookingModal = (onSuccess) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    booking: null,
    isDeleting: false,
    error: null
  });

  const openModal = (booking) => {
    setModalState({
      isOpen: true,
      booking: booking,
      isDeleting: false,
      error: null
    });
  };

  const closeModal = () => {
    if (!modalState.isDeleting) {
      setModalState({
        isOpen: false,
        booking: null,
        isDeleting: false,
        error: null
      });
    }
  };

  const confirmDelete = async (bookingId) => {
    setModalState(prev => ({
      ...prev,
      isDeleting: true,
      error: null
    }));

    try {
      const response = await apiService.bookings.delete(bookingId);

      if (response.success) {
        setModalState({
          isOpen: false,
          booking: null,
          isDeleting: false,
          error: null
        });

        if (onSuccess) {
          onSuccess(bookingId);
        }

        return true;
      } else {
        throw new Error(response.error || 'Failed to delete booking');
      }
    } catch (error) {
      setModalState(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'An error occurred while deleting the booking.'
      }));
      return false;
    }
  };

  return {
    modalState,
    openModal,
    closeModal,
    confirmDelete
  };
};

/**
 * Example 4: Using the custom hook in a component
 */
export const MyBookingsWithHook = ({ bookings, onRefresh }) => {
  const { modalState, openModal, closeModal, confirmDelete } = useDeleteBookingModal(
    async (bookingId) => {
      // Handle successful deletion
      console.log(`Booking ${bookingId} deleted successfully`);
      // Refresh the bookings list
      if (onRefresh) {
        await onRefresh();
      }
    }
  );

  return (
    <>
      {/* Your bookings list */}
      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking.id} className="booking-item">
            {/* ... booking details ... */}
            <button
              onClick={() => openModal(booking)}
              className="delete-button"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Unified Delete Modal */}
      <DeleteBookingModal
        isOpen={modalState.isOpen}
        booking={modalState.booking}
        isDeleting={modalState.isDeleting}
        error={modalState.error}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />
    </>
  );
};

/**
 * Migration Guide:
 *
 * To replace existing deletion modals with the unified DeleteBookingModal:
 *
 * 1. Import the DeleteBookingModal component:
 *    import { DeleteBookingModal } from '../shared';
 *
 * 2. Replace your existing modal state with the pattern shown above
 *
 * 3. Remove the old confirmation modal JSX
 *
 * 4. Add the DeleteBookingModal component with appropriate props
 *
 * 5. Update your delete handlers to use the new modal state management
 *
 * Benefits:
 * - Consistent UI/UX across all booking components
 * - Centralized error handling
 * - Accessibility features built-in
 * - Loading states handled uniformly
 * - Credit restoration display
 * - Proper focus management
 */