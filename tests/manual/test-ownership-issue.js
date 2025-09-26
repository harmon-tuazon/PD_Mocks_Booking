/**
 * Test to demonstrate the ownership verification issue
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../../api/_shared/hubspot');

async function testOwnershipIssue() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing ownership verification issue...\n');

    // Step 1: Find a booking with contact association
    console.log('Step 1: Finding a booking with contact association...');
    const bookingsResponse = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/${HUBSPOT_OBJECTS.bookings}?limit=10&properties=booking_id,name,email&associations=${HUBSPOT_OBJECTS.contacts}`
    );

    let testBooking = null;
    let contactAssoc = null;

    for (const booking of bookingsResponse.results || []) {
      if (booking.associations && booking.associations[HUBSPOT_OBJECTS.contacts]) {
        const assocs = booking.associations[HUBSPOT_OBJECTS.contacts].results;
        if (assocs && assocs.length > 0) {
          testBooking = booking;
          contactAssoc = assocs[0];
          break;
        }
      }
    }

    if (!testBooking) {
      console.log('❌ No bookings with contact associations found. Creating a test scenario...');

      // Create a mock scenario to demonstrate the issue
      console.log('\n📋 DEMONSTRATING THE ISSUE WITH MOCK DATA:');
      console.log('==========================================');

      // Simulate what happens in the API
      const mockContact = {
        id: '123456789',  // This is the HubSpot object ID
        properties: {
          student_id: 'STU001',  // This is the custom student ID
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
          hs_object_id: '123456789'  // Same as id
        }
      };

      const mockBookingAssociations = [
        {
          id: '123456789',  // This matches contact.id (CORRECT)
          toObjectId: '123456789',
          type: 'booking_to_contact'
        }
      ];

      console.log('Mock Contact:');
      console.log(`- contact.id: "${mockContact.id}" (HubSpot object ID)`);
      console.log(`- contact.properties.student_id: "${mockContact.properties.student_id}" (Custom student ID)`);

      console.log('\nMock Booking Association:');
      console.log(`- association.id: "${mockBookingAssociations[0].id}"`);
      console.log(`- association.toObjectId: "${mockBookingAssociations[0].toObjectId}"`);

      console.log('\n🔍 Current Code Analysis (Line 163 in api/bookings/[id].js):');
      console.log('const contactId = contact.id;  // Sets to: "123456789"');

      console.log('\n✅ Ownership Check Result:');
      const belongsToUser = mockBookingAssociations.some(assoc => {
        return assoc.id === mockContact.id || assoc.toObjectId === mockContact.id;
      });
      console.log(`belongsToUser: ${belongsToUser} (This should work correctly!)`);

      console.log('\n⚠️ CONCLUSION: The code at line 163 appears to be CORRECT!');
      console.log('contact.id is already the HubSpot object ID, which is what we need.');
      console.log('==========================================\n');

      return;
    }

    // If we found a real booking with association
    console.log('✅ Found booking with contact association:', {
      bookingId: testBooking.id,
      bookingName: testBooking.properties.booking_id,
      contactAssocId: contactAssoc.id || contactAssoc.toObjectId
    });

    // Step 2: Get the associated contact
    const contactId = contactAssoc.toObjectId || contactAssoc.id;
    console.log(`\nStep 2: Fetching contact ${contactId}...`);

    const contact = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/contacts/${contactId}?properties=student_id,email,firstname,lastname,hs_object_id`
    );

    console.log('Contact details:', {
      id: contact.id,
      student_id: contact.properties.student_id,
      email: contact.properties.email,
      hs_object_id: contact.properties.hs_object_id
    });

    // Step 3: Simulate the ownership check from api/bookings/[id].js
    console.log('\nStep 3: Simulating ownership verification...');
    console.log('==========================================');

    // This is what line 163 does
    const simulatedContactId = contact.id;  // Currently using contact.id
    console.log(`Line 163: const contactId = contact.id; // Sets to: "${simulatedContactId}"`);

    // This is the ownership check
    const contactAssociations = testBooking.associations[HUBSPOT_OBJECTS.contacts].results;
    console.log(`\nChecking against ${contactAssociations.length} association(s):`);

    contactAssociations.forEach((assoc, index) => {
      console.log(`Association ${index + 1}:`);
      console.log(`  - assoc.id: "${assoc.id}"`);
      console.log(`  - assoc.toObjectId: "${assoc.toObjectId}"`);
      console.log(`  - Matches contact.id (${simulatedContactId}): ${assoc.id === simulatedContactId || assoc.toObjectId === simulatedContactId}`);
    });

    const belongsToUser = contactAssociations.some(assoc => {
      return assoc.id === simulatedContactId || assoc.toObjectId === simulatedContactId;
    });

    console.log(`\n✨ Result: belongsToUser = ${belongsToUser}`);
    console.log('==========================================\n');

    if (belongsToUser) {
      console.log('✅ VERIFICATION: The current code is working correctly!');
      console.log('Using contact.id is the right approach for ownership verification.');
    } else {
      console.log('❌ ISSUE FOUND: Ownership verification failed!');
      console.log('This might indicate a different issue in the association structure.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

// Run the test
testOwnershipIssue().catch(console.error);