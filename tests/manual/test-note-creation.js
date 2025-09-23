require('dotenv').config({ path: '../../.env' });
const { HubSpotService } = require('../../api/_shared/hubspot');

/**
 * Manual test script for HubSpot Note creation functionality
 *
 * This script tests the createBookingNote function independently
 * to ensure Notes are properly created and associated with Contacts
 */

async function testNoteCreation() {
  try {
    console.log('🧪 Testing HubSpot Note Creation...\n');

    // Initialize HubSpot service
    const hubspot = new HubSpotService();

    // Test data - you'll need to update these with actual IDs from your HubSpot
    const TEST_CONTACT_ID = process.env.TEST_CONTACT_ID || '124340560202'; // Replace with an actual contact ID

    const testBookingData = {
      bookingId: `Test Booking - ${new Date().toISOString()}`,
      name: 'Test Student',
      email: 'test@example.com',
      dominantHand: true // Right hand
    };

    const testMockExamData = {
      exam_date: '2025-02-15',
      mock_type: 'Clinical Skills',
      location: 'Mississauga'
    };

    console.log('📋 Test Configuration:');
    console.log(`  Contact ID: ${TEST_CONTACT_ID}`);
    console.log(`  Booking ID: ${testBookingData.bookingId}`);
    console.log(`  Exam Type: ${testMockExamData.mock_type}`);
    console.log(`  Exam Date: ${testMockExamData.exam_date}\n`);

    console.log('🚀 Creating Note...');

    // Test the Note creation
    const noteResult = await hubspot.createBookingNote(
      testBookingData,
      TEST_CONTACT_ID,
      testMockExamData
    );

    if (noteResult) {
      console.log('\n✅ Note created successfully!');
      console.log(`  Note ID: ${noteResult.id}`);
      console.log(`  Created at: ${new Date(noteResult.createdAt).toLocaleString()}`);

      if (noteResult.properties) {
        console.log('\n📝 Note Properties:');
        console.log(`  Timestamp: ${new Date(parseInt(noteResult.properties.hs_timestamp)).toLocaleString()}`);

        // Extract plain text from HTML for display
        const plainText = noteResult.properties.hs_note_body
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100);

        console.log(`  Note preview: ${plainText}...`);
      }

      console.log('\n🔗 View in HubSpot:');
      console.log(`  https://app.hubspot.com/contacts/[your-portal-id]/contact/${TEST_CONTACT_ID}`);
      console.log('  Check the timeline for the new Note!\n');

    } else {
      console.log('\n⚠️ Note creation returned null (check logs for errors)');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('HubSpot API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Additional test for error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...\n');

  const hubspot = new HubSpotService();

  // Test with invalid contact ID
  const invalidContactId = '999999999999';

  const testBookingData = {
    bookingId: 'Error Test Booking',
    name: 'Error Test',
    email: 'error@test.com',
    dominantHand: false
  };

  const testMockExamData = {
    exam_date: '2025-03-01',
    mock_type: 'Situational Judgment',
    location: 'Toronto'
  };

  console.log(`📋 Testing with invalid Contact ID: ${invalidContactId}`);

  const result = await hubspot.createBookingNote(
    testBookingData,
    invalidContactId,
    testMockExamData
  );

  if (result === null) {
    console.log('✅ Error handled correctly - returned null without throwing');
  } else {
    console.log('⚠️ Unexpected: Note was created with invalid contact ID');
  }
}

// Run tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  HubSpot Note Creation Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test successful Note creation
  await testNoteCreation();

  // Test error handling
  await testErrorHandling();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  All tests completed!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testNoteCreation, testErrorHandling };