/**
 * Test to understand real contact structure from HubSpot API
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function testRealContactStructure() {
  const hubspot = new HubSpotService();

  try {
    console.log('🔍 Getting a real contact from HubSpot to understand structure...\n');

    // First, get a contact directly by ID
    const testContactId = '113347038883'; // From previous test

    console.log(`📋 Fetching contact ID: ${testContactId}\n`);

    const contactResponse = await hubspot.apiCall(
      'GET',
      `/crm/v3/objects/contacts/${testContactId}?properties=email,firstname,lastname,student_id,hs_object_id`
    );

    console.log('✅ Contact fetched! Analyzing structure...\n');

    // Display the ACTUAL structure returned by HubSpot
    console.log('🔍 RAW HUBSPOT API RESPONSE STRUCTURE:');
    console.log('=====================================');
    console.log('Full response keys:', Object.keys(contactResponse));
    console.log('\nTop-level fields:');
    console.log(`- id: "${contactResponse.id}" (Type: ${typeof contactResponse.id})`);
    console.log(`- properties: [Object with custom fields]`);
    console.log(`- createdAt: ${contactResponse.createdAt}`);
    console.log(`- updatedAt: ${contactResponse.updatedAt}`);
    console.log(`- archived: ${contactResponse.archived}`);
    console.log('\nProperties object:');
    console.log(`- properties.hs_object_id: "${contactResponse.properties.hs_object_id}" (Type: ${typeof contactResponse.properties.hs_object_id})`);
    console.log(`- properties.student_id: "${contactResponse.properties.student_id || 'NOT SET'}" (Type: ${typeof contactResponse.properties.student_id})`);
    console.log(`- properties.email: "${contactResponse.properties.email}"`);
    console.log(`- properties.firstname: "${contactResponse.properties.firstname}"`);
    console.log(`- properties.lastname: "${contactResponse.properties.lastname}"`);
    console.log('=====================================\n');

    // Critical comparison
    console.log('🔴 CRITICAL FINDING:');
    console.log('====================');
    console.log(`contactResponse.id === contactResponse.properties.hs_object_id: ${contactResponse.id === contactResponse.properties.hs_object_id}`);
    console.log('Both should represent the same HubSpot internal object ID\n');

    // Now test what searchContacts returns
    console.log('🔍 Testing searchContacts return value...\n');

    // We need to find a contact with student_id set
    // Let's search for contacts that have student_id
    const searchResponse = await hubspot.apiCall(
      'POST',
      '/crm/v3/objects/contacts/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: 'student_id',
            operator: 'HAS_PROPERTY'
          }]
        }],
        properties: ['student_id', 'email', 'firstname', 'lastname', 'hs_object_id'],
        limit: 1
      }
    );

    if (searchResponse.results && searchResponse.results.length > 0) {
      const searchedContact = searchResponse.results[0];

      console.log('📋 Contact found via search:');
      console.log('============================');
      console.log('Structure returned by search:');
      console.log(`- id: "${searchedContact.id}" (Type: ${typeof searchedContact.id})`);
      console.log(`- properties.hs_object_id: "${searchedContact.properties.hs_object_id}" (Type: ${typeof searchedContact.properties.hs_object_id})`);
      console.log(`- properties.student_id: "${searchedContact.properties.student_id}" (Type: ${typeof searchedContact.properties.student_id})`);
      console.log('============================\n');

      // Now simulate what searchContacts does
      console.log('🎯 What searchContacts() returns:');
      console.log('==================================');
      const simulatedReturn = searchResponse.results[0]; // This is what line 141 in hubspot.js does
      console.log('The searchContacts method returns: result.results?.[0]');
      console.log('This means:');
      console.log(`- contact.id will be: "${simulatedReturn.id}" (HubSpot object ID)`);
      console.log(`- contact.properties.student_id will be: "${simulatedReturn.properties.student_id}" (Custom student ID)`);
      console.log(`- contact.properties.hs_object_id will be: "${simulatedReturn.properties.hs_object_id}" (Also HubSpot object ID)`);
      console.log('==================================\n');

      // The bug analysis
      console.log('🐛 BUG ANALYSIS FOR api/bookings/[id].js:');
      console.log('==========================================');
      console.log('Line 163 currently has: const contactId = contact.id;');
      console.log(`This sets contactId to: "${simulatedReturn.id}"`);
      console.log('\nFor HubSpot associations:');
      console.log('✅ This is CORRECT - contact.id is the HubSpot object ID');
      console.log('❌ Using contact.properties.student_id would be WRONG\n');

      console.log('⚠️ WAIT - The code might actually be correct!');
      console.log('The issue might be elsewhere in the association checking logic.');
      console.log('==========================================\n');
    } else {
      console.log('❌ No contacts with student_id found');
    }

    // Check if there's a type mismatch issue
    console.log('🔍 CHECKING FOR TYPE MISMATCHES:');
    console.log('=================================');
    console.log('HubSpot API returns IDs as strings.');
    console.log(`Example: contact.id = "${testContactId}" (Type: string)`);
    console.log('Association IDs are also strings.');
    console.log('String comparison should work with === operator.');
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
  }
}

// Run the test
testRealContactStructure().catch(console.error);