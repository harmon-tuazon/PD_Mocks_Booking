/**
 * Test script for booking cancellation (DELETE /api/bookings/[id])
 *
 * This test verifies:
 * 1. Direct HubSpot DELETE API call
 * 2. Credit restoration
 * 3. Mock exam capacity update
 * 4. Proper error handling
 */

require('dotenv').config();
const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_BOOKING_ID = process.env.TEST_BOOKING_ID || '188793366491'; // Replace with actual booking ID
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'test-student-123';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log('='.repeat(60), 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Test booking cancellation
 */
async function testCancelBooking() {
  logSection('Testing Booking Cancellation (DELETE)');

  try {
    // Step 1: First get the booking details
    logInfo('Fetching booking details...');
    const getResponse = await axios.get(
      `${BASE_URL}/bookings/${TEST_BOOKING_ID}`,
      {
        params: {
          student_id: TEST_STUDENT_ID,
          email: TEST_EMAIL
        }
      }
    );

    const bookingData = getResponse.data.data;
    logSuccess(`Found booking: ${bookingData.booking.booking_id}`);
    logInfo(`Mock Type: ${bookingData.mock_exam?.mock_type || 'N/A'}`);
    logInfo(`Exam Date: ${bookingData.mock_exam?.exam_date || 'N/A'}`);
    logInfo(`Status: ${bookingData.booking.status}`);

    // Step 2: Check if booking can be cancelled
    if (bookingData.booking.status === 'canceled' || bookingData.booking.status === 'cancelled') {
      logWarning('Booking is already cancelled. Test will verify error handling.');
    }

    // Step 3: Attempt to cancel the booking
    logInfo('Attempting to cancel booking...');
    const cancelResponse = await axios.delete(
      `${BASE_URL}/bookings/${TEST_BOOKING_ID}`,
      {
        data: {
          student_id: TEST_STUDENT_ID,
          email: TEST_EMAIL,
          reason: 'Test cancellation via API test script'
        }
      }
    );

    if (cancelResponse.data.success) {
      logSuccess('Booking cancelled successfully!');

      const responseData = cancelResponse.data.data;

      // Display cancellation details
      logInfo('Cancellation Details:');
      console.log(JSON.stringify(responseData, null, 2));

      if (responseData.credits_restored) {
        logSuccess(`Credits restored: ${responseData.credits_restored.amount} ${responseData.credits_restored.credit_type}`);
        logInfo(`New balance: ${responseData.credits_restored.new_balance}`);
      }

      if (responseData.mock_exam_updated) {
        logSuccess(`Mock exam capacity updated`);
        logInfo(`New total bookings: ${responseData.mock_exam_updated.new_total_bookings}`);
        logInfo(`Available slots: ${responseData.mock_exam_updated.available_slots}`);
      }

      // Step 4: Verify deletion by trying to fetch the booking again
      logInfo('Verifying booking deletion...');
      try {
        await axios.get(
          `${BASE_URL}/bookings/${TEST_BOOKING_ID}`,
          {
            params: {
              student_id: TEST_STUDENT_ID,
              email: TEST_EMAIL
            }
          }
        );
        logError('Booking still exists after deletion!');
      } catch (error) {
        if (error.response?.status === 404) {
          logSuccess('Booking successfully deleted from HubSpot');
        } else {
          logWarning(`Unexpected error when verifying deletion: ${error.response?.data?.error || error.message}`);
        }
      }
    } else {
      logError('Cancellation failed: ' + cancelResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      logError(`Error ${status}: ${data.error || data.message || 'Unknown error'}`);

      // Handle specific error codes
      switch (status) {
        case 401:
          logInfo('Authentication failed. Check student ID and email.');
          break;
        case 403:
          logInfo('Access denied. Booking does not belong to this user.');
          break;
        case 404:
          logInfo('Booking not found.');
          break;
        case 409:
          logInfo('Conflict: Booking is already cancelled or exam is in the past.');
          break;
        default:
          if (data.code) {
            logInfo(`Error code: ${data.code}`);
          }
      }
    } else {
      logError(`Network error: ${error.message}`);
    }
  }
}

/**
 * Test direct HubSpot API verification
 */
async function verifyHubSpotDeletion() {
  logSection('Verifying HubSpot Object Deletion');

  if (!process.env.HS_PRIVATE_APP_TOKEN) {
    logWarning('HS_PRIVATE_APP_TOKEN not set. Skipping HubSpot verification.');
    return;
  }

  try {
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/2-50158943/${TEST_BOOKING_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HS_PRIVATE_APP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      logWarning('Booking still exists in HubSpot!');
      logInfo(`Object ID: ${response.data.id}`);
      logInfo(`Status: ${response.data.properties?.status || 'N/A'}`);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      logSuccess('Booking successfully deleted from HubSpot (404 response)');
    } else {
      logError(`HubSpot API error: ${error.response?.data?.message || error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🧪 Starting Booking Cancellation Tests', 'magenta');
  log('='.repeat(60), 'magenta');

  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Booking ID: ${TEST_BOOKING_ID}`);
  logInfo(`Student ID: ${TEST_STUDENT_ID}`);
  logInfo(`Email: ${TEST_EMAIL}`);

  // Run cancellation test
  await testCancelBooking();

  // Verify HubSpot deletion
  await verifyHubSpotDeletion();

  logSection('Test Summary');
  logSuccess('All tests completed. Check the logs above for results.');
}

// Run the tests
runTests().catch(error => {
  logError('Fatal error: ' + error.message);
  console.error(error.stack);
  process.exit(1);
});