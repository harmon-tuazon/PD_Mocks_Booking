/**
 * Check if bookings have proper contact associations
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function checkBookingAssociations() {
  const hubspot = new HubSpotService();

  try {
    // Check a few bookings to see their association structure
    const response = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}?limit=5&properties=booking_id,name,email,status&associations=${HUBSPOT_OBJECTS.contacts}`
    );

    console.log('Checking booking associations:');
    console.log('==============================\n');

    response.results.forEach((booking, index) => {
      const hasContactAssoc = booking.associations &&
                              booking.associations[HUBSPOT_OBJECTS.contacts] &&
                              booking.associations[HUBSPOT_OBJECTS.contacts].results &&
                              booking.associations[HUBSPOT_OBJECTS.contacts].results.length > 0;

      console.log(`Booking ${index + 1}: ${booking.properties.booking_id}`);
      console.log(`  - ID: ${booking.id}`);
      console.log(`  - Has Contact Association: ${hasContactAssoc ? '✅ YES' : '❌ NO'}`);

      if (hasContactAssoc) {
        const assoc = booking.associations[HUBSPOT_OBJECTS.contacts].results[0];
        console.log(`  - Contact ID: ${assoc.toObjectId || assoc.id}`);
      }
      console.log('');
    });

    const withAssoc = response.results.filter(b =>
      b.associations?.[HUBSPOT_OBJECTS.contacts]?.results?.length > 0
    ).length;

    console.log(`Summary: ${withAssoc}/${response.results.length} bookings have contact associations`);

    if (withAssoc === 0) {
      console.log('\n⚠️ CRITICAL ISSUE: No bookings have contact associations!');
      console.log('This explains why ownership verification always fails.');
      console.log('The booking creation process needs to create associations.');
      console.log('\n🔍 ROOT CAUSE IDENTIFIED:');
      console.log('===========================');
      console.log('The issue is NOT in api/bookings/[id].js line 163.');
      console.log('The issue is that bookings are being created WITHOUT contact associations.');
      console.log('We need to fix the booking CREATION process, not the retrieval process.');
      console.log('===========================');
    } else {
      console.log('\n✅ Some bookings have contact associations.');
      console.log('The ownership verification should work for these bookings.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBookingAssociations().catch(console.error);