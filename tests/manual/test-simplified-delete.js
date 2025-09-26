#!/usr/bin/env node

/**
 * Test script to verify simplified booking deletion flow
 * This tests the new streamlined deletion without ownership verification
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data - replace with actual values from your HubSpot
const TEST_BOOKING_ID = process.env.TEST_BOOKING_ID || '20603606372';  // Replace with actual booking ID
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'prep0001';     // Replace with actual student ID
const TEST_EMAIL = process.env.TEST_EMAIL || 'harmon@prepdoctors.com';  // Replace with actual email

// Colors for console output
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

async function testSimplifiedDeletion() {
  log('\n=== Testing Simplified Booking Deletion Flow ===\n', 'cyan');

  try {
    // Step 1: First, get the booking to see its current state
    log('Step 1: Fetching booking details...', 'blue');

    try {
      const getResponse = await axios.get(
        `${API_URL}/bookings/${TEST_BOOKING_ID}`,
        {
          params: {
            student_id: TEST_STUDENT_ID,
            email: TEST_EMAIL
          }
        }
      );

      log('✅ Booking found:', 'green');
      log(`   - Booking ID: ${getResponse.data.data?.booking?.booking_id}`, 'green');
      log(`   - Status: ${getResponse.data.data?.booking?.status}`, 'green');
      log(`   - Contact: ${getResponse.data.data?.contact?.firstname} ${getResponse.data.data?.contact?.lastname}`, 'green');

      if (getResponse.data.data?.mock_exam) {
        log(`   - Mock Exam: ${getResponse.data.data?.mock_exam?.mock_type}`, 'green');
        log(`   - Exam Date: ${getResponse.data.data?.mock_exam?.exam_date}`, 'green');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('❌ Booking not found - it may have been deleted', 'yellow');
      } else {
        log(`⚠️ Could not fetch booking: ${error.response?.data?.error || error.message}`, 'yellow');
      }
    }

    // Step 2: Test the simplified deletion
    log('\nStep 2: Testing simplified deletion (no ownership verification)...', 'blue');

    const deletePayload = {
      student_id: TEST_STUDENT_ID,
      email: TEST_EMAIL,
      reason: 'Testing simplified deletion flow'
    };

    log('Delete request payload:', 'cyan');
    console.log(deletePayload);

    const deleteResponse = await axios.delete(
      `${API_URL}/bookings/${TEST_BOOKING_ID}`,
      {
        data: deletePayload
      }
    );

    log('\n✅ DELETION SUCCESSFUL!', 'green');
    log('Response:', 'green');
    console.log(JSON.stringify(deleteResponse.data, null, 2));

    // Key improvements in simplified flow:
    log('\n=== Simplified Flow Benefits ===', 'magenta');
    log('✓ No complex ownership verification needed', 'green');
    log('✓ No credit restoration logic', 'green');
    log('✓ No mock exam capacity updates', 'green');
    log('✓ No rollback mechanisms', 'green');
    log('✓ Simple soft delete (is_active = "Cancelled")', 'green');
    log('✓ Faster response time', 'green');
    log('✓ Less error-prone', 'green');

    // Step 3: Verify the booking is now cancelled
    log('\nStep 3: Verifying booking is cancelled...', 'blue');

    try {
      const verifyResponse = await axios.get(
        `${API_URL}/bookings/${TEST_BOOKING_ID}`,
        {
          params: {
            student_id: TEST_STUDENT_ID,
            email: TEST_EMAIL
          }
        }
      );

      const status = verifyResponse.data.data?.booking?.status;
      if (status === 'cancelled' || status === 'canceled') {
        log('✅ Confirmed: Booking is now cancelled', 'green');
      } else {
        log(`⚠️ Booking status is: ${status}`, 'yellow');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log('✅ Booking is effectively deleted (404)', 'green');
      } else {
        log(`⚠️ Could not verify: ${error.response?.data?.error || error.message}`, 'yellow');
      }
    }

  } catch (error) {
    log('\n❌ Deletion failed:', 'red');

    if (error.response?.status === 409) {
      log('⚠️ Booking is already cancelled', 'yellow');
      log('This is expected if you run the test multiple times', 'yellow');
    } else if (error.response?.status === 404) {
      log('❌ Booking not found', 'red');
      log(`Make sure booking ID ${TEST_BOOKING_ID} exists`, 'red');
    } else if (error.response?.status === 401) {
      log('❌ Authentication failed', 'red');
      log('Check your student ID and email', 'red');
    } else {
      log(`Error: ${error.response?.data?.error || error.message}`, 'red');

      if (error.response?.data) {
        console.error('Full error response:', error.response.data);
      }
    }
  }
}

// Test trying to delete an already cancelled booking
async function testAlreadyCancelledBooking() {
  log('\n=== Testing Already Cancelled Booking ===\n', 'cyan');

  try {
    const deletePayload = {
      student_id: TEST_STUDENT_ID,
      email: TEST_EMAIL,
      reason: 'Testing already cancelled'
    };

    await axios.delete(
      `${API_URL}/bookings/${TEST_BOOKING_ID}`,
      {
        data: deletePayload
      }
    );

    log('❌ Unexpected: Should have gotten an error for already cancelled booking', 'red');

  } catch (error) {
    if (error.response?.status === 409) {
      log('✅ Correct behavior: Cannot cancel an already cancelled booking', 'green');
      log(`   Error message: ${error.response.data.error}`, 'green');
    } else {
      log(`⚠️ Unexpected error: ${error.response?.data?.error || error.message}`, 'yellow');
    }
  }
}

// Run tests
async function runTests() {
  try {
    await testSimplifiedDeletion();

    // Optional: Test already cancelled scenario
    log('\n' + '='.repeat(60), 'cyan');
    await testAlreadyCancelledBooking();

    log('\n=== All Tests Completed ===\n', 'cyan');

  } catch (error) {
    log('Fatal error during tests:', 'red');
    console.error(error);
  }
}

// Display test configuration
log('Test Configuration:', 'cyan');
log(`  BASE_URL: ${BASE_URL}`, 'blue');
log(`  TEST_BOOKING_ID: ${TEST_BOOKING_ID}`, 'blue');
log(`  TEST_STUDENT_ID: ${TEST_STUDENT_ID}`, 'blue');
log(`  TEST_EMAIL: ${TEST_EMAIL}`, 'blue');
log('', 'reset');

// Run the tests
runTests();