/**
 * Test to verify contact object structure from searchContacts
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testContactStructure() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Testing searchContacts method to understand contact object structure...\n');

    // Test credentials
    const testStudentId = 'MD24011';
    const testEmail = 'htuazon@prepdoctors.com';

    console.log('📋 Test credentials:');
    console.log(`- student_id: ${testStudentId}`);
    console.log(`- email: ${testEmail}\n`);

    // Call searchContacts
    const contact = await hubspot.searchContacts(testStudentId, testEmail);

    if (!contact) {
      console.log('❌ No contact found with these credentials');
      return;
    }

    console.log('✅ Contact found! Analyzing structure...\n');

    // Display the contact structure
    console.log('🔍 CRITICAL: Understanding the contact object:');
    console.log('=====================================');
    console.log('contact.id:', contact.id, '(This is the HubSpot internal record ID)');
    console.log('contact.properties.student_id:', contact.properties.student_id, '(This is the custom student ID)');
    console.log('contact.properties.hs_object_id:', contact.properties.hs_object_id, '(This should match contact.id)');
    console.log('=====================================\n');

    // Verify the relationship
    console.log('📊 ID Analysis:');
    console.log(`- contact.id === contact.properties.hs_object_id: ${contact.id === contact.properties.hs_object_id}`);
    console.log(`- contact.id === contact.properties.student_id: ${contact.id === contact.properties.student_id}`);
    console.log('\n');

    // Show which ID should be used for associations
    console.log('⚠️ IMPORTANT FOR OWNERSHIP VERIFICATION:');
    console.log('=========================================');
    console.log('For HubSpot associations, we should use:');
    console.log(`✅ contact.id = "${contact.id}" (The HubSpot object ID)`);
    console.log('NOT:');
    console.log(`❌ contact.properties.student_id = "${contact.properties.student_id}" (The custom student ID)`);
    console.log('=========================================\n');

    // Now test a booking association
    console.log('🔍 Testing booking association with the contact...\n');

    const testBookingId = '35117316788';
    const booking = await hubspot.getBookingWithAssociations(testBookingId);

    if (booking && booking.associations && booking.associations.contacts) {
      const contactAssocs = booking.associations.contacts.results || [];
      console.log('📋 Booking contact associations:');
      contactAssocs.forEach((assoc, index) => {
        console.log(`Association ${index + 1}:`);
        console.log(`- assoc.id: ${assoc.id}`);
        console.log(`- assoc.toObjectId: ${assoc.toObjectId}`);
        console.log(`- Type: ${assoc.type}`);
      });

      console.log('\n🎯 Ownership Verification Test:');
      console.log('================================');
      const belongsToUser = contactAssocs.some(assoc => {
        const matchById = assoc.id === contact.id;
        const matchByToObjectId = assoc.toObjectId === contact.id;
        const matchByStudentId = assoc.id === contact.properties.student_id || assoc.toObjectId === contact.properties.student_id;

        console.log('Checking association:');
        console.log(`- assoc.id (${assoc.id}) === contact.id (${contact.id}): ${matchById}`);
        console.log(`- assoc.toObjectId (${assoc.toObjectId}) === contact.id (${contact.id}): ${matchByToObjectId}`);
        console.log(`- Matches using student_id: ${matchByStudentId}`);

        return matchById || matchByToObjectId;
      });

      console.log(`\n✨ Result: Booking belongs to user: ${belongsToUser ? '✅ YES' : '❌ NO'}`);
      console.log('================================\n');

      if (!belongsToUser) {
        console.log('🔴 CRITICAL ISSUE FOUND:');
        console.log('The current code is likely using the wrong ID for ownership verification!');
        console.log('It should use contact.id (HubSpot object ID) not contact.properties.student_id');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

// Run the test
testContactStructure().catch(console.error);