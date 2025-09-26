/**
 * Test association creation between booking and contact
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function testAssociationCreation() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing association creation between bookings and contacts...\n');

    // Step 1: Get a real contact
    const contactsResponse = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/contacts?limit=1&properties=email,firstname,lastname,student_id`
    );

    if (!contactsResponse.results || contactsResponse.results.length === 0) {
      console.log('❌ No contacts found');
      return;
    }

    const contact = contactsResponse.results[0];
    console.log('✅ Found contact:', {
      id: contact.id,
      email: contact.properties.email,
      name: `${contact.properties.firstname} ${contact.properties.lastname}`
    });

    // Step 2: Get a booking without associations
    const bookingsResponse = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}?limit=5&properties=booking_id,name&associations=${HUBSPOT_OBJECTS.contacts}`
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
      console.log('❌ No bookings without associations found');
      return;
    }

    console.log('✅ Found booking without association:', {
      id: testBooking.id,
      booking_id: testBooking.properties.booking_id
    });

    // Step 3: Test association creation
    console.log('\n🔧 Testing association creation...');
    console.log('Parameters:');
    console.log(`- From Object Type: ${HUBSPOT_OBJECTS.bookings}`);
    console.log(`- From Object ID: ${testBooking.id}`);
    console.log(`- To Object Type: ${HUBSPOT_OBJECTS.contacts}`);
    console.log(`- To Object ID: ${contact.id}`);

    try {
      const associationResult = await hubspot.createAssociation(
        HUBSPOT_OBJECTS.bookings,
        testBooking.id,
        HUBSPOT_OBJECTS.contacts,
        contact.id
      );

      console.log('\n✅ Association created successfully!');
      console.log('Result:', associationResult);

      // Step 4: Verify the association was created
      console.log('\n🔍 Verifying association...');
      const verifyResponse = await hubspot.apiCall(
        'GET',
        `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${testBooking.id}?associations=${HUBSPOT_OBJECTS.contacts}`
      );

      const newAssociations = verifyResponse.associations?.[HUBSPOT_OBJECTS.contacts]?.results || [];
      const hasNewAssoc = newAssociations.some(a =>
        a.id === contact.id || a.toObjectId === contact.id
      );

      if (hasNewAssoc) {
        console.log('✅ Association verified! Booking is now associated with contact.');
        console.log('Associations:', newAssociations);
      } else {
        console.log('❌ Association not found after creation!');
        console.log('Current associations:', newAssociations);
      }

    } catch (assocError) {
      console.error('\n❌ Association creation failed!');
      console.error('Error:', assocError.message);

      if (assocError.response) {
        console.error('Response status:', assocError.response.status);
        console.error('Response data:', JSON.stringify(assocError.response.data, null, 2));
      }

      console.log('\n🔍 DEBUGGING INFORMATION:');
      console.log('==========================================');
      console.log('This error explains why bookings have no contact associations.');
      console.log('Possible causes:');
      console.log('1. Wrong association type ID');
      console.log('2. Permission issues with the private app');
      console.log('3. Invalid object type identifiers');
      console.log('4. API version incompatibility');
      console.log('==========================================');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

// Run the test
testAssociationCreation().catch(console.error);