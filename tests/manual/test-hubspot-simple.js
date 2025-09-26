/**
 * Simple HubSpot connectivity test
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testHubSpotConnection() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing HubSpot connection...');
    console.log('Token available:', !!process.env.HS_PRIVATE_APP_TOKEN);
    console.log('Token starts with:', process.env.HS_PRIVATE_APP_TOKEN?.substring(0, 10) + '...');

    // Test a simple API call - get contacts
    console.log('🔍 Testing basic contacts API...');

    const contactsResponse = await hubspot.apiCall(
      'GET',
      '/crm/v3/objects/contacts?limit=1&properties=email,firstname,lastname'
    );

    console.log('✅ Basic contacts API works:', {
      hasResults: !!contactsResponse.results,
      count: contactsResponse.results?.length || 0,
      firstContact: contactsResponse.results?.[0]?.properties || null
    });

    // Test bookings object type
    console.log('🔍 Testing bookings object API...');

    const bookingsResponse = await hubspot.apiCall(
      'GET',
      '/crm/v3/objects/2-50158943?limit=1&properties=booking_id,name,email'
    );

    console.log('✅ Bookings API works:', {
      hasResults: !!bookingsResponse.results,
      count: bookingsResponse.results?.length || 0,
      firstBooking: bookingsResponse.results?.[0] || null
    });

  } catch (error) {
    console.error('❌ HubSpot connection failed:', {
      error: error.message,
      status: error.status,
      details: error.response?.data
    });
  }
}

// Run the test
testHubSpotConnection().catch(console.error);