/**
 * Manual test script to debug booking ID issues in deletion
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function debugBookingIDs() {
  const hubspot = new HubSpotService();

  // Test student credentials
  const studentId = 'MD24011';
  const email = 'harmon.tuazon@gmail.com';

  try {
    console.log('🔍 Step 1: Finding student contact...');

    // Search for contact
    const contact = await hubspot.searchContacts(studentId, email);
    if (!contact) {
      console.error('❌ Contact not found');
      return;
    }

    console.log('✅ Contact found:', {
      contactId: contact.id,
      studentId: contact.properties.student_id,
      email: contact.properties.email
    });

    console.log('🔍 Step 2: Getting bookings for contact...');

    // Get bookings
    const bookingsResult = await hubspot.getBookingsForContact(contact.id, { filter: 'all', page: 1, limit: 10 });

    console.log('📋 Bookings result:', {
      totalBookings: bookingsResult.total,
      bookingsCount: bookingsResult.bookings.length
    });

    if (bookingsResult.bookings.length === 0) {
      console.log('ℹ️ No bookings found for this contact');
      return;
    }

    // Test each booking
    for (let i = 0; i < bookingsResult.bookings.length; i++) {
      const booking = bookingsResult.bookings[i];

      console.log(`\n🔍 Step 3.${i + 1}: Testing booking retrieval...`);
      console.log('Booking from list:', {
        id: booking.id,
        idType: typeof booking.id,
        booking_id: booking.booking_id,
        booking_number: booking.booking_number,
        mock_type: booking.mock_type
      });

      try {
        console.log(`🔍 Attempting to fetch booking with ID: ${booking.id}`);

        // Test getBookingWithAssociations
        const fetchedBooking = await hubspot.getBookingWithAssociations(booking.id);

        console.log('✅ Successfully fetched booking:', {
          fetchedId: fetchedBooking.id,
          fetchedIdType: typeof fetchedBooking.id,
          hasProperties: !!fetchedBooking.properties,
          hasAssociations: !!fetchedBooking.associations,
          status: fetchedBooking.properties?.status
        });

        // Test if the booking can be found using the custom booking_id instead
        if (booking.booking_id && booking.booking_id !== booking.id) {
          console.log(`🔍 Also testing with custom booking_id: ${booking.booking_id}`);

          try {
            const fetchedByCustomId = await hubspot.getBookingWithAssociations(booking.booking_id);
            console.log('✅ Also found by custom booking_id:', {
              id: fetchedByCustomId.id
            });
          } catch (error) {
            console.log('ℹ️ Cannot fetch by custom booking_id (expected):', error.message);
          }
        }

      } catch (error) {
        console.error(`❌ Failed to fetch booking ${booking.id}:`, {
          error: error.message,
          status: error.status,
          responseData: error.response?.data
        });

        // Try to understand why it failed
        if (error.response?.status === 404) {
          console.log('🔍 404 error suggests the booking ID is not valid in HubSpot');
          console.log('Possible causes:');
          console.log('- Booking was deleted/archived');
          console.log('- ID format is incorrect');
          console.log('- Object type mismatch');
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the debug test
if (require.main === module) {
  debugBookingIDs().catch(console.error);
}

module.exports = { debugBookingIDs };