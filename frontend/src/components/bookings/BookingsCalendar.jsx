import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, isAfter, startOfDay, parseISO } from 'date-fns';
import { DeleteBookingModal } from '../shared';

const BookingsCalendar = ({ bookings, onBookingClick, onCancelBooking, isLoading, error }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped = {};
    if (bookings && bookings.length > 0) {
      bookings.forEach(booking => {
        // Use exam_date directly as it's already in YYYY-MM-DD format
        const dateKey = booking.exam_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(booking);
      });
    }
    return grouped;
  }, [bookings]);

  // Calculate booking statistics
  const bookingStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const stats = {
      total: bookings.length,
      thisMonth: 0,
      upcoming: 0,
      completed: 0,
      byType: {
        'Situational Judgment': 0,
        'Clinical Skills': 0,
        'Mini-mock': 0,
        'Mini Mock': 0
      }
    };

    bookings.forEach(booking => {
      // Count by exam type
      if (stats.byType.hasOwnProperty(booking.mock_type)) {
        stats.byType[booking.mock_type]++;
      }

      // Count by status
      if (booking.status === 'completed') {
        stats.completed++;
      }

      // Count this month's bookings
      try {
        const bookingDate = parseISO(booking.exam_date);
        if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
          stats.thisMonth++;
        }

        // Count upcoming bookings
        if (booking.status === 'scheduled' && isAfter(bookingDate, now)) {
          stats.upcoming++;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    });

    return stats;
  }, [bookings]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // Add empty cells for the start of the month
    const startDay = start.getDay(); // 0 = Sunday
    const emptyDays = Array(startDay).fill(null);

    return [...emptyDays, ...days];
  }, [currentDate]);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    if (onBookingClick) {
      onBookingClick(booking);
    }
  };

  const handleDateClick = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayBookings = bookingsByDate[dateKey];

    if (dayBookings && dayBookings.length > 0) {
      setSelectedDate(date);
      setIsDrawerOpen(true);
    }
  };

  const handleCancelClick = (booking) => {
    setBookingToDelete(booking);
    setDeleteModalOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (bookingId) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await onCancelBooking(bookingId);
      // Success - close modal and reset state
      setDeleteModalOpen(false);
      setBookingToDelete(null);
      // Close drawer if it's open
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        setSelectedBooking(null);
        setSelectedDate(null);
      }
    } catch (error) {
      // Set error to display in modal
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Failed to cancel booking. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isDeleting) {
      setDeleteModalOpen(false);
      setBookingToDelete(null);
      setDeleteError(null);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedBooking(null);
    setSelectedDate(null);
  };

  // Get mock type abbreviation and color with intensity based on booking count
  const getMockTypeConfig = (mockType, bookingCount = 1) => {
    const baseConfigs = {
      'Situational Judgment': {
        abbr: 'SJ',
        baseColor: 'bg-blue-500',
        colors: {
          1: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
          2: { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-400', dot: 'bg-blue-600' },
          3: { bg: 'bg-blue-300', text: 'text-blue-900', border: 'border-blue-500', dot: 'bg-blue-700' }
        }
      },
      'Clinical Skills': {
        abbr: 'CS',
        baseColor: 'bg-teal-500',
        colors: {
          1: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
          2: { bg: 'bg-teal-200', text: 'text-teal-900', border: 'border-teal-400', dot: 'bg-teal-600' },
          3: { bg: 'bg-teal-300', text: 'text-teal-900', border: 'border-teal-500', dot: 'bg-teal-700' }
        }
      },
      'Mini-mock': {
        abbr: 'MM',
        baseColor: 'bg-orange-500',
        colors: {
          1: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
          2: { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-400', dot: 'bg-orange-600' },
          3: { bg: 'bg-orange-300', text: 'text-orange-900', border: 'border-orange-500', dot: 'bg-orange-700' }
        }
      },
      'Mini Mock': {
        abbr: 'MM',
        baseColor: 'bg-orange-500',
        colors: {
          1: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
          2: { bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-400', dot: 'bg-orange-600' },
          3: { bg: 'bg-orange-300', text: 'text-orange-900', border: 'border-orange-500', dot: 'bg-orange-700' }
        }
      }
    };

    const config = baseConfigs[mockType] || {
      abbr: 'EX',
      baseColor: 'bg-gray-500',
      colors: {
        1: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500' },
        2: { bg: 'bg-gray-200', text: 'text-gray-900', border: 'border-gray-400', dot: 'bg-gray-600' },
        3: { bg: 'bg-gray-300', text: 'text-gray-900', border: 'border-gray-500', dot: 'bg-gray-700' }
      }
    };

    // Choose intensity based on booking count (1, 2, or 3+)
    const intensity = Math.min(bookingCount, 3);
    const colorConfig = config.colors[intensity];

    return {
      ...config,
      ...colorConfig,
      intensity
    };
  };

  const getDayClasses = (date) => {
    if (!date) return 'invisible';

    const dateKey = format(date, 'yyyy-MM-dd');
    const dayBookings = bookingsByDate[dateKey];
    const bookingCount = dayBookings ? dayBookings.length : 0;
    const hasBookings = bookingCount > 0;
    const isDateToday = isToday(date);
    const isPast = isBefore(date, startOfDay(new Date()));

    let classes = 'min-h-[80px] p-2 border-2 rounded-lg transition-all duration-200 ';

    if (isPast) {
      if (hasBookings) {
        // Past dates with bookings - muted but still visible green with different intensities
        const intensity = Math.min(bookingCount, 3);
        if (intensity === 1) {
          classes += 'bg-green-100/70 border-green-300/70 text-gray-600 cursor-pointer hover:bg-green-100 hover:shadow-md ';
        } else if (intensity === 2) {
          classes += 'bg-green-200/70 border-green-400/70 text-gray-700 cursor-pointer hover:bg-green-200 hover:shadow-md ';
        } else {
          classes += 'bg-green-300/70 border-green-500/70 text-gray-800 cursor-pointer hover:bg-green-300 hover:shadow-md ';
        }
      } else {
        // Past dates without bookings - very inactive
        classes += 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-40 ';
      }
    } else if (hasBookings) {
      // Future/current dates with bookings - strong green highlight with intensity
      const intensity = Math.min(bookingCount, 3);
      if (intensity === 1) {
        classes += 'bg-green-100 border-green-400 hover:bg-green-200 cursor-pointer hover:shadow-lg hover:border-green-500 transform hover:scale-[1.02] ';
      } else if (intensity === 2) {
        classes += 'bg-green-200 border-green-500 hover:bg-green-300 cursor-pointer hover:shadow-lg hover:border-green-600 transform hover:scale-[1.02] ';
      } else {
        classes += 'bg-green-300 border-green-600 hover:bg-green-400 cursor-pointer hover:shadow-xl hover:border-green-700 transform hover:scale-[1.02] ';
      }

      if (isDateToday) {
        classes += 'ring-2 ring-green-600 ring-offset-2 shadow-lg ';
      }
    } else {
      // Future/current dates without bookings - very inactive
      classes += 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed opacity-30 ';
      if (isDateToday) {
        classes += 'ring-2 ring-gray-400 ring-offset-1 ';
      }
    }

    return classes;
  };

  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getStatusBadge = (status) => {
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

  const isPastBooking = (booking) => {
    try {
      const examDate = parseISO(booking.exam_date);
      return isBefore(examDate, startOfDay(new Date()));
    } catch {
      return false;
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Enhanced Statistics Component
  const StatisticsPanel = () => (
    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 mb-6 border-2 border-green-300 shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">📊 Booking Statistics</h3>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="text-center bg-white rounded-lg p-2 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{bookingStats.total}</div>
          <div className="text-sm text-gray-600 font-medium">Total Bookings</div>
        </div>
        <div className="text-center bg-white rounded-lg p-2 border border-teal-200">
          <div className="text-2xl font-bold text-teal-700">{bookingStats.thisMonth}</div>
          <div className="text-sm text-gray-600 font-medium">This Month</div>
        </div>
        <div className="text-center bg-white rounded-lg p-2 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{bookingStats.upcoming}</div>
          <div className="text-sm text-gray-600 font-medium">Upcoming</div>
        </div>
        <div className="text-center bg-white rounded-lg p-2 border border-emerald-200">
          <div className="text-2xl font-bold text-emerald-700">{bookingStats.completed}</div>
          <div className="text-sm text-gray-600 font-medium">Completed</div>
        </div>
      </div>

      {/* Exam Type Breakdown */}
      <div className="pt-4 border-t border-primary-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2 text-center">By Exam Type</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          {Object.entries(bookingStats.byType).filter(([_, count]) => count > 0).map(([type, count]) => {
            const config = getMockTypeConfig(type);
            return (
              <div key={type} className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-full ${config.baseColor} text-white flex items-center justify-center text-xs font-bold`}>
                  {config.abbr}
                </div>
                <div className="text-lg font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-600 leading-tight">{type.replace(' Mock', '-mock')}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Enhanced Booking Details Drawer Component
  const BookingDetailsDrawer = () => {
    if (!isDrawerOpen) return null;

    // Get bookings for the selected date
    const displayBookings = useMemo(() => {
      if (selectedBooking) {
        // Single booking selected
        return [selectedBooking];
      } else if (selectedDate) {
        // Date selected - show all bookings for that date
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return bookingsByDate[dateKey] || [];
      }
      return [];
    }, [selectedBooking, selectedDate, bookingsByDate]);

    const drawerTitle = selectedBooking
      ? `Booking #${selectedBooking.booking_number}`
      : selectedDate
        ? `${format(selectedDate, 'EEEE, MMMM d')}`
        : 'Bookings';

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={closeDrawer}
        />

        {/* Drawer */}
        <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl transform transition-transform duration-300 overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-green-50 to-teal-50 border-b-2 border-green-300 px-4 py-4 z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {selectedDate && !selectedBooking && (
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {format(selectedDate, 'd')}
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-gray-900">{drawerTitle}</h2>
                </div>
                {selectedDate && displayBookings.length > 0 && (
                  <p className="text-sm text-green-700 font-medium mt-1 ml-10">
                    {displayBookings.length} {displayBookings.length === 1 ? 'exam booking' : 'exam bookings'} scheduled
                  </p>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors border border-gray-300"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {displayBookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-3 text-base font-medium text-gray-600">No Bookings</p>
                <p className="mt-1 text-sm text-gray-500">This date has no scheduled exams</p>
              </div>
            ) : (
              displayBookings.map((booking, index) => (
                <div key={booking.id || booking.booking_number || index}
                     className="bg-white border-2 border-green-200 rounded-lg p-4 hover:shadow-lg hover:border-green-300 transition-all duration-200">
                  {/* Booking Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMockTypeConfig(booking.mock_type).baseColor} text-white`}>
                        {getMockTypeConfig(booking.mock_type).abbr}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{booking.mock_type}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">#{booking.booking_number}</p>
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  {/* Booking Details */}
                  <div className="space-y-2 text-sm">
                    {/* Time */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatTime(booking.start_time)}</span>
                    </div>

                    {/* Location */}
                    {booking.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{booking.location}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs">{booking.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                    {booking.status === 'scheduled' && !isPastBooking(booking) && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            if (onBookingClick) {
                              onBookingClick(booking);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-300 rounded-md hover:bg-primary-100 transition-colors duration-200"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleCancelClick(booking)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200"
                        >
                          Cancel Booking
                        </button>
                      </>
                    )}
                    {booking.status === 'completed' && (
                      <div className="flex-1 text-center px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-md">
                        ✓ Exam Completed
                      </div>
                    )}
                    {booking.status === 'cancelled' && (
                      <div className="flex-1 text-center px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-md">
                        ✕ Booking Cancelled
                      </div>
                    )}
                    {isPastBooking(booking) && booking.status === 'scheduled' && (
                      <div className="flex-1 text-center px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-md">
                        Past Booking
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="card-brand p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="card-brand p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading calendar</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Statistics Panel */}
      <StatisticsPanel />

      <div className="card-brand border-2 border-gray-200 shadow-lg">
        <div className="p-4 sm:p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-green-50 rounded-lg transition-colors text-gray-700 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {format(currentDate, 'MMMM yyyy')}
            </h2>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-green-50 rounded-lg transition-colors text-gray-700 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-300"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 border-b-2 border-gray-200 pb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateKey = date ? format(date, 'yyyy-MM-dd') : null;
              const dayBookings = dateKey ? bookingsByDate[dateKey] : null;
              const bookingCount = dayBookings ? dayBookings.length : 0;
              const hasBookings = bookingCount > 0;

              return (
                <div
                  key={index}
                  className={getDayClasses(date)}
                  onClick={() => {
                    if (date && hasBookings) {
                      handleDateClick(date);
                    }
                  }}
                >
                  {date && (
                    <>
                      {/* Date Number with green indicator for bookings */}
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          isToday(date)
                            ? hasBookings ? 'text-green-800 font-bold text-base' : 'text-primary-700 font-bold'
                            : hasBookings ? 'text-gray-900 font-medium' : 'text-gray-400'
                        }`}>
                          {format(date, 'd')}
                        </span>
                        {bookingCount > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm ${
                            bookingCount === 1
                              ? 'bg-green-200 text-green-800 border border-green-300'
                              : bookingCount === 2
                                ? 'bg-green-300 text-green-900 border border-green-400'
                                : 'bg-green-400 text-white border border-green-500'
                          }`}>
                            {bookingCount}
                          </span>
                        )}
                      </div>

                      {/* Booking Indicators with Enhanced Visual Design */}
                      {dayBookings && (
                        <div className="space-y-1">
                          {dayBookings.slice(0, 2).map((booking, idx) => {
                            const config = getMockTypeConfig(booking.mock_type, bookingCount);
                            const isPast = isPastBooking(booking);

                            return (
                              <div
                                key={booking.id || idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookingClick(booking);
                                }}
                                className={`relative flex items-center gap-1 px-1.5 py-1 rounded-md text-xs cursor-pointer hover:shadow-md transition-all duration-200 transform hover:scale-105 ${
                                  config.bg
                                } ${config.border} border-2 ${isPast ? 'opacity-70' : ''}`}
                                title={`${booking.mock_type} - ${formatTime(booking.start_time)} ${isPast ? '(Past)' : ''}`}
                              >
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${config.dot} text-white shadow-sm`}>
                                  {config.abbr.charAt(0)}
                                </span>
                                <span className={`hidden sm:inline truncate ${config.text} font-semibold text-xs`}>
                                  {formatTime(booking.start_time)}
                                </span>
                                {booking.status === 'completed' && (
                                  <span className="ml-auto text-green-700 font-bold">✓</span>
                                )}
                                {booking.status === 'cancelled' && (
                                  <span className="ml-auto text-red-600 font-bold">✕</span>
                                )}
                              </div>
                            );
                          })}
                          {dayBookings.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateClick(date);
                              }}
                              className="w-full text-xs text-green-800 font-semibold text-center bg-green-200 hover:bg-green-300 rounded px-1 py-0.5 transition-colors border border-green-400"
                            >
                              +{dayBookings.length - 2} more
                            </button>
                          )}
                        </div>
                      )}

                      {/* Empty date indicator */}
                      {!dayBookings && (
                        <div className="flex items-center justify-center h-12">
                          <div className="text-2xl text-gray-300 opacity-40">−</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center mb-4">
              <h4 className="text-sm font-bold text-gray-800 mb-2">📖 Calendar Legend</h4>
              <p className="text-xs text-gray-600 font-medium bg-green-50 inline-block px-3 py-1 rounded-full border border-green-300">
                💡 Click on green highlighted dates to view & manage bookings
              </p>
            </div>

            {/* Calendar Status Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-6 h-6 bg-green-100 border-2 border-green-400 rounded"></div>
                  <div className="w-6 h-6 bg-green-200 border-2 border-green-500 rounded"></div>
                  <div className="w-6 h-6 bg-green-300 border-2 border-green-600 rounded"></div>
                </div>
                <span className="text-gray-700 font-medium">Has Bookings (1-3+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-50 border-2 border-gray-300 rounded-lg opacity-30"></div>
                <span className="text-gray-700">No Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 border-2 border-gray-300 rounded-lg opacity-40"></div>
                <span className="text-gray-700">Past Date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-200 border-2 border-green-600 rounded-lg ring-2 ring-green-600 ring-offset-2 shadow-lg"></div>
                <span className="text-gray-700 font-medium">Today</span>
              </div>
            </div>

            {/* Exam Type Colors */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">S</span>
                </div>
                <span className="text-gray-700">Situational Judgment</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold">C</span>
                </div>
                <span className="text-gray-700">Clinical Skills</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">M</span>
                </div>
                <span className="text-gray-700">Mini-mock</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center items-center gap-4 mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>Cancelled</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-flex px-1.5 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-medium">3</span>
                <span>Multiple Bookings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Drawer */}
      <BookingDetailsDrawer />

      {/* Delete Booking Modal */}
      <DeleteBookingModal
        isOpen={deleteModalOpen}
        booking={bookingToDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

BookingsCalendar.propTypes = {
  bookings: PropTypes.array.isRequired,
  onBookingClick: PropTypes.func.isRequired,
  onCancelBooking: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

BookingsCalendar.defaultProps = {
  bookings: [],
  isLoading: false,
  error: null
};

export default BookingsCalendar;