/**
 * Manual test script for DELETE /api/bookings/[id]
 * Tests booking cancellation with credit restoration
 *
 * Usage: node tests/manual/test-delete-booking.js [booking_id] [student_id] [email]
 * Example: node tests/manual/test-delete-booking.js 123456789 STUDENT123 john.doe@example.com
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testDeleteBooking() {
  const [,, bookingId, studentId, email] = process.argv;

  if (!bookingId || !studentId || !email) {
    console.error('❌ Missing required parameters');
    console.log('Usage: node test-delete-booking.js [booking_id] [student_id] [email]');
    console.log('Example: node test-delete-booking.js 123456789 STUDENT123 john.doe@example.com');
    process.exit(1);
  }

  console.log('🧪 Testing DELETE /api/bookings/[id]');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Configuration:');
  console.log(`- API URL: ${API_BASE_URL}`);
  console.log(`- Booking ID: ${bookingId}`);
  console.log(`- Student ID: ${studentId}`);
  console.log(`- Email: ${email}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: First get the booking details to see what we're canceling
    console.log('📋 Step 1: Fetching booking details...');
    const getResponse = await axios.get(`${API_BASE_URL}/api/bookings/${bookingId}`, {
      params: {
        student_id: studentId,
        email: email
      }
    });

    console.log('✅ Booking found:');
    console.log(JSON.stringify(getResponse.data.data.booking, null, 2));

    if (getResponse.data.data.mock_exam) {
      console.log('\n📅 Mock Exam:');
      console.log(JSON.stringify(getResponse.data.data.mock_exam, null, 2));
    }

    // Ask for confirmation
    console.log('\n⚠️  Are you sure you want to cancel this booking? (y/n)');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Cancellation aborted');
      process.exit(0);
    }

    // Step 2: Cancel the booking
    console.log('\n🗑️ Step 2: Canceling booking...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/api/bookings/${bookingId}`, {
      params: { id: bookingId }, // ID in query params for Vercel
      data: {
        student_id: studentId,
        email: email,
        reason: 'Manual test cancellation'
      }
    });

    console.log('✅ Booking canceled successfully!');
    console.log('\n📊 Cancellation Result:');
    console.log(JSON.stringify(deleteResponse.data, null, 2));

    // Display key information
    if (deleteResponse.data.data) {
      const { canceled_booking, credits_restored, mock_exam_updated } = deleteResponse.data.data;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📌 Summary:');
      console.log(`- Booking ID: ${canceled_booking.booking_id}`);
      console.log(`- Mock Type: ${canceled_booking.mock_type}`);
      console.log(`- Exam Date: ${canceled_booking.exam_date}`);
      console.log(`- Credits Restored: ${credits_restored.amount} ${credits_restored.credit_type}`);
      console.log(`- New Credit Balance: ${credits_restored.new_balance}`);
      console.log(`- Mock Exam Bookings: ${mock_exam_updated.new_total_bookings}/${mock_exam_updated.available_slots + mock_exam_updated.new_total_bookings}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Step 3: Try to fetch the booking again to confirm it's deleted
    console.log('\n🔍 Step 3: Verifying deletion...');
    try {
      await axios.get(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        params: {
          student_id: studentId,
          email: email
        }
      });
      console.log('⚠️  Warning: Booking still exists (might be cached)');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Confirmed: Booking has been deleted');
      } else {
        console.log('⚠️  Could not verify deletion:', error.response?.data?.error || error.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));

      // Provide helpful error messages
      switch (error.response.status) {
        case 400:
          console.error('\n💡 Tip: Check that all required parameters are provided correctly');
          break;
        case 401:
          console.error('\n💡 Tip: Verify that the student_id and email match a valid contact in HubSpot');
          break;
        case 403:
          console.error('\n💡 Tip: The booking does not belong to this student');
          break;
        case 404:
          console.error('\n💡 Tip: The booking ID does not exist');
          break;
        case 409:
          console.error('\n💡 Tip: The booking might already be canceled or the exam is in the past');
          break;
        case 500:
          console.error('\n💡 Tip: Server error - check the server logs for more details');
          break;
      }
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Run the test
testDeleteBooking().catch(console.error);