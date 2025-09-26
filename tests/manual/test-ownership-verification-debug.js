/**
 * Debug test for booking ownership verification during deletion
 * This test helps identify why ownership verification is failing
 */

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.HS_PRIVATE_APP_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// HubSpot object type IDs
const HUBSPOT_OBJECTS = {
  contacts: '0-1',
  bookings: '2-50158943',
  mock_exams: '2-50158913'
};

/**
 * Fetch booking directly from HubSpot to see raw association data
 */
async function fetchBookingFromHubSpot(bookingId) {
  console.log('\n📡 Fetching booking directly from HubSpot...');
  console.log('Booking ID:', bookingId);

  try {
    // Fetch booking with V3 API
    const bookingResponse = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: {
          properties: ['booking_id', 'name', 'email', 'status']
        }
      }
    );

    console.log('\n✅ Booking properties:', {
      id: bookingResponse.data.id,
      properties: bookingResponse.data.properties
    });

    // Fetch associations with V4 API
    try {
      const assocResponse = await axios.get(
        `https://api.hubapi.com/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}`,
        {
          headers: { Authorization: `Bearer ${API_KEY}` }
        }
      );

      console.log('\n📋 V4 Association Response Structure:');
      console.log('Full response:', JSON.stringify(assocResponse.data, null, 2));

      if (assocResponse.data.results && assocResponse.data.results.length > 0) {
        console.log('\n🔍 Association Details:');
        assocResponse.data.results.forEach((assoc, idx) => {
          console.log(`\nAssociation ${idx + 1}:`, {
            ...assoc,
            toObjectIdType: typeof assoc.toObjectId,
            fromObjectIdType: typeof assoc.from?.id,
            allKeys: Object.keys(assoc)
          });
        });
      }

      return {
        booking: bookingResponse.data,
        associations: assocResponse.data
      };
    } catch (assocError) {
      console.log('\n⚠️ No associations found or error fetching:', assocError.message);
      return {
        booking: bookingResponse.data,
        associations: { results: [] }
      };
    }
  } catch (error) {
    console.error('\n❌ Error fetching from HubSpot:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test ownership verification logic
 */
async function testOwnershipVerification(bookingId, contactId) {
  console.log('\n🔐 Testing Ownership Verification');
  console.log('═══════════════════════════════════');
  console.log('Booking ID:', bookingId);
  console.log('Contact ID:', contactId);
  console.log('Contact ID Type:', typeof contactId);

  // Fetch booking data
  const { booking, associations } = await fetchBookingFromHubSpot(bookingId);

  console.log('\n📊 Association Analysis:');
  console.log('Total associations found:', associations.results?.length || 0);

  if (associations.results && associations.results.length > 0) {
    const contactAssociations = associations.results;

    console.log('\n🔍 Comparing Contact IDs:');
    console.log('Target Contact ID:', contactId, `(type: ${typeof contactId})`);

    contactAssociations.forEach((assoc, idx) => {
      console.log(`\n[${idx + 1}] Association:`, {
        toObjectId: assoc.toObjectId,
        toObjectIdType: typeof assoc.toObjectId
      });

      // Test different comparison methods
      const comparisons = {
        'Direct equality (===)': assoc.toObjectId === contactId,
        'String comparison': String(assoc.toObjectId) === String(contactId),
        'Number comparison': Number(assoc.toObjectId) === Number(contactId),
        'Loose equality (==)': assoc.toObjectId == contactId
      };

      console.log('Comparison results:');
      Object.entries(comparisons).forEach(([method, result]) => {
        console.log(`  ${method}: ${result ? '✅' : '❌'}`);
      });

      // Check if this would pass ownership
      const wouldPassOwnership = Object.values(comparisons).some(Boolean);
      console.log(`  Would pass ownership: ${wouldPassOwnership ? '✅ YES' : '❌ NO'}`);
    });

    // Simulate the ownership check logic
    console.log('\n🔐 Simulating Ownership Check:');
    const belongsToUser = contactAssociations.some(assoc => {
      const contactIdStr = String(contactId);
      const assocIdStr = String(assoc.toObjectId);

      const matches = [
        assoc.toObjectId === contactId,
        assocIdStr === contactIdStr,
        Number(assoc.toObjectId) === Number(contactId)
      ];

      return matches.some(Boolean);
    });

    console.log(`Final ownership result: ${belongsToUser ? '✅ AUTHORIZED' : '❌ DENIED'}`);
    return belongsToUser;
  } else {
    console.log('\n❌ No associations found - ownership cannot be verified');
    return false;
  }
}

/**
 * Test deletion with proper credentials
 */
async function testDeletion(bookingId, studentId, email) {
  console.log('\n🗑️ Testing Deletion Request');
  console.log('═══════════════════════════════');

  try {
    // First get contact ID from credentials
    console.log('\n1️⃣ Getting contact ID from credentials...');
    const contactResponse = await axios.get(`${API_BASE_URL}/students/contact`, {
      params: { student_id: studentId, email: email }
    });

    const contactId = contactResponse.data.contact.id;
    console.log('Contact ID obtained:', contactId, `(type: ${typeof contactId})`);

    // Test ownership verification
    console.log('\n2️⃣ Testing ownership verification...');
    const ownsBooking = await testOwnershipVerification(bookingId, contactId);

    if (!ownsBooking) {
      console.log('\n⚠️ Ownership verification would fail - investigating why...');
    }

    // Attempt deletion
    console.log('\n3️⃣ Attempting deletion via API...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/bookings/${bookingId}`, {
      params: { student_id: studentId, email: email }
    });

    console.log('\n✅ Deletion successful:', deleteResponse.data);
    return true;
  } catch (error) {
    console.error('\n❌ Deletion failed:', {
      status: error.response?.status,
      error: error.response?.data?.error,
      code: error.response?.data?.code,
      details: error.response?.data?.details
    });
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Booking Ownership Verification Debug Test');
  console.log('═══════════════════════════════════════════\n');

  // Test credentials
  const testData = {
    bookingId: '18365308553',  // Replace with actual booking ID
    studentId: '159999999',
    email: 'htuazon@prepdoctors.com'
  };

  console.log('📋 Test Data:', testData);

  try {
    // First, get the contact ID
    console.log('\n📝 Step 1: Get Contact ID from credentials...');
    const contactResponse = await axios.get(`${API_BASE_URL}/students/contact`, {
      params: {
        student_id: testData.studentId,
        email: testData.email
      }
    });

    const contactId = contactResponse.data.contact.id;
    console.log('Contact ID:', contactId, `(type: ${typeof contactId})`);

    // Test ownership verification directly
    console.log('\n📝 Step 2: Test ownership verification...');
    await testOwnershipVerification(testData.bookingId, contactId);

    // Test deletion
    console.log('\n📝 Step 3: Test deletion...');
    await testDeletion(testData.bookingId, testData.studentId, testData.email);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run tests
runTests().catch(console.error);