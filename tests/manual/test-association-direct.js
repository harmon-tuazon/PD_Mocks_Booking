/**
 * Test to debug association fetching directly with HubSpot service
 * This test bypasses the API and calls HubSpot service directly
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testAssociationsDirectly() {
  console.log('🔍 Testing booking associations directly with HubSpot service...\n');

  const hubspot = new HubSpotService();

  // Use the correct contact ID from previous tests
  const contactId = '124340560202';  // Test Harmon contact

  try {
    console.log('📋 Contact ID:', contactId);
    console.log('🔄 Testing getBookingsForContact with filter: all\n');

    // This will trigger the enhanced logging in hubspot.js
    const result = await hubspot.getBookingsForContact(contactId, {
      filter: 'all',
      page: 1,
      limit: 10
    });

    console.log('\n✅ Result from HubSpot service:');
    console.log('📊 Total bookings found:', result.bookings?.length || 0);
    console.log('📄 Pagination:', result.pagination);

    if (result.bookings && result.bookings.length > 0) {
      console.log('\n📚 Bookings retrieved:');
      result.bookings.forEach((booking, idx) => {
        console.log(`\n[${idx + 1}] Booking ${booking.id}:`, {
          booking_id: booking.booking_id,
          mock_type: booking.mock_type,
          exam_date: booking.exam_date,
          has_mock_exam: !!booking.mock_exam,
          status: booking.status
        });
      });
    } else {
      console.log('\n⚠️ No bookings found!');
      console.log('Check the console output above for:');
      console.log('- [ASSOCIATION FETCH] messages');
      console.log('- [ASSOCIATION API] endpoint calls');
      console.log('- [ASSOCIATION ERROR] messages');
      console.log('- [CRITICAL] messages if associations fail');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testAssociationsDirectly().catch(console.error);