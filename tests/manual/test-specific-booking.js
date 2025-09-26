/**
 * Test specific booking ID from the discovered booking
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testSpecificBooking() {
  const hubspot = new HubSpotService();

  // Use the booking ID we found
  const testBookingId = '35117316788';

  try {
    console.log(`🔍 Testing getBookingWithAssociations for booking ID: ${testBookingId}`);

    const booking = await hubspot.getBookingWithAssociations(testBookingId);

    console.log('✅ Successfully fetched booking:', {
      id: booking.id,
      hasProperties: !!booking.properties,
      hasAssociations: !!booking.associations,
      properties: booking.properties,
      associationKeys: booking.associations ? Object.keys(booking.associations) : null
    });

    // Test if this booking has contact associations
    if (booking.associations && booking.associations['0-1']) {
      console.log('🔍 Contact associations found:', booking.associations['0-1']);
    }

    // Test if this booking has mock exam associations
    if (booking.associations && booking.associations['2-50158913']) {
      console.log('🔍 Mock exam associations found:', booking.associations['2-50158913']);
    }

  } catch (error) {
    console.error('❌ Failed to fetch specific booking:', {
      bookingId: testBookingId,
      error: error.message,
      status: error.status,
      details: error.response?.data
    });
  }
}

// Run the test
testSpecificBooking().catch(console.error);