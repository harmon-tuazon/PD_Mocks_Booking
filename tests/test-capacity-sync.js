#!/usr/bin/env node

/**
 * Test Script for Mock Exam Capacity Sync
 *
 * This script tests the capacity sync functionality by:
 * 1. Fetching a mock exam
 * 2. Getting its current capacity
 * 3. Recalculating from actual associations
 * 4. Comparing the values
 *
 * Usage:
 *   node tests/test-capacity-sync.js
 *   node tests/test-capacity-sync.js --exam-id=12345
 */

require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../api/_shared/hubspot');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
args.forEach(arg => {
  const [key, value] = arg.split('=');
  options[key.replace('--', '')] = value || true;
});

const EXAM_ID = options['exam-id'];

console.log('='.repeat(60));
console.log('Mock Exam Capacity Sync Test');
console.log('='.repeat(60));

/**
 * Test capacity calculation for a mock exam
 */
async function testCapacityCalculation(hubspot, examId) {
  console.log(`\nTesting Mock Exam ID: ${examId}`);
  console.log('-'.repeat(40));

  try {
    // Step 1: Get current mock exam data
    console.log('1. Fetching mock exam data...');
    const exam = await hubspot.getMockExam(examId);

    if (!exam) {
      throw new Error(`Mock exam ${examId} not found`);
    }

    const storedCount = parseInt(exam.properties.total_bookings) || 0;
    const capacity = parseInt(exam.properties.capacity) || 0;

    console.log(`   Mock Type: ${exam.properties.mock_type}`);
    console.log(`   Exam Date: ${exam.properties.exam_date}`);
    console.log(`   Location: ${exam.properties.location || 'N/A'}`);
    console.log(`   Capacity: ${capacity}`);
    console.log(`   Stored Total Bookings: ${storedCount}`);

    // Step 2: Get actual active bookings count
    console.log('\n2. Counting active bookings from associations...');
    const actualCount = await hubspot.getActiveBookingsCount(examId);
    console.log(`   Actual Active Bookings: ${actualCount}`);

    // Step 3: Compare values
    console.log('\n3. Analysis:');
    const difference = actualCount - storedCount;

    if (difference === 0) {
      console.log(`   ✅ ACCURATE - Stored count matches actual count`);
    } else {
      console.log(`   ⚠️  DISCREPANCY DETECTED`);
      console.log(`   Difference: ${difference > 0 ? '+' : ''}${difference}`);
      console.log(`   This indicates ${Math.abs(difference)} ${difference > 0 ? 'untracked bookings' : 'deleted bookings not reflected'}`);
    }

    // Step 4: Calculate availability
    const storedAvailable = Math.max(0, capacity - storedCount);
    const actualAvailable = Math.max(0, capacity - actualCount);

    console.log('\n4. Availability Impact:');
    console.log(`   Stored Available Slots: ${storedAvailable} / ${capacity}`);
    console.log(`   Actual Available Slots: ${actualAvailable} / ${capacity}`);

    if (storedAvailable !== actualAvailable) {
      console.log(`   ⚠️  UI shows ${storedAvailable} slots but actually has ${actualAvailable} slots`);
    }

    // Step 5: Test recalculation function
    console.log('\n5. Testing recalculation function...');
    const recalculatedCount = await hubspot.recalculateMockExamBookings(examId);
    console.log(`   Recalculated and updated to: ${recalculatedCount}`);

    // Step 6: Verify update
    console.log('\n6. Verifying update...');
    const updatedExam = await hubspot.getMockExam(examId);
    const newStoredCount = parseInt(updatedExam.properties.total_bookings) || 0;
    console.log(`   New stored count: ${newStoredCount}`);

    if (newStoredCount === actualCount) {
      console.log(`   ✅ UPDATE SUCCESSFUL - Count is now accurate`);
    } else {
      console.log(`   ❌ UPDATE FAILED - Count is still inaccurate`);
    }

    return {
      examId,
      success: newStoredCount === actualCount,
      previousCount: storedCount,
      actualCount,
      newCount: newStoredCount,
      difference
    };

  } catch (error) {
    console.error(`\n❌ Test failed for exam ${examId}:`, error.message);
    return {
      examId,
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a sample mock exam for testing
 */
async function getSampleMockExam(hubspot) {
  const searchPayload = {
    filterGroups: [{
      filters: [{
        propertyName: 'is_active',
        operator: 'EQ',
        value: 'true'
      }]
    }],
    properties: ['hs_object_id', 'mock_type', 'exam_date', 'total_bookings'],
    sorts: [{
      propertyName: 'total_bookings',
      direction: 'DESCENDING' // Get one with bookings
    }],
    limit: 1
  };

  const result = await hubspot.apiCall(
    'POST',
    `/crm/v3/objects/${HUBSPOT_OBJECTS.mock_exams}/search`,
    searchPayload
  );

  return result.results?.[0];
}

/**
 * Main test execution
 */
async function main() {
  try {
    // Verify environment variables
    if (!process.env.HS_PRIVATE_APP_TOKEN) {
      throw new Error('HS_PRIVATE_APP_TOKEN environment variable is required');
    }

    const hubspot = new HubSpotService();

    let examIdToTest = EXAM_ID;

    if (!examIdToTest) {
      console.log('No exam ID provided, finding a sample mock exam...');
      const sampleExam = await getSampleMockExam(hubspot);

      if (!sampleExam) {
        throw new Error('No active mock exams found for testing');
      }

      examIdToTest = sampleExam.id;
      console.log(`Selected: ${sampleExam.properties.mock_type} on ${sampleExam.properties.exam_date}`);
    }

    // Run the test
    const result = await testCapacityCalculation(hubspot, examIdToTest);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    if (result.success) {
      console.log('✅ TEST PASSED');
      console.log(`Mock exam ${result.examId} capacity sync working correctly`);
      if (result.difference !== 0) {
        console.log(`Successfully corrected discrepancy of ${Math.abs(result.difference)} bookings`);
      }
    } else if (result.error) {
      console.log('❌ TEST FAILED');
      console.log(`Error: ${result.error}`);
    } else {
      console.log('❌ TEST FAILED');
      console.log('Could not sync capacity correctly');
    }

    // Test the available endpoint with real-time flag
    console.log('\n' + '='.repeat(60));
    console.log('Testing Available Endpoint with Real-time Flag');
    console.log('='.repeat(60));

    console.log('\nTo test the available endpoint with real-time capacity:');
    console.log('  GET /api/mock-exams/available?mock_type=Clinical%20Skills&realtime=true');
    console.log('\nThis will recalculate capacity for all returned exams');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Test complete');
    process.exit(0);
  }).catch(error => {
    console.error('\nUnexpected error:', error);
    process.exit(1);
  });
}

module.exports = { testCapacityCalculation };