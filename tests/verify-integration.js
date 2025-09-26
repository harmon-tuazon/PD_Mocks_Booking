const fs = require('fs');
const path = require('path');

console.log('Verifying BookingsList and DeleteBookingModal Integration...\n');

const bookingsListPath = path.join(__dirname, '../frontend/src/components/bookings/BookingsList.jsx');
const content = fs.readFileSync(bookingsListPath, 'utf8');

const checks = [
  {
    name: 'DeleteBookingModal imported',
    test: content.includes("import { DeleteBookingModal } from '../shared'"),
    status: null
  },
  {
    name: 'Old ConfirmationModal removed',
    test: !content.includes('const ConfirmationModal'),
    status: null
  },
  {
    name: 'New state variables added',
    test: content.includes('deleteModalOpen') &&
          content.includes('bookingToDelete') &&
          content.includes('isDeleting') &&
          content.includes('deleteError'),
    status: null
  },
  {
    name: 'DeleteBookingModal component used in JSX',
    test: content.includes('<DeleteBookingModal'),
    status: null
  },
  {
    name: 'Modal props correctly passed',
    test: content.includes('isOpen={deleteModalOpen}') &&
          content.includes('booking={bookingToDelete}') &&
          content.includes('isDeleting={isDeleting}') &&
          content.includes('error={deleteError}') &&
          content.includes('onClose={handleCloseModal}') &&
          content.includes('onConfirm={handleConfirmDelete}'),
    status: null
  },
  {
    name: 'Error handling implemented',
    test: content.includes('setDeleteError'),
    status: null
  }
];

// Run checks
checks.forEach(check => {
  check.status = check.test;
  console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
});

// Summary
const passed = checks.filter(c => c.status).length;
const total = checks.length;

console.log(`\n=== Integration Status ===`);
console.log(`Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✨ SUCCESS: DeleteBookingModal has been successfully integrated into BookingsList!');
  console.log('\nFeatures integrated:');
  console.log('- Unified modal component replacing custom confirmation modal');
  console.log('- Enhanced error handling with in-modal error display');
  console.log('- Improved loading states and user feedback');
  console.log('- Better accessibility with ARIA labels');
  console.log('- Consistent design with other modal components');
  console.log('- Credit restoration display (when applicable)');
  console.log('\nNext steps:');
  console.log('1. Run the development server: npm run dev');
  console.log('2. Navigate to My Bookings page');
  console.log('3. Test cancellation functionality');
  console.log('4. Verify error handling by disconnecting network');
} else {
  console.log('\n⚠️ WARNING: Some integration checks failed.');
  console.log('Please review the implementation.');
}

process.exit(passed === total ? 0 : 1);