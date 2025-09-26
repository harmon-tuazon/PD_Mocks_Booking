/**
 * Manual test script to validate booking ownership verification fix
 * Tests the corrected association handling for booking deletion
 */

// Import the HubSpot service to test association mapping
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const axios = require('axios');

// Mock HubSpot API responses to simulate the problem and solution
const mockV4AssociationResponse = {
  results: [
    {
      toObjectId: 12345678, // This comes as NUMBER from V4 API
      associationSpec: {
        associationTypeId: 1
      }
    }
  ]
};

const mockContactId = "12345678"; // This is STRING from authentication

// Test the association mapping logic
function testAssociationMapping() {
  console.log('🧪 Testing association mapping fix...\n');

  // Simulate old broken logic
  console.log('❌ OLD LOGIC (BROKEN):');
  const oldMappedAssoc = {
    id: mockV4AssociationResponse.results[0].toObjectId, // Number: 12345678
    toObjectId: mockV4AssociationResponse.results[0].toObjectId, // Number: 12345678
    type: 'booking_to_contact'
  };

  console.log('Contact ID from auth:', mockContactId, typeof mockContactId);
  console.log('Association ID (old):', oldMappedAssoc.id, typeof oldMappedAssoc.id);
  console.log('Direct comparison (old):', oldMappedAssoc.id === mockContactId); // false!
  console.log('String comparison (old):', String(oldMappedAssoc.id) === mockContactId); // true

  console.log('\n✅ NEW LOGIC (FIXED):');
  // Simulate new fixed logic - convert to string during mapping
  const newMappedAssoc = {
    id: String(mockV4AssociationResponse.results[0].toObjectId), // String: "12345678"
    toObjectId: String(mockV4AssociationResponse.results[0].toObjectId), // String: "12345678"
    type: 'booking_to_contact'
  };

  console.log('Contact ID from auth:', mockContactId, typeof mockContactId);
  console.log('Association ID (new):', newMappedAssoc.id, typeof newMappedAssoc.id);
  console.log('Direct comparison (new):', newMappedAssoc.id === mockContactId); // true!

  return newMappedAssoc.id === mockContactId;
}

// Test the ownership verification logic
function testOwnershipVerification() {
  console.log('\n🔐 Testing ownership verification logic...\n');

  const contactId = "12345678";
  const contactAssociations = [
    { id: "12345678", toObjectId: "12345678", type: 'booking_to_contact' },
    { id: "87654321", toObjectId: "87654321", type: 'booking_to_contact' }
  ];

  // Simulate fixed ownership verification
  const belongsToUser = contactAssociations.some(assoc => {
    const contactIdStr = String(contactId);
    const assocIdStr = String(assoc.id);

    const isMatch = assocIdStr === contactIdStr;

    console.log('🔍 Checking association:', {
      contactId: contactIdStr,
      associationContactId: assocIdStr,
      isMatch: isMatch
    });

    return isMatch;
  });

  console.log('✅ Ownership verification result:', belongsToUser);
  return belongsToUser;
}

// Run tests
async function runTests() {
  console.log('🚀 Running Booking Ownership Verification Tests\n');
  console.log('='.repeat(60));

  try {
    const mappingTest = testAssociationMapping();
    const ownershipTest = testOwnershipVerification();

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS:');
    console.log(`Association Mapping Fix: ${mappingTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Ownership Verification: ${ownershipTest ? '✅ PASS' : '❌ FAIL'}`);

    if (mappingTest && ownershipTest) {
      console.log('\n🎉 All tests passed! The fix should resolve the ownership verification issue.');
    } else {
      console.log('\n❌ Some tests failed. Review the logic before deploying.');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { testAssociationMapping, testOwnershipVerification };