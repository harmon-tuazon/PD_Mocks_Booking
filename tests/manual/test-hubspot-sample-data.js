/**
 * Script to find sample student and booking data for testing
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function findSampleData() {
  console.log('🔍 FINDING SAMPLE DATA - Looking for contacts with bookings...\n');

  try {
    const hubspot = new HubSpotService();

    console.log('📋 Step 1: Getting sample contacts with student_id...');

    // Search for any contacts with student_id
    const searchPayload = {
      filterGroups: [{
        filters: [{
          propertyName: 'student_id',
          operator: 'HAS_PROPERTY'
        }]
      }],
      properties: [
        'student_id',
        'firstname',
        'lastname',
        'email',
        'sj_credits',
        'cs_credits',
        'sjmini_credits',
        'shared_mock_credits',
        'hs_object_id'
      ],
      limit: 5
    };

    const contactsResult = await hubspot.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.contacts}/search`, searchPayload);

    if (!contactsResult.results || contactsResult.results.length === 0) {
      console.log('❌ No contacts found with student_id property');
      return;
    }

    console.log(`✅ Found ${contactsResult.results.length} contacts with student_id:`);

    for (let i = 0; i < contactsResult.results.length; i++) {
      const contact = contactsResult.results[i];
      console.log(`\n👤 CONTACT ${i + 1}:`);
      console.log('  Student ID:', contact.properties.student_id);
      console.log('  Name:', `${contact.properties.firstname} ${contact.properties.lastname}`);
      console.log('  Email:', contact.properties.email);
      console.log('  HubSpot ID:', contact.id);

      // Check if this contact has booking associations
      try {
        const bookingIds = await hubspot.getContactBookingAssociations(contact.id);
        console.log(`  Bookings: ${bookingIds.length} found`);

        if (bookingIds.length > 0) {
          console.log('  📋 This contact has bookings! Good for testing.');
          console.log(`  🔧 Test credentials: student_id="${contact.properties.student_id}", email="${contact.properties.email}"`);
        }
      } catch (error) {
        console.log(`  Bookings: Error checking (${error.message})`);
      }
    }

    console.log('\n📋 Step 2: Getting sample bookings...');

    // Get some sample bookings
    const bookingsSearchPayload = {
      filterGroups: [{
        filters: [{
          propertyName: 'booking_id',
          operator: 'HAS_PROPERTY'
        }]
      }],
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
        'hs_object_id'
      ],
      limit: 3
    };

    const bookingsResult = await hubspot.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/search`, bookingsSearchPayload);

    if (bookingsResult.results && bookingsResult.results.length > 0) {
      console.log(`\n✅ Found ${bookingsResult.results.length} sample bookings:`);

      for (let i = 0; i < bookingsResult.results.length; i++) {
        const booking = bookingsResult.results[i];
        console.log(`\n📅 BOOKING ${i + 1}:`);
        console.log('  Booking ID:', booking.properties.booking_id);
        console.log('  HubSpot ID:', booking.id);
        console.log('  Mock Type:', booking.properties.mock_type);
        console.log('  Exam Date:', booking.properties.exam_date);
        console.log('  Start Time:', booking.properties.start_time);
        console.log('  End Time:', booking.properties.end_time);
        console.log('  Location:', booking.properties.location);
        console.log('  Student Email:', booking.properties.email);
      }
    } else {
      console.log('❌ No sample bookings found');
    }

    console.log('\n📋 Step 3: Getting sample mock exams...');

    // Get some sample mock exams to see their time structure
    const mockExamsSearchPayload = {
      filterGroups: [{
        filters: [{
          propertyName: 'is_active',
          operator: 'EQ',
          value: 'true'
        }]
      }],
      properties: [
        'exam_date',
        'start_time',
        'end_time',
        'capacity',
        'total_bookings',
        'mock_type',
        'location',
        'is_active'
      ],
      limit: 3
    };

    const mockExamsResult = await hubspot.apiCall('POST', `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/search`, mockExamsSearchPayload);

    if (mockExamsResult.results && mockExamsResult.results.length > 0) {
      console.log(`\n✅ Found ${mockExamsResult.results.length} sample mock exams:`);

      for (let i = 0; i < mockExamsResult.results.length; i++) {
        const mockExam = mockExamsResult.results[i];
        console.log(`\n🎯 MOCK EXAM ${i + 1}:`);
        console.log('  HubSpot ID:', mockExam.id);
        console.log('  Mock Type:', mockExam.properties.mock_type);
        console.log('  Exam Date:', mockExam.properties.exam_date);
        console.log('  Start Time:', mockExam.properties.start_time);
        console.log('  End Time:', mockExam.properties.end_time);
        console.log('  Location:', mockExam.properties.location);
        console.log('  Total Bookings:', mockExam.properties.total_bookings);
      }
    } else {
      console.log('❌ No sample mock exams found');
    }

  } catch (error) {
    console.error('❌ Error finding sample data:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
  }
}

// Run the sample data finder
findSampleData();