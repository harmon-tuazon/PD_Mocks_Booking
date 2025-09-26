/**
 * Test the GET endpoint first to see if authentication works
 */

require('dotenv').config();
const axios = require('axios');

async function testGetEndpoint() {
  const testBookingId = '35117316788';
  const apiUrl = 'https://mocksbooking-lbfnglc44-prepdoctors.vercel.app';

  try {
    console.log(`🔍 Testing GET endpoint for booking ID: ${testBookingId}`);

    const response = await axios.get(`${apiUrl}/api/bookings/${testBookingId}`, {
      params: {
        student_id: 'MD24011',
        email: 'htuazon@prepdoctors.com'
      },
      timeout: 30000
    });

    console.log('✅ GET request successful:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    console.error('❌ GET request failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

// Run the test
testGetEndpoint().catch(console.error);