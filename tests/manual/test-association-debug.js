/**
 * Test to debug association fetching for bookings
 * This test uses the correct student ID from HubSpot
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testBookingsWithAssociations() {
  console.log('🔍 Testing booking associations with correct credentials...\n');

  // Use the correct student ID from HubSpot
  const credentials = {
    student_id: '159999999',  // Correct student ID from HubSpot
    email: 'htuazon@prepdoctors.com'
  };

  try {
    console.log('📋 Test credentials:', credentials);
    console.log('📡 API endpoint:', `${API_BASE_URL}/bookings`);
    console.log('🔄 Filter: all\n');

    const response = await axios.get(`${API_BASE_URL}/bookings`, {
      params: {
        student_id: credentials.student_id,
        email: credentials.email,
        filter: 'all'
      }
    });

    console.log('\n✅ API Response Status:', response.status);
    console.log('📊 Total bookings found:', response.data.bookings?.length || 0);

    if (response.data.bookings && response.data.bookings.length > 0) {
      console.log('\n📚 Bookings with association data:');
      response.data.bookings.forEach((booking, idx) => {
        console.log(`\n[${idx + 1}] Booking ${booking.id}:`, {
          booking_id: booking.booking_id,
          mock_type: booking.mock_type,
          exam_date: booking.exam_date,
          has_mock_exam: !!booking.mock_exam,
          status: booking.status
        });
      });
    }

    console.log('\n🔍 Check server logs for detailed association debugging!');
    console.log('Look for:');
    console.log('- [ASSOCIATION FETCH] messages');
    console.log('- [ASSOCIATION API] endpoint calls');
    console.log('- [ASSOCIATION RESPONSE] results');
    console.log('- [BATCH READ] mock exam fetching');
    console.log('- [CRITICAL] error messages if associations fail');

  } catch (error) {
    if (error.response) {
      console.error('\n❌ API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.error('\n❌ Request failed:', error.message);
    }
  }
}

// Run the test
testBookingsWithAssociations().catch(console.error);