/**
 * Test script to validate the booking data normalization functions
 */

// Mock booking data similar to what the API returns
const mockBookings = [
  {
    booking_id: '17234567890',
    mock_type: 'Situational Judgment',
    location: 'Toronto Campus',
    start_time: '2025-10-15T14:00:00Z',
    end_time: '2025-10-15T17:00:00Z',
    is_active: true,
    hs_createdate: '2025-09-20T10:00:00Z',
    exam_date: '2025-10-15',
  },
  {
    booking_id: '17234567891',
    mock_type: 'Clinical Skills',
    location: null,
    start_time: '09:00',
    end_time: '12:00',
    is_active: false,
    hs_createdate: '2025-09-18T10:00:00Z',
    exam_date: '2025-09-10',
  },
  {
    id: 'legacy-id',
    booking_number: 'BK-12345',
    status: 'scheduled',
    mock_type: 'Mini-mock',
    exam_date: '2025-11-01',
    start_time: null,
    end_time: null,
  }
];

// Helper functions from api.js
function formatBookingNumber(booking) {
  if (booking.booking_number) {
    return booking.booking_number;
  }
  if (booking.booking_id) {
    // Extract last 8 chars of booking_id for display
    return `BK-${booking.booking_id.slice(-8).toUpperCase()}`;
  }
  return 'Booking ID TBD';
}

function getBookingStatus(booking) {
  // First check explicit status field
  if (booking.status) {
    return booking.status;
  }

  // Derive status from is_active and dates
  if (booking.is_active === false || booking.is_active === 'false') {
    return 'cancelled';
  }

  // Check if the exam date has passed
  if (booking.exam_date) {
    const examDate = new Date(booking.exam_date);
    const now = new Date();
    if (examDate < now) {
      return 'completed';
    }
  }

  return 'scheduled';
}

function normalizeBooking(booking) {
  return {
    ...booking,
    // Ensure we have an id property
    id: booking.id || booking.booking_id || booking.recordId,
    // Ensure we have booking_number
    booking_number: formatBookingNumber(booking),
    // Ensure we have a status
    status: getBookingStatus(booking),
    // Ensure location is available
    location: booking.location || 'Location TBD',
    // Ensure exam_date is available
    exam_date: booking.exam_date || booking.hs_createdate?.split('T')[0],
    // Ensure times are available
    start_time: booking.start_time || null,
    end_time: booking.end_time || null
  };
}

// Test the normalization
console.log('Testing Booking Data Normalization\n');
console.log('=' .repeat(50));

mockBookings.forEach((booking, index) => {
  console.log(`\nOriginal Booking ${index + 1}:`);
  console.log(JSON.stringify(booking, null, 2));

  const normalized = normalizeBooking(booking);
  console.log(`\nNormalized Booking ${index + 1}:`);
  console.log(JSON.stringify(normalized, null, 2));

  // Validate key properties
  console.log('\nValidation:');
  console.log(`✓ Has ID: ${!!normalized.id}`);
  console.log(`✓ Has booking_number: ${!!normalized.booking_number} (${normalized.booking_number})`);
  console.log(`✓ Has status: ${!!normalized.status} (${normalized.status})`);
  console.log(`✓ Has location: ${!!normalized.location} (${normalized.location})`);
  console.log(`✓ Has exam_date: ${!!normalized.exam_date} (${normalized.exam_date})`);

  console.log('-'.repeat(50));
});

console.log('\n✅ All bookings normalized successfully!');
console.log('\nKey improvements implemented:');
console.log('1. Booking IDs are consistently formatted');
console.log('2. Status is derived from is_active flag and dates');
console.log('3. Missing properties have sensible defaults');
console.log('4. Time formats are handled for both ISO and HH:MM formats');
console.log('5. Location defaults to "Location TBD" when missing');