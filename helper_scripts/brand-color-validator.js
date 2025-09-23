#!/usr/bin/env node

/**
 * PrepDoctors Brand Color Validator
 * Quick validation script for brand color accessibility
 */

const { getContrastRatio, checkWCAGCompliance } = require('./accessibility-test.js');

// Brand colors from Tailwind config
const brandColors = {
  'Primary Blue': '#0660B2',
  'Secondary Blue': '#054E91',
  'Navy Blue': '#02376D',
  'Teal': '#44D3BB',
  'Dark Teal': '#116a4e',
  'Coral': '#F45E56',
  'Dark Coral': '#b71c1c',
  'Light Grey': '#EFEFEF',
  'Cool Grey': '#E6E6E6',
  'Warm Grey': '#E0DDD1'
};

const backgrounds = {
  'White': '#ffffff',
  'Light Grey': '#EFEFEF',
  'Cool Grey': '#E6E6E6',
  'Primary Light': '#e8f2ff',
  'Teal Light': '#ecfdf9',
  'Coral Light': '#fef5f5'
};

console.log('🎨 PrepDoctors Brand Color Accessibility Validator\n');

// Test each brand color against each background
Object.entries(brandColors).forEach(([colorName, colorHex]) => {
  console.log(`\n📋 Testing ${colorName} (${colorHex}):`);

  Object.entries(backgrounds).forEach(([bgName, bgHex]) => {
    const ratio = getContrastRatio(colorHex, bgHex);
    const aaPass = checkWCAGCompliance(ratio, 'AA', 'normal');
    const status = aaPass ? '✅' : '❌';

    console.log(`   ${status} On ${bgName}: ${ratio.toFixed(2)}:1`);
  });
});

console.log('\n🎯 Quick Fix Recommendations:');
console.log('   • Use Dark Teal (#116a4e) instead of Teal (#44D3BB) for text');
console.log('   • Use Dark Coral (#b71c1c) instead of Coral (#F45E56) for text');
console.log('   • All blue variants pass WCAG AA compliance');
console.log('   • Consider Coral/Teal for large text (18pt+) or backgrounds only\n');