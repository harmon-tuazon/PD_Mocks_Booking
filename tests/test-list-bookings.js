/**
 * Test script for the GET /api/bookings/list endpoint
 * Run with: node tests/test-list-bookings.js
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const TEST_DATA = {
  student_id: 'SMPC12345',  // Replace with a valid student ID from your HubSpot
  email: 'test@example.com', // Replace with matching email
  filter: 'all',             // Options: 'all', 'upcoming', 'past'
  page: 1,
  limit: 10
};

/**
 * Test the list bookings endpoint
 */
async function testListBookings() {
  console.log('🚀 Testing GET /api/bookings/list endpoint...\n');
  console.log('📍 API Base URL:', API_BASE_URL);
  console.log('📊 Test Parameters:', TEST_DATA);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Build query string
    const queryParams = new URLSearchParams(TEST_DATA);
    const url = `${API_BASE_URL}/api/bookings/list?${queryParams}`;

    console.log('📤 Sending request to:', url);
    console.log('\n' + '-'.repeat(60) + '\n');

    // Make the request
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Display results
    console.log('✅ Response received!\n');
    console.log('Status:', response.status);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Analyze the response
    if (response.data.success) {
      const { data } = response.data;
      console.log('\n' + '='.repeat(60));
      console.log('📊 SUMMARY:');
      console.log('='.repeat(60));
      console.log(`Total Bookings Found: ${data.pagination.total_bookings}`);
      console.log(`Current Page: ${data.pagination.current_page}/${data.pagination.total_pages}`);
      console.log(`Bookings on this page: ${data.bookings.length}`);

      console.log('\n💳 CREDITS:');
      console.log(`- SJ Credits: ${data.credits.sj_credits}`);
      console.log(`- CS Credits: ${data.credits.cs_credits}`);
      console.log(`- Mini-mock Credits: ${data.credits.sjmini_credits}`);
      console.log(`- Shared Credits: ${data.credits.shared_mock_credits}`);

      if (data.bookings.length > 0) {
        console.log('\n📋 BOOKINGS:');
        data.bookings.forEach((booking, index) => {
          console.log(`\n${index + 1}. ${booking.booking_id}`);
          console.log(`   Status: ${booking.status}`);
          console.log(`   Exam Type: ${booking.mock_exam.mock_type}`);
          console.log(`   Exam Date: ${booking.mock_exam.exam_date}`);
          console.log(`   Location: ${booking.mock_exam.location}`);
          console.log(`   Capacity: ${booking.mock_exam.total_bookings}/${booking.mock_exam.capacity}`);
        });
      } else {
        console.log('\n📭 No bookings found for this student.');
      }
    }

  } catch (error) {
    console.error('❌ Error occurred:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Test different scenarios
async function runAllTests() {
  console.log('🧪 Running comprehensive booking list tests...\n');

  // Test 1: Get all bookings
  console.log('Test 1: Fetching ALL bookings');
  await testWithParams({ ...TEST_DATA, filter: 'all' });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Get upcoming bookings only
  console.log('Test 2: Fetching UPCOMING bookings only');
  await testWithParams({ ...TEST_DATA, filter: 'upcoming' });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Get past bookings only
  console.log('Test 3: Fetching PAST bookings only');
  await testWithParams({ ...TEST_DATA, filter: 'past' });

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Test pagination
  console.log('Test 4: Testing pagination (page 2, limit 5)');
  await testWithParams({ ...TEST_DATA, page: 2, limit: 5 });
}

async function testWithParams(params) {
  try {
    const queryParams = new URLSearchParams(params);
    const url = `${API_BASE_URL}/api/bookings/list?${queryParams}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.data.success) {
      const { data } = response.data;
      console.log(`✅ Success: Found ${data.bookings.length} bookings (Total: ${data.pagination.total_bookings})`);
    }
  } catch (error) {
    console.error(`❌ Failed:`, error.response?.data?.error || error.message);
  }
}

// Run the test
if (require.main === module) {
  // Uncomment the desired test:

  // Run single test
  testListBookings();

  // Or run all tests
  // runAllTests();
}