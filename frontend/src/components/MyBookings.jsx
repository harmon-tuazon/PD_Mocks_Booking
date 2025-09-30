import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserSession, clearUserSession } from '../utils/auth';
import apiService, { normalizeBooking, formatBookingNumber, getBookingStatus, formatTimeRange as apiFormatTimeRange } from '../services/api';
import BookingsCalendarView from './bookings/BookingsCalendarView';
import TokenCard from './shared/TokenCard';
import CapacityBadge from './shared/CapacityBadge';
import ResponsiveLogo from './shared/Logo';
import { DeleteBookingModal } from './shared';

const MyBookings = () => {
  const navigate = useNavigate();

  // Exam types for credit fetching
  const examTypes = [
    { type: 'Situational Judgment' },
    { type: 'Clinical Skills' },
    { type: 'Mini-mock' }
  ];

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userSession, setUserSession] = useState(null);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [credits, setCredits] = useState(null);
  const [creditInfo, setCreditInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [filter, setFilter] = useState('all'); // 'all' | 'upcoming' | 'past' | 'cancelled'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const ITEMS_PER_PAGE = 20;

  // Check for existing session on mount
  useEffect(() => {
    const session = getUserSession();
    if (session) {
      setUserSession(session);
      setIsAuthenticated(true);
      fetchBookings(session.studentId, session.email);
      fetchCreditInfo(session);
    }
    setIsInitialLoad(false);
  }, []);

  // Fetch exam-type specific credit information
  const fetchCreditInfo = async (userData) => {
    try {
      const creditData = {};
      for (const examType of examTypes) {
        const result = await apiService.mockExams.validateCredits(
          userData.studentId,
          userData.email,
          examType.type
        );
        if (result.success) {
          creditData[examType.type] = result.data.credit_breakdown;
        }
      }
      setCreditInfo(creditData);
    } catch (error) {
      console.error('Error fetching credit information:', error);
    }
  };

  // Authenticate user
  const handleAuthentication = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await apiService.mockExams.validateCredits(
        studentId.toUpperCase(),
        email.toLowerCase(),
        null // null to get all credit types
      );

      if (response.success) {
        const userData = {
          studentId: studentId.toUpperCase(),
          email: email.toLowerCase(),
          contactId: response.data.contact_id,
          studentName: response.data.student_name,
          enrollmentId: response.data.enrollment_id
        };

        // Store session
        setUserSession(userData);
        setIsAuthenticated(true);

        // Set credits from response
        setCredits(response.data.credit_breakdown);

        // Fetch bookings and credit info
        await fetchBookings(userData.studentId, userData.email);
        await fetchCreditInfo(userData);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      if (err.message?.includes('not found') || err.message?.includes('STUDENT_NOT_FOUND')) {
        setAuthError('No user found with this Student ID. Please check your Student ID and try again.');
      } else if (err.message?.includes('Email does not match') || err.message?.includes('EMAIL_MISMATCH')) {
        setAuthError('The email address does not match our records for this Student ID.');
      } else {
        setAuthError('An error occurred while verifying your information. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch bookings from API
  const fetchBookings = useCallback(async (studentId, email, page = 1) => {
    setLoading(true);
    setError('');

    try {
      // For cancelled filter, fetch 'all' bookings since we'll filter client-side
      const apiFilter = filter === 'cancelled' ? 'all' : filter;

      const response = await apiService.bookings.list({
        student_id: studentId,
        email: email,
        filter: apiFilter, // Use adjusted filter for API
        page: page,
        limit: ITEMS_PER_PAGE
      });

      if (response.success) {
        // Normalize bookings to ensure all necessary properties are present
        const normalizedBookings = response.data.bookings.map(normalizeBooking);
        setBookings(normalizedBookings);
        setCredits(response.data.credits);
        setTotalPages(response.data.pagination.total_pages);
        setTotalBookings(response.data.pagination.total);
        setCurrentPage(page);
      } else {
        throw new Error(response.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Refresh bookings when filter changes
  useEffect(() => {
    if (isAuthenticated && userSession && !isInitialLoad) {
      fetchBookings(userSession.studentId, userSession.email, 1);
    }
  }, [filter, isAuthenticated, userSession, isInitialLoad]);


  // Handle logout
  const handleLogout = () => {
    clearUserSession();
    setIsAuthenticated(false);
    setUserSession(null);
    setBookings([]);
    setCredits(null);
    setCreditInfo({});
    setStudentId('');
    setEmail('');
    setFilter('all');
    setViewMode('list');
  };

  // Handle booking click - removed drawer functionality
  const handleBookingClick = (booking) => {
    // Simply log for now - drawer removed
    console.log('Booking clicked:', booking);
  };

  // Handle opening the delete modal
  const handleCancelBooking = (booking) => {
    // Ensure booking is normalized before deletion
    const normalizedBooking = normalizeBooking(booking);
    setBookingToDelete(normalizedBooking);
    setDeleteModalOpen(true);
    setDeleteError('');
  };

  // Handle confirming the deletion
  const handleConfirmDelete = async (objectId) => {
    if (!objectId || !bookingToDelete) return;

    console.log('🔍 [DEBUG] Booking deletion started:', {
      objectId,
      objectIdType: typeof objectId,
      bookingToDelete: {
        id: bookingToDelete.id,
        booking_id: bookingToDelete.booking_id,
        booking_number: bookingToDelete.booking_number,
        is_active: bookingToDelete.is_active,
        allKeys: Object.keys(bookingToDelete)
      }
    });

    setIsDeleting(true);
    setDeleteError('');

    try {
      // Call API to cancel booking with proper user authentication data
      const response = await apiService.bookings.cancelBooking(objectId, {
        student_id: userSession.studentId,
        email: userSession.email,
        reason: 'User requested cancellation'
      });

      if (response.success) {
        // Close modal
        setDeleteModalOpen(false);
        setBookingToDelete(null);

        // Refresh bookings list
        await fetchBookings(userSession.studentId, userSession.email, currentPage);

        // Refresh credit info to show restored credits
        if (userSession) {
          await fetchCreditInfo(userSession);
        }
      } else {
        throw new Error(response.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setDeleteError(error.message || 'Failed to cancel booking. Please try again later.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle closing the delete modal
  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModalOpen(false);
      setBookingToDelete(null);
      setDeleteError('');
    }
  };


  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';

    try {
      let date;

      // Handle different date formats that HubSpot might return
      if (typeof dateString === 'string' && dateString.includes('T')) {
        // ISO format like "2025-09-26T00:00:00.000Z"
        date = new Date(dateString);
      } else if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format - parse as local date to avoid timezone shift
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        // Try direct parsing
        date = new Date(dateString);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return dateString;
      }

      const result = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return result;
    } catch (error) {
      console.error('Date formatting error:', error, 'input:', dateString);
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';

    try {
      // Convert to string and clean
      let cleanTimeString = String(timeString).trim();

      // Handle edge case: If it looks like a year (4 digits > 1000), it's likely corrupted data
      if (/^\d{4}$/.test(cleanTimeString) && parseInt(cleanTimeString) > 1000) {
        console.warn('Detected potential year value as time:', cleanTimeString);
        return 'Time TBD';
      }

      // Handle timestamp values (milliseconds since epoch)
      const numericValue = parseInt(cleanTimeString, 10);
      if (!isNaN(numericValue) && numericValue > 86400000) { // More than 1 day in milliseconds
        const date = new Date(numericValue);
        if (!isNaN(date.getTime())) {
          const hour = date.getHours();
          const minute = date.getMinutes();
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        }
        return 'Time TBD';
      }

      // If it's already in a time format (like "14:00:00" or "14:00")
      if (cleanTimeString.includes(':')) {
        const timeParts = cleanTimeString.split(':');
        const hours = timeParts[0];
        const minutes = timeParts[1] || '00';

        const hour = parseInt(hours, 10);

        // Validate hour
        if (isNaN(hour) || hour < 0 || hour > 23) {
          console.warn('Invalid hour value:', hour, 'from:', cleanTimeString);
          return 'Time TBD';
        }

        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

        return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
      }

      // If it's just a number (like 14 for 2 PM)
      if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 23) {
        const ampm = numericValue >= 12 ? 'PM' : 'AM';
        const displayHour = numericValue > 12 ? numericValue - 12 : numericValue === 0 ? 12 : numericValue;
        return `${displayHour}:00 ${ampm}`;
      }

      // If we can't parse it, return a safe default
      console.warn('Unable to parse time:', timeString);
      return 'Time TBD';
    } catch (error) {
      console.error('Time formatting error:', error, 'input:', timeString);
      return 'Time TBD';
    }
  };

  // Format time range for display using the API service function
  // This function properly handles ISO timestamps from HubSpot
  const formatBookingTimeRange = (booking) => {
    return apiFormatTimeRange(booking);
  };

  // Sorting function
  const sortBookings = (bookingsToSort, field, direction) => {
    return [...bookingsToSort].sort((a, b) => {
      let aValue, bValue;

      switch (field) {
        case 'booking_number':
          aValue = a.booking_number || '';
          bValue = b.booking_number || '';
          break;
        case 'exam_type':
          aValue = a.mock_type || '';
          bValue = b.mock_type || '';
          break;
        case 'date_time':
          aValue = new Date(a.exam_date || '1970-01-01');
          bValue = new Date(b.exam_date || '1970-01-01');
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'status':
          // Custom status ordering: scheduled -> completed -> cancelled
          const statusOrder = { 'scheduled': 1, 'completed': 2, 'cancelled': 3, 'no_show': 4 };
          aValue = statusOrder[getBookingStatus(a)] || 5;
          bValue = statusOrder[getBookingStatus(b)] || 5;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle sort click function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Get booking status badge
  const getStatusBadge = (booking) => {
    // Use normalized status from booking
    const status = getBookingStatus(booking);

    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Scheduled', icon: '📅' },
      completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', icon: '✓' },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled', icon: '✕' },
      no_show: { color: 'bg-red-100 text-red-800 border-red-200', label: 'No Show', icon: '⚠' }
    };

    const config = statusConfig[status] || statusConfig.scheduled;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[1, 2, 3, 4, 5].map((row) => (
              <tr key={row}>
                {[1, 2, 3, 4, 5, 6].map((col) => (
                  <td key={col} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    {col === 3 && <div className="h-3 bg-gray-100 rounded w-16 mt-1"></div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Mobile booking card component
  const MobileBookingCard = ({ booking }) => (
    <div
      className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-semibold text-sm text-primary-900">{formatBookingNumber(booking)}</p>
          <p className="text-lg font-medium text-gray-900 mt-1">{booking.mock_type || 'Mock Exam'}</p>
        </div>
        {getStatusBadge(booking)}
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(booking.exam_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatBookingTimeRange(booking)}</span>
        </div>
        {booking.location && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{booking.location}</span>
          </div>
        )}
      </div>

      {getBookingStatus(booking) === 'scheduled' && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancelBooking(booking);
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );

  // Render authentication form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header with PrepDoctors Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <ResponsiveLogo
                size="xl"
                className="transition-opacity duration-300 hover:opacity-80"
                priority={true}
              />
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-primary-900 mb-2">
              My Bookings
            </h1>
            <p className="font-body text-base sm:text-lg text-primary-700">
              Enter your details to view your mock exam bookings
            </p>
          </div>

          {/* Error Display */}
          {authError && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-subheading text-sm font-medium text-error-800">
                    Authentication Error
                  </h3>
                  <div className="mt-2 font-body text-sm text-error-700">
                    {authError}
                  </div>
                </div>
                <button
                  onClick={() => setAuthError('')}
                  className="ml-auto flex-shrink-0 text-error-400 hover:text-error-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleAuthentication}>
            <div className="space-y-4">
              <div>
                <label htmlFor="student-id" className="block font-subheading text-sm font-medium text-primary-700">
                  Student ID
                </label>
                <div className="mt-1">
                  <input
                    id="student-id"
                    name="student-id"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 font-body text-base sm:text-lg transition-colors duration-200"
                    placeholder="Enter your student ID"
                    disabled={authLoading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block font-subheading text-sm font-medium text-primary-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 font-body text-base sm:text-lg transition-colors duration-200"
                    placeholder="Enter your email address"
                    disabled={authLoading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading || !studentId || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent font-subheading text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {authLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'View My Bookings'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/book')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Don't have any bookings? Book a mock exam →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render bookings view
  return (
    <div className="bg-gradient-to-br from-primary-50 via-white to-primary-50 min-h-full">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-900 mb-2">
                My Bookings
              </h1>
              <p className="font-body text-base sm:text-lg text-primary-700">
                Welcome back, {userSession?.studentName || 'Student'}
              </p>
            </div>
          </div>
        </div>

        {/* Single Available Tokens Card */}
        {Object.keys(creditInfo).length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="max-w-md">
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className="px-3 py-2 border-b">
                  <h3 className="font-subheading text-sm font-medium text-primary-900">Available Tokens</h3>
                  <p className="font-body text-xs text-primary-600 mt-0.5">Your current token balance</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Token Type
                        </th>
                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {examTypes.map((examType, index) => {
                        const breakdown = creditInfo[examType.type];
                        if (!breakdown) return null;

                        const specific = breakdown.specific_credits || 0;
                        const shared = examType.type === 'Mini-mock' ? 0 : (breakdown.shared_credits || 0);
                        const total = specific + shared;

                        return (
                          <tr key={examType.type} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-xs font-medium text-gray-900">
                                {examType.type}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-center">
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                total > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add standalone Shared Mock Tokens row */}
                      {credits && credits.shared_mock_credits !== undefined && (
                        <tr className={examTypes.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <div className="text-xs font-medium text-gray-900">
                              Shared Mock Tokens
                            </div>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                              credits.shared_mock_credits > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {credits.shared_mock_credits}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-2 py-1 bg-gray-50 text-xs text-gray-500">
                  Tokens are automatically deducted when you book an exam.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col space-y-4">
            {/* Mobile Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    viewMode === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="hidden sm:inline">List View</span>
                    <span className="sm:hidden">List</span>
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    viewMode === 'calendar'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Calendar View</span>
                    <span className="sm:hidden">Calendar</span>
                  </span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 flex-1 overflow-x-auto">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All {totalBookings > 0 && `(${totalBookings})`}
                </button>
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    filter === 'upcoming'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    filter === 'past'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Past
                </button>
                <button
                  onClick={() => setFilter('cancelled')}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    filter === 'cancelled'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            {/* Mobile Sorting Dropdown - Only show in list view */}
            {viewMode === 'list' && (
              <div className="md:hidden">
                <label htmlFor="sort-mobile" className="block text-xs font-medium text-gray-700 mb-1">
                  Sort by
                </label>
                <select
                  id="sort-mobile"
                  className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={sortField ? `${sortField}_${sortDirection}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      setSortField(null);
                      setSortDirection('asc');
                    } else {
                      const [field, direction] = value.split('_');
                      setSortField(field);
                      setSortDirection(direction);
                    }
                  }}
                >
                  <option value="">Default Order</option>
                  <option value="booking_number_asc">Booking # (A-Z)</option>
                  <option value="booking_number_desc">Booking # (Z-A)</option>
                  <option value="exam_type_asc">Exam Type (A-Z)</option>
                  <option value="exam_type_desc">Exam Type (Z-A)</option>
                  <option value="date_time_asc">Date (Oldest First)</option>
                  <option value="date_time_desc">Date (Newest First)</option>
                  <option value="location_asc">Location (A-Z)</option>
                  <option value="location_desc">Location (Z-A)</option>
                  <option value="status_asc">Status (Scheduled First)</option>
                  <option value="status_desc">Status (Cancelled First)</option>
                </select>
              </div>
            )}

          </div>
        </div>

        {/* Content Area */}
        {loading && <LoadingSkeleton />}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Bookings
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => fetchBookings(userSession.studentId, userSession.email, currentPage)}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client-side filtering for cancelled bookings */}
        {(() => {
          // Filter bookings based on the selected filter
          const getFilteredBookings = (bookingList, filterType) => {
            if (filterType === 'cancelled') {
              return bookingList.filter(booking => {
                const status = getBookingStatus(booking);
                return status === 'cancelled';
              });
            }
            // For other filters, use all bookings as server already filtered them
            return bookingList;
          };

          // Apply filtering
          const displayBookings = getFilteredBookings(bookings, filter);
          const cancelledCount = bookings.filter(booking => getBookingStatus(booking) === 'cancelled').length;

          // Check if there are no bookings to display after filtering
          if (!loading && !error && displayBookings.length === 0) {
            return (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {filter === 'cancelled' ? 'No cancelled bookings' : 'No bookings found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'cancelled'
                    ? "You don't have any cancelled bookings."
                    : "You haven't made any bookings yet."}
                </p>
                {filter !== 'cancelled' && (
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/book/exam-types')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Book Your First Exam
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // Display bookings if there are any after filtering
          if (!loading && !error && displayBookings.length > 0) {
            return (
          <>
            {viewMode === 'list' ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white border rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => handleSort('booking_number')}
                          >
                            <div className="flex items-center">
                              Booking #
                              <SortIcon field="booking_number" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => handleSort('exam_type')}
                          >
                            <div className="flex items-center">
                              Exam Type
                              <SortIcon field="exam_type" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => handleSort('date_time')}
                          >
                            <div className="flex items-center">
                              Date & Time
                              <SortIcon field="date_time" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => handleSort('location')}
                          >
                            <div className="flex items-center">
                              Location
                              <SortIcon field="location" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center">
                              Status
                              <SortIcon field="status" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          // Apply sorting to the display bookings
                          const sortedBookings = sortField
                            ? sortBookings(displayBookings, sortField, sortDirection)
                            : displayBookings;

                          return sortedBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-primary-900">
                                {formatBookingNumber(booking)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.mock_type || 'Mock Exam'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(booking.exam_date)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatBookingTimeRange(booking)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {booking.location || 'Location TBD'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(booking)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              {getBookingStatus(booking) === 'scheduled' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelBooking(booking);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {(() => {
                    // Apply sorting to the display bookings for mobile view
                    const sortedBookings = sortField
                      ? sortBookings(displayBookings, sortField, sortDirection)
                      : displayBookings;

                    return sortedBookings.map((booking) => (
                      <MobileBookingCard key={booking.id} booking={booking} />
                    ));
                  })()}
                </div>
              </>
            ) : (
              /* Calendar View */
              <BookingsCalendarView
                bookings={displayBookings}
                onCancelBooking={handleCancelBooking}
                isLoading={loading}
                error={error}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchBookings(userSession.studentId, userSession.email, Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchBookings(userSession.studentId, userSession.email, Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalBookings)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{totalBookings}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => fetchBookings(userSession.studentId, userSession.email, Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => fetchBookings(userSession.studentId, userSession.email, pageNum)}
                            disabled={loading}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => fetchBookings(userSession.studentId, userSession.email, Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
              </>
            );
          }

          // Default return for when loading or error
          return null;
        })()}
      </div>

      {/* Delete Booking Modal */}
      <DeleteBookingModal
        isOpen={deleteModalOpen}
        booking={bookingToDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MyBookings;