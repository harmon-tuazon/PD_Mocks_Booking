/**
 * Test the actual DELETE endpoint to see the debug logs
 */

require('dotenv').config();
const axios = require('axios');

async function testDeleteEndpoint() {
  const testBookingId = '35117316788';
  const apiUrl = 'https://mocksbooking-lbfnglc44-prepdoctors.vercel.app'; // Production URL

  try {
    console.log(`🔍 Testing DELETE endpoint for booking ID: ${testBookingId}`);

    const response = await axios.delete(`${apiUrl}/api/bookings/${testBookingId}`, {
      data: {
        student_id: '159999999', // Correct student ID from investigation
        email: 'htuazon@prepdoctors.com',
        reason: 'Test deletion'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ DELETE request successful:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    console.error('❌ DELETE request failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    // Check if it's a CORS issue or authentication issue
    if (error.code === 'ECONNREFUSED') {
      console.log('🔍 Connection refused - server may be down');
    } else if (error.response?.status === 401) {
      console.log('🔍 Authentication failed - check credentials');
    } else if (error.response?.status === 404) {
      console.log('🔍 Booking not found - ID may be incorrect');
    } else if (error.response?.status === 403) {
      console.log('🔍 Access denied - booking may not belong to user');
    }
  }
}

// Run the test
testDeleteEndpoint().catch(console.error);