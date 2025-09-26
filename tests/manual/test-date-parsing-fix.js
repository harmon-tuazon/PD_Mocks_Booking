/**
 * Test script to verify the date parsing fixes
 * This tests the date parsing logic without requiring API calls
 */

function testDateParsing() {
  console.log('🔍 TESTING DATE PARSING FIXES');
  console.log('='.repeat(50));

  // Test cases that might be causing the issue
  const testCases = [
    // Common HubSpot date formats
    '2024-12-01',
    '2024-12-01T10:00:00.000Z',
    '2024-12-01T10:00:00',
    '2024-12-01 10:00:00',
    // Timestamp formats
    '1733040000000',  // milliseconds
    1733040000000,    // number
    // Invalid formats
    null,
    undefined,
    '',
    'invalid-date',
    '2024-13-01',  // invalid month
  ];

  const now = new Date();
  const nowTimestamp = now.getTime();

  console.log(`\n⏰ Current time reference:`, {
    now: now.toISOString(),
    timestamp: nowTimestamp
  });

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1}: ${JSON.stringify(testCase)} ---`);

    // Apply the same parsing logic as in our fix
    const examDateRaw = testCase;
    let examDate;
    let isValidDate = false;

    try {
      // First try direct parsing
      examDate = new Date(examDateRaw);

      // Check if the parsed date is valid
      if (!isNaN(examDate.getTime())) {
        isValidDate = true;
      } else {
        // Try parsing as timestamp if it's a number
        if (!isNaN(Number(examDateRaw))) {
          examDate = new Date(Number(examDateRaw));
          isValidDate = !isNaN(examDate.getTime());
        }
      }

      // If still invalid, try parsing as ISO string with timezone handling
      if (!isValidDate && typeof examDateRaw === 'string') {
        // Handle potential timezone issues
        examDate = new Date(examDateRaw.replace(' ', 'T'));
        isValidDate = !isNaN(examDate.getTime());
      }
    } catch (dateError) {
      console.log(`❌ Parse error: ${dateError.message}`);
      isValidDate = false;
    }

    if (isValidDate) {
      const examDateTimestamp = examDate.getTime();
      const isUpcoming = examDateTimestamp >= nowTimestamp;
      const status = isUpcoming ? 'upcoming' : 'past';
      const daysDiff = Math.round((examDateTimestamp - nowTimestamp) / (1000 * 60 * 60 * 24));

      console.log(`✅ Valid date:`, {
        parsed: examDate.toISOString(),
        timestamp: examDateTimestamp,
        status: status,
        days_from_now: daysDiff
      });
    } else {
      console.log(`❌ Invalid date - would be excluded`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ Date parsing test complete');
}

// Test filtering logic
function testFilteringLogic() {
  console.log('\n🔍 TESTING FILTERING LOGIC');
  console.log('='.repeat(50));

  const mockBookings = [
    {
      id: '1',
      exam_date: '2024-12-25T10:00:00.000Z', // Future
      mock_type: 'Clinical Skills'
    },
    {
      id: '2',
      exam_date: '2023-06-01T14:00:00.000Z', // Past
      mock_type: 'Situational Judgment'
    },
    {
      id: '3',
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      mock_type: 'Mini-mock'
    }
  ];

  const filters = ['all', 'upcoming', 'past'];
  const now = new Date();
  const nowTimestamp = now.getTime();

  filters.forEach(filter => {
    console.log(`\n--- Testing filter: ${filter} ---`);
    const filteredBookings = [];

    for (const booking of mockBookings) {
      const examDate = new Date(booking.exam_date);
      const examDateTimestamp = examDate.getTime();
      const isUpcoming = examDateTimestamp >= nowTimestamp;
      const status = isUpcoming ? 'upcoming' : 'past';

      console.log(`Booking ${booking.id}: ${status} (${booking.exam_date})`);

      if (filter === 'all' || filter === status) {
        filteredBookings.push(booking);
        console.log(`  ✅ Included`);
      } else {
        console.log(`  ❌ Excluded`);
      }
    }

    console.log(`Filter "${filter}" result: ${filteredBookings.length} bookings`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ Filtering logic test complete');
}

// Run all tests
if (require.main === module) {
  testDateParsing();
  testFilteringLogic();

  console.log('\n🎉 All tests completed!');
}

module.exports = { testDateParsing, testFilteringLogic };