/**
 * Test to verify booking contact match
 */

require('dotenv').config();
const { HubSpotService } = require('../../api/_shared/hubspot');

async function checkBookingContactMatch() {
  const hubspot = new HubSpotService();

  try {
    // First, get the booking and its associations
    const testBookingId = '35117316788';
    console.log('🔍 Step 1: Getting booking details...');

    const booking = await hubspot.getBookingWithAssociations(testBookingId);
    console.log('✅ Booking found:', {
      id: booking.id,
      email: booking.properties.email,
      name: booking.properties.name
    });

    // Check contact associations
    if (booking.associations && booking.associations.contacts) {
      console.log('🔍 Step 2: Checking contact associations...');
      const contactAssocs = booking.associations.contacts.results || [];
      console.log('Contact associations:', contactAssocs);

      if (contactAssocs.length > 0) {
        const contactId = contactAssocs[0].toObjectId || contactAssocs[0].id;
        console.log('🔍 Step 3: Getting contact details...');

        const contact = await hubspot.apiCall('GET', `/crm/v3/objects/contacts/${contactId}?properties=email,student_id,firstname,lastname`);

        console.log('✅ Associated contact:', {
          id: contact.id,
          email: contact.properties.email,
          student_id: contact.properties.student_id,
          name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim()
        });

        console.log('🔍 Step 4: Comparing with test credentials...');
        console.log('Test credentials used:');
        console.log('- student_id: MD24011');
        console.log('- email: htuazon@prepdoctors.com');

        console.log('Actual contact data:');
        console.log(`- student_id: ${contact.properties.student_id}`);
        console.log(`- email: ${contact.properties.email}`);

        const studentIdMatch = contact.properties.student_id === 'MD24011';
        const emailMatch = contact.properties.email === 'htuazon@prepdoctors.com';

        console.log('Match results:');
        console.log(`- Student ID match: ${studentIdMatch ? '✅' : '❌'}`);
        console.log(`- Email match: ${emailMatch ? '✅' : '❌'}`);

        if (!studentIdMatch || !emailMatch) {
          console.log('⚠️ Credentials mismatch detected! This explains the 400 error.');
          console.log('Use the correct credentials shown above for testing.');
        }

      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
checkBookingContactMatch().catch(console.error);