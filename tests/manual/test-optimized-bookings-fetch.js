/**
 * Test script to verify optimized booking fetch implementation
 * Tests the improved getBookingsForContact method that:
 * 1. Fetches correct properties directly from bookings
 * 2. Uses batch operations to avoid N+1 queries
 * 3. Maintains backward compatibility
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testOptimizedBookingsFetch() {
  const hubspot = new HubSpotService();

  // Test credentials
  const testCases = [
    {
      studentId: 'MD24011',
      email: 'harmon.tuazon@gmail.com',
      filter: 'all',
      page: 1,
      limit: 10
    }
  ];

  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(80));
    console.log(`Testing: ${testCase.studentId} - ${testCase.email}`);
    console.log('='.repeat(80));

    try {
      // Step 1: Find contact
      console.log('\n📋 Step 1: Finding contact...');
      const startAuth = Date.now();

      const contact = await hubspot.searchContacts(testCase.studentId, testCase.email);
      if (!contact) {
        console.log('❌ Contact not found');
        continue;
      }

      const authTime = Date.now() - startAuth;
      console.log(`✅ Contact found in ${authTime}ms:`, {
        id: contact.id,
        name: `${contact.properties.firstname} ${contact.properties.lastname}`,
        credits: {
          sj: contact.properties.sj_credits,
          cs: contact.properties.cs_credits,
          mini: contact.properties.sjmini_credits,
          shared: contact.properties.shared_mock_credits
        }
      });

      // Step 2: Test optimized booking fetch
      console.log('\n📋 Step 2: Fetching bookings (OPTIMIZED)...');
      const startFetch = Date.now();

      const bookingsResult = await hubspot.getBookingsForContact(
        contact.id,
        {
          filter: testCase.filter,
          page: testCase.page,
          limit: testCase.limit
        }
      );

      const fetchTime = Date.now() - startFetch;
      console.log(`✅ Bookings fetched in ${fetchTime}ms`);

      // Step 3: Analyze results
      console.log('\n📊 Results Analysis:');
      console.log({
        totalBookings: bookingsResult.total,
        returnedBookings: bookingsResult.bookings.length,
        pagination: bookingsResult.pagination,
        timeTaken: `${fetchTime}ms`
      });

      // Step 4: Verify data structure
      if (bookingsResult.bookings.length > 0) {
        console.log('\n🔍 Sample Booking Structure:');
        const sampleBooking = bookingsResult.bookings[0];

        // Check for required properties
        const requiredProps = [
          'id',
          'booking_id',
          'booking_number',
          'name',
          'email',
          'mock_type',
          'exam_date',
          'location',
          'start_time',
          'end_time',
          'status',
          'mock_exam'
        ];

        const missingProps = requiredProps.filter(prop => !(prop in sampleBooking));
        const presentProps = requiredProps.filter(prop => prop in sampleBooking);

        console.log('✅ Present properties:', presentProps.join(', '));
        if (missingProps.length > 0) {
          console.log('⚠️ Missing properties:', missingProps.join(', '));
        }

        // Display sample booking details
        console.log('\n📋 Sample Booking Details:');
        console.log({
          id: sampleBooking.id,
          booking_id: sampleBooking.booking_id,
          mock_type: sampleBooking.mock_type,
          exam_date: sampleBooking.exam_date,
          location: sampleBooking.location,
          start_time: sampleBooking.start_time,
          end_time: sampleBooking.end_time,
          status: sampleBooking.status
        });

        // Check if mock_exam nested structure exists for backward compatibility
        if (sampleBooking.mock_exam) {
          console.log('\n✅ Backward compatible mock_exam structure present');
        } else {
          console.log('\n⚠️ Missing backward compatible mock_exam structure');
        }
      }

      // Step 5: Test different filters
      console.log('\n📋 Step 5: Testing filters...');

      for (const filterType of ['upcoming', 'past']) {
        const filterStart = Date.now();

        const filteredResult = await hubspot.getBookingsForContact(
          contact.id,
          {
            filter: filterType,
            page: 1,
            limit: 5
          }
        );

        const filterTime = Date.now() - filterStart;

        console.log(`\n${filterType.toUpperCase()} bookings:`, {
          count: filteredResult.total,
          fetchTime: `${filterTime}ms`,
          firstPage: filteredResult.bookings.length
        });

        // Verify filtering works correctly
        if (filteredResult.bookings.length > 0) {
          const now = new Date();
          const allCorrect = filteredResult.bookings.every(booking => {
            const examDate = new Date(booking.exam_date);
            const isUpcoming = examDate >= now;
            return filterType === 'upcoming' ? isUpcoming : !isUpcoming;
          });

          if (allCorrect) {
            console.log(`✅ All ${filterType} bookings have correct dates`);
          } else {
            console.log(`❌ Some bookings don't match ${filterType} filter`);
          }
        }
      }

      // Step 6: Performance comparison summary
      console.log('\n📊 Performance Summary:');
      console.log({
        authenticationTime: `${authTime}ms`,
        initialFetchTime: `${fetchTime}ms`,
        totalTime: `${authTime + fetchTime}ms`,
        bookingsPerSecond: Math.round((bookingsResult.bookings.length / (fetchTime / 1000)) * 100) / 100
      });

      // Step 7: Check for N+1 query indicators
      console.log('\n🔍 Query Optimization Check:');
      if (fetchTime < 2000) {
        console.log('✅ Fast response time indicates batch operations are working');
      } else if (fetchTime < 5000) {
        console.log('⚠️ Moderate response time - some optimization may be needed');
      } else {
        console.log('❌ Slow response time - possible N+1 query issue');
      }

    } catch (error) {
      console.error('\n❌ Test failed:', {
        message: error.message,
        status: error.status || error.response?.status,
        details: error.response?.data
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Testing complete!');
  console.log('='.repeat(80));
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting optimized bookings fetch test...\n');
  testOptimizedBookingsFetch()
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testOptimizedBookingsFetch };