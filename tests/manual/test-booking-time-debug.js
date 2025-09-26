/**
 * Debug script to investigate why booking times show "Time TBD - Time TBD"
 * This script will trace the exact data flow from HubSpot to frontend display
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function debugBookingTimes() {
  console.log('🔍 BOOKING TIME DEBUG - Starting investigation...\n');

  try {
    const hubspot = new HubSpotService();

    // Test with actual sample data found from HubSpot
    const testStudentId = 'test@prepdoctors.ca'; // Use email as student ID for testing
    const testEmail = 'test@prepdoctors.ca'; // Use test email from actual booking data

    console.log('📋 Step 1: Finding contact...');
    const contact = await hubspot.searchContacts(testStudentId, testEmail);

    if (!contact) {
      console.log('❌ No contact found with provided credentials');
      console.log('🔧 Please update testStudentId and testEmail in this script with real values');
      return;
    }

    console.log('✅ Contact found:', {
      id: contact.id,
      name: `${contact.properties.firstname} ${contact.properties.lastname}`,
      email: contact.properties.email
    });

    console.log('\n📋 Step 2: Getting contact\'s booking associations...');
    const bookingIds = await hubspot.getContactBookingAssociations(contact.id);

    if (bookingIds.length === 0) {
      console.log('❌ No booking associations found for this contact');
      return;
    }

    console.log(`✅ Found ${bookingIds.length} booking associations:`, bookingIds);

    console.log('\n📋 Step 3: Batch reading booking objects...');
    const bookingProperties = [
      'booking_id',
      'mock_type',
      'location',
      'start_time',      // KEY PROPERTY
      'end_time',        // KEY PROPERTY
      'exam_date',
      'is_active',
      'name',
      'email',
      'dominant_hand',
      'hs_createdate',
      'hs_object_id'
    ];

    const batchReadPayload = {
      inputs: bookingIds.map(id => ({ id })),
      properties: bookingProperties
    };

    const bookingsResponse = await hubspot.apiCall(
      'POST',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/batch/read`,
      batchReadPayload
    );

    console.log(`✅ Retrieved ${bookingsResponse.results.length} booking objects`);

    console.log('\n📋 Step 4: Analyzing booking data for time properties...');

    for (let i = 0; i < bookingsResponse.results.length; i++) {
      const booking = bookingsResponse.results[i];

      console.log(`\n🔍 BOOKING ${i + 1} ANALYSIS:`);
      console.log('─'.repeat(50));
      console.log('Basic Info:', {
        hubspot_id: booking.id,
        booking_id: booking.properties.booking_id,
        mock_type: booking.properties.mock_type,
        exam_date: booking.properties.exam_date
      });

      console.log('TIME PROPERTIES ANALYSIS:');
      console.log('  start_time:', {
        value: booking.properties.start_time,
        type: typeof booking.properties.start_time,
        isNull: booking.properties.start_time === null,
        isUndefined: booking.properties.start_time === undefined,
        isEmpty: booking.properties.start_time === ''
      });

      console.log('  end_time:', {
        value: booking.properties.end_time,
        type: typeof booking.properties.end_time,
        isNull: booking.properties.end_time === null,
        isUndefined: booking.properties.end_time === undefined,
        isEmpty: booking.properties.end_time === ''
      });

      // Check if booking has time data OR needs association lookup
      if (!booking.properties.start_time && !booking.properties.end_time) {
        console.log('⚠️  NO TIME DATA ON BOOKING - Need to check mock exam association');

        console.log('\n📋 Step 4a: Getting mock exam association for this booking...');
        try {
          const mockExamAssocs = await hubspot.apiCall(
            'GET',
            `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${booking.id}/associations/${HUBSPOT_OBJECTS.mock_exams}`
          );

          if (mockExamAssocs?.results && mockExamAssocs.results.length > 0) {
            const mockExamId = mockExamAssocs.results[0].toObjectId;
            console.log(`✅ Found mock exam association: ${mockExamId}`);

            console.log('\n📋 Step 4b: Getting mock exam details...');
            const mockExam = await hubspot.getMockExam(mockExamId);

            console.log('MOCK EXAM TIME PROPERTIES:');
            console.log('  start_time:', {
              value: mockExam.properties.start_time,
              type: typeof mockExam.properties.start_time,
              isNull: mockExam.properties.start_time === null,
              isUndefined: mockExam.properties.start_time === undefined,
              isEmpty: mockExam.properties.start_time === ''
            });

            console.log('  end_time:', {
              value: mockExam.properties.end_time,
              type: typeof mockExam.properties.end_time,
              isNull: mockExam.properties.end_time === null,
              isUndefined: mockExam.properties.end_time === undefined,
              isEmpty: mockExam.properties.end_time === ''
            });

          } else {
            console.log('❌ No mock exam association found');
          }
        } catch (assocError) {
          console.log('❌ Error getting mock exam association:', assocError.message);
        }
      } else {
        console.log('✅ TIME DATA FOUND ON BOOKING OBJECT');
      }
    }

    console.log('\n📋 Step 5: Testing frontend formatTimeRange function...');

    // Simulate the frontend formatTimeRange function
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

    const formatTimeRange = (startTime, endTime) => {
      if (!startTime && !endTime) return 'Time TBD';
      if (!endTime) return formatTime(startTime);
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    };

    // Test with sample data
    console.log('\nTesting formatTimeRange with different inputs:');
    console.log('  formatTimeRange(null, null):', formatTimeRange(null, null));
    console.log('  formatTimeRange(undefined, undefined):', formatTimeRange(undefined, undefined));
    console.log('  formatTimeRange("", ""):', formatTimeRange("", ""));
    console.log('  formatTimeRange("09:00", "12:00"):', formatTimeRange("09:00", "12:00"));
    console.log('  formatTimeRange("14:30", "17:30"):', formatTimeRange("14:30", "17:30"));

    console.log('\n🔍 DIAGNOSIS COMPLETE');
    console.log('─'.repeat(50));
    console.log('SUMMARY:');
    console.log('1. Check the TIME PROPERTIES ANALYSIS above');
    console.log('2. If start_time/end_time are null/undefined on both booking and mock exam objects,');
    console.log('   then the issue is that HubSpot doesn\'t have this data populated');
    console.log('3. If the data exists but shows "Time TBD", then there\'s a frontend processing issue');
    console.log('4. The frontend formatTimeRange function works correctly with proper time strings');

  } catch (error) {
    console.error('❌ Debug script error:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
  }
}

// Run the debug
debugBookingTimes();