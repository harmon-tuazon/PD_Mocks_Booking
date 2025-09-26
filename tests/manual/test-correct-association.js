/**
 * Test to find the correct association type between bookings and contacts
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function testCorrectAssociation() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing different association approaches...\n');

    // Get test objects
    const contactId = '113347038883';
    const bookingId = '35207858728';

    console.log('Test objects:');
    console.log(`- Booking ID: ${bookingId}`);
    console.log(`- Contact ID: ${contactId}\n`);

    // Test 1: Try with HUBSPOT_DEFINED category and default type
    console.log('Test 1: Using HUBSPOT_DEFINED category with default type...');
    try {
      const result1 = await hubspot.apiCall(
        'PUT',
        `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}/${contactId}`,
        [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 1
          }
        ]
      );
      console.log('✅ Success with HUBSPOT_DEFINED and typeId 1!');
      console.log('Result:', result1);
      return;
    } catch (err) {
      console.log('❌ Failed:', err.message);
    }

    // Test 2: Try without specifying category or type (let HubSpot use defaults)
    console.log('\nTest 2: Using minimal payload (no category/type specified)...');
    try {
      const result2 = await hubspot.apiCall(
        'PUT',
        `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}/${contactId}`,
        []  // Empty array - use defaults
      );
      console.log('✅ Success with empty payload!');
      console.log('Result:', result2);
      return;
    } catch (err) {
      console.log('❌ Failed:', err.message);
    }

    // Test 3: Try V3 API instead of V4
    console.log('\nTest 3: Using V3 API...');
    try {
      const result3 = await hubspot.apiCall(
        'PUT',
        `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}/${contactId}/1`
      );
      console.log('✅ Success with V3 API!');
      console.log('Result:', result3);
      return;
    } catch (err) {
      console.log('❌ Failed:', err.message);
    }

    // Test 4: Try to get association definitions first
    console.log('\nTest 4: Getting association definitions...');
    try {
      const definitions = await hubspot.apiCall(
        'GET',
        `/crm/v4/associations/${HUBSPOT_OBJECTS.bookings}/${HUBSPOT_OBJECTS.contacts}/labels`
      );
      console.log('Association definitions found:');
      console.log(JSON.stringify(definitions, null, 2));

      if (definitions.results && definitions.results.length > 0) {
        const firstDef = definitions.results[0];
        console.log('\nTrying with first definition:', firstDef);

        const result4 = await hubspot.apiCall(
          'PUT',
          `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${bookingId}/associations/${HUBSPOT_OBJECTS.contacts}/${contactId}`,
          [
            {
              associationCategory: firstDef.category,
              associationTypeId: firstDef.typeId || firstDef.id
            }
          ]
        );
        console.log('✅ Success with discovered definition!');
        console.log('Result:', result4);
        return;
      }
    } catch (err) {
      console.log('❌ Failed to get definitions:', err.message);
    }

    console.log('\n❌ All association methods failed!');
    console.log('The issue needs to be investigated further.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

// Run the test
testCorrectAssociation().catch(console.error);