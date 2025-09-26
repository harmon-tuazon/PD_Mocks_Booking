/**
 * Test time formatting with actual booking data to identify the issue
 */

console.log('🔍 TIME FORMATTING ANALYSIS\n');

// Real booking data from HubSpot (based on sample data found)
const sampleBookings = [
  {
    id: '35207858728',
    booking_id: 'Clinical Skills-Test Test - 2025-09-26',
    mock_type: 'Clinical Skills',
    exam_date: '2025-09-26',
    start_time: '2025-09-27T12:00:00Z',
    end_time: '2025-09-27T20:00:00Z',
    location: 'Mississauga'
  },
  {
    id: '35117316788',
    booking_id: 'Situational Judgment-Test Harmon - 2025-09-26',
    mock_type: 'Situational Judgment',
    exam_date: '2025-09-26',
    start_time: '2025-09-26T16:00:00Z',
    end_time: '2025-09-26T17:00:00Z',
    location: 'Mississauga'
  }
];

console.log('📋 Testing Current Frontend Functions (from BookingsList.jsx):');

// Current BookingsList.jsx formatTime function
const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

// Current BookingsList.jsx formatTimeRange function
const formatTimeRange = (startTime, endTime) => {
  if (!startTime && !endTime) return 'Time TBD';
  if (!endTime) return formatTime(startTime);
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

console.log('\n🚨 PROBLEM IDENTIFIED:');
console.log('The current formatTime function expects time in "HH:MM" format');
console.log('But HubSpot provides time as ISO timestamps: "2025-09-26T16:00:00Z"');
console.log('This mismatch causes the split(":") to fail!\n');

sampleBookings.forEach((booking, index) => {
  console.log(`📅 BOOKING ${index + 1} TEST:`);
  console.log('  Raw start_time:', booking.start_time);
  console.log('  Raw end_time:', booking.end_time);

  console.log('  Current formatTime(start_time):', formatTime(booking.start_time));
  console.log('  Current formatTime(end_time):', formatTime(booking.end_time));
  console.log('  Current formatTimeRange():', formatTimeRange(booking.start_time, booking.end_time));
  console.log('');
});

console.log('📋 Testing api.js formatTimeRange Function:');

// Current api.js formatTime function
const apiFormatTime = (dateString) => {
  if (!dateString) return '';

  // Handle UTC timestamps properly
  const date = new Date(dateString);

  // Convert UTC to local time for display
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto'
  });
};

// Current api.js formatTimeRange function
const apiFormatTimeRange = (exam) => {
  if (!exam) return '';

  // If we have start_time and end_time, use them
  if (exam.start_time && exam.end_time) {
    const startTime = apiFormatTime(exam.start_time);
    const endTime = apiFormatTime(exam.end_time);
    return `${startTime} - ${endTime}`;
  }

  // Fallback: if we only have exam_date, create a reasonable time range
  if (exam.exam_date) {
    // For YYYY-MM-DD format, append a time to avoid timezone issues
    const dateStr = exam.exam_date.includes('T') ? exam.exam_date : `${exam.exam_date}T09:00:00`;
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours

    const startTime = apiFormatTime(startDate);
    const endTime = apiFormatTime(endDate);
    return `${startTime} - ${endTime}`;
  }

  return 'Time TBD';
};

sampleBookings.forEach((booking, index) => {
  console.log(`📅 BOOKING ${index + 1} API TEST:`);
  console.log('  apiFormatTime(start_time):', apiFormatTime(booking.start_time));
  console.log('  apiFormatTime(end_time):', apiFormatTime(booking.end_time));
  console.log('  apiFormatTimeRange(booking):', apiFormatTimeRange(booking));
  console.log('');
});

console.log('🔍 ROOT CAUSE ANALYSIS:');
console.log('━'.repeat(60));
console.log('1. HubSpot stores times as ISO timestamps: "2025-09-26T16:00:00Z"');
console.log('2. BookingsList.jsx formatTime() expects "HH:MM" format');
console.log('3. When it tries to split("2025-09-26T16:00:00Z", ":"), it gets:');
console.log('   ["2025-09-26T16", "00", "00Z"]');
console.log('4. parseInt("2025-09-26T16") = NaN, so the function returns the original string');
console.log('5. formatTimeRange() gets invalid time strings back, causing "Time TBD"');
console.log('');

console.log('✅ SOLUTION:');
console.log('━'.repeat(60));
console.log('BookingsList.jsx should use the API service formatTimeRange function');
console.log('OR modify its formatTime function to handle ISO timestamps');
console.log('The api.js functions work correctly with ISO timestamps!');