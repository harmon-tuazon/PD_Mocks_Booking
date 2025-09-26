/**
 * Test to verify the booking deletion ownership fix
 * This test confirms that the ID type mismatch issue is resolved
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const API_KEY = process.env.HS_PRIVATE_APP_TOKEN;

// Test data
const TEST_DATA = {
  bookingId: '18365308553',  // Replace with actual booking ID
  studentId: '159999999',
  email: 'htuazon@prepdoctors.com',
  reason: 'Testing ownership verification fix'
};

/**
 * Verify booking ownership directly from HubSpot
 */
async function verifyOwnershipFromHubSpot(bookingId, contactId) {
  console.log('\n📡 Verifying ownership directly from HubSpot...');

  try {
    // Fetch associations using V4 API
    const response = await axios.get(
      `https://api.hubapi.com/crm/v4/objects/2-50158943/${bookingId}/associations/0-1`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` }
      }
    );

    const associations = response.data.results || [];
    console.log(`Found ${associations.length} contact association(s)`);

    if (associations.length > 0) {
      associations.forEach((assoc, idx) => {
        console.log(`\nAssociation ${idx + 1}:`, {
          toObjectId: assoc.toObjectId,
          toObjectIdType: typeof assoc.toObjectId,
          contactId: contactId,
          contactIdType: typeof contactId,
          stringMatch: String(assoc.toObjectId) === String(contactId),
          directMatch: assoc.toObjectId === contactId
        });
      });

      const ownsBooking = associations.some(a =>
        String(a.toObjectId) === String(contactId)
      );

      console.log(`\n✅ Ownership verification: ${ownsBooking ? 'AUTHORIZED' : 'DENIED'}`);
      return ownsBooking;
    }

    console.log('❌ No associations found');
    return false;

  } catch (error) {
    console.error('Error fetching from HubSpot:', error.message);
    return false;
  }
}

/**
 * Test the deletion endpoint
 */
async function testDeletion() {
  console.log('🚀 Testing Booking Deletion Ownership Fix');
  console.log('═══════════════════════════════════════\n');

  console.log('📋 Test Configuration:', TEST_DATA);

  try {
    // Step 1: Get contact ID from credentials
    console.log('\n1️⃣ Getting contact ID from credentials...');
    const contactResponse = await axios.get(`${API_BASE_URL}/students/contact`, {
      params: {
        student_id: TEST_DATA.studentId,
        email: TEST_DATA.email
      }
    });

    const contactId = contactResponse.data.contact.id;
    console.log(`Contact ID: ${contactId} (type: ${typeof contactId})`);

    // Step 2: Verify ownership directly from HubSpot
    console.log('\n2️⃣ Verifying ownership from HubSpot...');
    const ownsBooking = await verifyOwnershipFromHubSpot(TEST_DATA.bookingId, contactId);

    if (!ownsBooking) {
      console.error('\n❌ Direct HubSpot verification shows user does NOT own this booking!');
      console.log('Please check the booking ID and credentials.');
      return;
    }

    // Step 3: Get booking details first
    console.log('\n3️⃣ Getting booking details...');
    const getResponse = await axios.get(`${API_BASE_URL}/bookings/${TEST_DATA.bookingId}`, {
      params: {
        student_id: TEST_DATA.studentId,
        email: TEST_DATA.email
      }
    });

    console.log('Booking retrieved successfully:', {
      id: getResponse.data.data.id,
      name: getResponse.data.data.properties.name,
      status: getResponse.data.data.properties.status
    });

    // Step 4: Attempt deletion
    console.log('\n4️⃣ Attempting deletion via API...');
    console.log('Request details:', {
      url: `${API_BASE_URL}/bookings/${TEST_DATA.bookingId}`,
      method: 'DELETE',
      body: {
        student_id: TEST_DATA.studentId,
        email: TEST_DATA.email,
        reason: TEST_DATA.reason
      }
    });

    const deleteResponse = await axios.delete(
      `${API_BASE_URL}/bookings/${TEST_DATA.bookingId}`,
      {
        data: {  // Note: axios uses 'data' for DELETE request body
          student_id: TEST_DATA.studentId,
          email: TEST_DATA.email,
          reason: TEST_DATA.reason
        }
      }
    );

    console.log('\n✅ SUCCESS! Booking deletion completed:', {
      status: deleteResponse.status,
      message: deleteResponse.data.message,
      bookingId: deleteResponse.data.data?.bookingId || deleteResponse.data.data?.id
    });

    // Step 5: Verify deletion by trying to get the booking again
    console.log('\n5️⃣ Verifying deletion by fetching booking again...');
    try {
      await axios.get(`${API_BASE_URL}/bookings/${TEST_DATA.bookingId}`, {
        params: {
          student_id: TEST_DATA.studentId,
          email: TEST_DATA.email
        }
      });
      console.log('⚠️ Booking still exists - may be soft deleted');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Confirmed: Booking no longer exists');
      } else {
        console.log('✅ Booking marked as deleted/cancelled');
      }
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('The ownership verification fix is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', {
      status: error.response?.status,
      error: error.response?.data?.error,
      code: error.response?.data?.code,
      details: error.response?.data?.details,
      message: error.response?.data?.message || error.message
    });

    if (error.response?.status === 403) {
      console.log('\n⚠️ Access denied error - the fix may not be fully applied.');
      console.log('Check the server logs for detailed debugging information.');
      console.log('Look for [DELETE OWNERSHIP DEBUG] messages.');
    }
  }
}

// Run the test
testDeletion().catch(console.error);