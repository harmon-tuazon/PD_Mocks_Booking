/**
 * DEBUG TEST: Booking Filtering Issue Investigation
 *
 * This script investigates why 3 bookings are being found initially
 * but then filtered down to 0, causing "No bookings found" to display.
 *
 * Expected behavior: Backend logs show "3 bookings missing mock exam properties"
 * but then "Successfully processed 0 bookings (filter: upcoming)"
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function investigateBookingFiltering() {
  const hubspot = new HubSpotService();

  // Test credentials that show the issue
  const studentId = 'MD24011';
  const email = 'harmon.tuazon@gmail.com';
  const filters = ['all', 'upcoming', 'past'];

  console.log('🔍 BOOKING FILTERING DEBUG TEST');
  console.log('=' .repeat(80));
  console.log(`Testing student: ${studentId} - ${email}`);
  console.log('=' .repeat(80));

  try {
    // Step 1: Find and authenticate contact
    console.log('\n📋 Step 1: Finding contact...');
    const contact = await hubspot.searchContacts(studentId, email);

    if (!contact) {
      console.error('❌ Contact not found - stopping test');
      return;
    }

    console.log('✅ Contact found:', {
      id: contact.id,
      name: `${contact.properties.firstname} ${contact.properties.lastname}`,
      email: contact.properties.email
    });

    // Step 2: Test each filter type to see where bookings are lost
    for (const filter of filters) {
      console.log(`\n${'='.repeat(40)}`);
      console.log(`🔍 TESTING FILTER: ${filter.toUpperCase()}`);
      console.log(`${'='.repeat(40)}`);

      try {
        const startTime = Date.now();

        // Call the method with enhanced logging
        const result = await hubspot.getBookingsForContact(contact.id, {
          filter: filter,
          page: 1,
          limit: 10
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\n📊 RESULTS SUMMARY for filter "${filter}":`);
        console.log({
          total_bookings: result.total,
          returned_bookings: result.bookings.length,
          fetch_time: `${duration}ms`,
          pagination: result.pagination
        });

        // If we get results, analyze the first booking structure
        if (result.bookings.length > 0) {
          console.log(`\n📋 SAMPLE BOOKING (${filter} filter):`);
          const sample = result.bookings[0];

          console.log({
            id: sample.id,
            booking_id: sample.booking_id,
            mock_type: sample.mock_type,
            exam_date: sample.exam_date,
            status: sample.status,
            location: sample.location,
            start_time: sample.start_time,
            end_time: sample.end_time
          });

          // Analyze date to understand why it might be filtered
          if (sample.exam_date) {
            const examDate = new Date(sample.exam_date);
            const now = new Date();
            const timeDiff = examDate - now;
            const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

            console.log(`\n📅 DATE ANALYSIS for booking ${sample.booking_id}:`);
            console.log({
              exam_date_raw: sample.exam_date,
              exam_date_parsed: examDate.toISOString(),
              current_time: now.toISOString(),
              time_difference_ms: timeDiff,
              days_until_exam: daysDiff,
              is_in_future: timeDiff > 0,
              should_be_upcoming: timeDiff > 0,
              actual_status: sample.status
            });
          }
        } else {
          console.log(`⚠️ No bookings returned for filter: ${filter}`);

          if (filter === 'upcoming') {
            console.log('\n🚨 CRITICAL: This is the issue! "upcoming" filter returns 0 bookings');
            console.log('   This explains why the frontend shows "No bookings found"');
            console.log('   The bookings exist but are being incorrectly filtered out');
          }
        }

      } catch (error) {
        console.error(`❌ Error testing filter "${filter}":`, {
          message: error.message,
          status: error.status,
          details: error.response?.data
        });
      }
    }

    // Step 3: Direct association test to verify bookings actually exist
    console.log(`\n${'='.repeat(50)}`);
    console.log('🔍 RAW ASSOCIATION TEST');
    console.log(`${'='.repeat(50)}`);

    try {
      console.log('\n📋 Getting raw booking associations...');
      const bookingIds = await hubspot.getContactBookingAssociations(contact.id);

      console.log('✅ Raw association results:', {
        booking_ids_found: bookingIds.length,
        booking_ids: bookingIds
      });

      if (bookingIds.length > 0) {
        console.log('\n📋 Testing batch read of booking objects...');

        // Test batch read like the main method does
        const batchReadPayload = {
          inputs: bookingIds.map(id => ({ id })),
          properties: [
            'booking_id',
            'mock_type',
            'location',
            'start_time',
            'end_time',
            'exam_date',
            'is_active',
            'name',
            'email',
            'dominant_hand',
            'hs_createdate',
            'hs_object_id'
          ]
        };

        const bookingsResponse = await hubspot.apiCall(
          'POST',
          `/crm/v3/objects/${hubspot.constructor.name.includes('HubSpotService') ? '2-50158943' : 'bookings'}/batch/read`,
          batchReadPayload
        );

        console.log('✅ Batch read results:', {
          requested_bookings: bookingIds.length,
          returned_bookings: bookingsResponse?.results?.length || 0,
          success: !!(bookingsResponse?.results && bookingsResponse.results.length > 0)
        });

        if (bookingsResponse?.results && bookingsResponse.results.length > 0) {
          console.log('\n📋 Raw booking object analysis:');

          for (let i = 0; i < Math.min(3, bookingsResponse.results.length); i++) {
            const booking = bookingsResponse.results[i];
            console.log(`\nBooking ${i + 1}:`, {
              id: booking.id,
              booking_id: booking.properties.booking_id,
              has_mock_type: !!booking.properties.mock_type,
              has_exam_date: !!booking.properties.exam_date,
              mock_type: booking.properties.mock_type,
              exam_date: booking.properties.exam_date,
              raw_properties: Object.keys(booking.properties)
            });
          }
        }
      } else {
        console.log('⚠️ No booking associations found - this might be the root cause');
      }

    } catch (assocError) {
      console.error('❌ Association test failed:', {
        message: assocError.message,
        status: assocError.status
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 DEBUG TEST COMPLETE');
  console.log('='.repeat(80));
}

// Enhanced direct API test to see raw data
async function testDirectAPIEndpoint() {
  const axios = require('axios');
  const apiUrl = process.env.VERCEL_URL || 'http://localhost:3000';

  console.log('\n🌐 TESTING DIRECT API ENDPOINT');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${apiUrl}/api/bookings/list`, {
      params: {
        student_id: 'MD24011',
        email: 'harmon.tuazon@gmail.com',
        filter: 'upcoming',
        page: 1,
        limit: 10
      },
      timeout: 30000
    });

    console.log('✅ API Response:', {
      status: response.status,
      total_bookings: response.data.data?.pagination?.total_bookings || 0,
      returned_bookings: response.data.data?.bookings?.length || 0,
      message: response.data.message
    });

    if (response.data.data?.bookings?.length > 0) {
      console.log('📋 Sample booking from API:');
      console.log(response.data.data.bookings[0]);
    } else {
      console.log('⚠️ API returned no bookings - confirming the issue');
    }

  } catch (error) {
    console.error('❌ API test failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
  }
}

// Run the investigation
if (require.main === module) {
  console.log('🚀 Starting booking filtering investigation...\n');

  investigateBookingFiltering()
    .then(() => {
      // Also test the direct API endpoint
      return testDirectAPIEndpoint();
    })
    .then(() => {
      console.log('\n✅ Investigation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Investigation failed:', error);
      process.exit(1);
    });
}

module.exports = { investigateBookingFiltering, testDirectAPIEndpoint };