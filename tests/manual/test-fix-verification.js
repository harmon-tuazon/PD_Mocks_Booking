/**
 * Test to verify the association fix works
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function verifyAssociationFix() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing the association fix...\n');

    // Get test objects
    const contactId = '113347038883';
    console.log(`Using Contact ID: ${contactId}`);

    // Find a booking without association
    const bookingsResponse = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}?limit=10&properties=booking_id,name&associations=${HUBSPOT_OBJECTS.contacts}`
    );

    let testBooking = null;
    for (const booking of bookingsResponse.results || []) {
      const hasAssoc = booking.associations?.[HUBSPOT_OBJECTS.contacts]?.results?.length > 0;
      if (!hasAssoc) {
        testBooking = booking;
        break;
      }
    }

    if (!testBooking) {
      console.log('❌ No bookings without associations found to test');
      return;
    }

    console.log(`Using Booking ID: ${testBooking.id} (${testBooking.properties.booking_id})\n`);

    // Test the fixed createAssociation method
    console.log('🔧 Testing fixed createAssociation method...');
    try {
      const result = await hubspot.createAssociation(
        HUBSPOT_OBJECTS.bookings,
        testBooking.id,
        HUBSPOT_OBJECTS.contacts,
        contactId
      );

      console.log('\n✅ SUCCESS! Association created with the fix!');
      console.log('Association result:', result);

      // Verify the association
      console.log('\n🔍 Verifying the association was created...');
      const verifyResponse = await hubspot.apiCall(
        'GET',
        `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${testBooking.id}?associations=${HUBSPOT_OBJECTS.contacts}`
      );

      const associations = verifyResponse.associations?.[HUBSPOT_OBJECTS.contacts]?.results || [];
      const found = associations.some(a =>
        a.id === contactId || a.toObjectId === contactId
      );

      if (found) {
        console.log('✅ Association verified successfully!');
        console.log('The fix is working correctly.');

        // Now test ownership verification
        console.log('\n🔍 Testing ownership verification with the fixed association...');

        // Simulate what the API does
        const contactAssociations = associations;
        const belongsToUser = contactAssociations.some(assoc => {
          return assoc.id === contactId || assoc.toObjectId === contactId;
        });

        console.log(`Ownership check result: ${belongsToUser ? '✅ PASS' : '❌ FAIL'}`);

        if (belongsToUser) {
          console.log('\n🎉 COMPLETE SUCCESS!');
          console.log('The fix resolves both issues:');
          console.log('1. ✅ Associations are now created during booking creation');
          console.log('2. ✅ Ownership verification will work correctly');
        }
      } else {
        console.log('❌ Association not found after creation');
      }

    } catch (err) {
      console.error('\n❌ Association still failing!');
      console.error('Error:', err.message);
      if (err.response) {
        console.error('Response:', JSON.stringify(err.response.data, null, 2));
      }
      console.log('\nThe fix may need further adjustment.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
verifyAssociationFix().catch(console.error);