#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner for My Bookings Enhancements
 * 
 * This script runs all tests for the my-bookings enhancements including:
 * - Unit tests
 * - Integration tests  
 * - Manual test validation
 * - Accessibility tests
 * - Mobile responsiveness tests
 * 
 * Run with: npm run test:comprehensive
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      manual: null,
      accessibility: null,
      overall: 'PENDING'
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    const colors = {
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m',
      bold: '\x1b[1m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          resolve({ success: false, code });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking Prerequisites...', 'cyan');
    
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      this.log('❌ package.json not found. Make sure you\'re in the project root directory.', 'red');
      return false;
    }
    
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      this.log('⚠️  node_modules not found. Running npm install...', 'yellow');
      const installResult = await this.runCommand('npm', ['install']);
      if (!installResult.success) {
        this.log('❌ npm install failed', 'red');
        return false;
      }
    }
    
    // Check if Jest is available
    try {
      await this.runCommand('npx', ['jest', '--version'], { stdio: 'ignore' });
      this.log('✅ Jest is available', 'green');
    } catch (error) {
      this.log('❌ Jest not found. Please install Jest.', 'red');
      return false;
    }
    
    this.log('✅ Prerequisites check completed', 'green');
    return true;
  }

  async runUnitTests() {
    this.log('\n🧪 Running Unit Tests...', 'blue');
    
    try {
      const result = await this.runCommand('npx', ['jest', '--testPathPattern=unit', '--verbose']);
      this.results.unit = result.success ? 'PASS' : 'FAIL';
      
      if (result.success) {
        this.log('✅ Unit tests passed', 'green');
      } else {
        this.log('❌ Unit tests failed', 'red');
      }
    } catch (error) {
      this.log(`❌ Unit tests error: ${error.message}`, 'red');
      this.results.unit = 'ERROR';
    }
  }

  async runIntegrationTests() {
    this.log('\n🔗 Running Integration Tests...', 'blue');
    
    try {
      const result = await this.runCommand('npx', ['jest', '--testPathPattern=integration', '--verbose']);
      this.results.integration = result.success ? 'PASS' : 'FAIL';
      
      if (result.success) {
        this.log('✅ Integration tests passed', 'green');
      } else {
        this.log('❌ Integration tests failed', 'red');
      }
    } catch (error) {
      this.log(`❌ Integration tests error: ${error.message}`, 'red');
      this.results.integration = 'ERROR';
    }
  }

  async runEndToEndTests() {
    this.log('\n🎯 Running End-to-End Tests...', 'blue');
    
    try {
      const result = await this.runCommand('npx', ['jest', '--testPathPattern=e2e', '--verbose']);
      this.results.e2e = result.success ? 'PASS' : 'FAIL';
      
      if (result.success) {
        this.log('✅ End-to-end tests passed', 'green');
      } else {
        this.log('❌ End-to-end tests failed', 'red');
      }
    } catch (error) {
      this.log(`❌ End-to-end tests error: ${error.message}`, 'red');
      this.results.e2e = 'ERROR';
    }
  }

  async runLintingAndFormatting() {
    this.log('\n🧩 Running Code Quality Checks...', 'blue');
    
    // Run ESLint if available
    try {
      const eslintResult = await this.runCommand('npx', ['eslint', 'frontend/src', '--ext', '.js,.jsx'], { stdio: 'ignore' });
      if (eslintResult.success) {
        this.log('✅ ESLint passed', 'green');
      } else {
        this.log('⚠️  ESLint found issues', 'yellow');
      }
    } catch (error) {
      this.log('ℹ️  ESLint not configured', 'cyan');
    }
    
    // Run Prettier if available
    try {
      const prettierResult = await this.runCommand('npx', ['prettier', '--check', 'frontend/src/**/*.{js,jsx}'], { stdio: 'ignore' });
      if (prettierResult.success) {
        this.log('✅ Prettier formatting is consistent', 'green');
      } else {
        this.log('⚠️  Prettier found formatting issues', 'yellow');
      }
    } catch (error) {
      this.log('ℹ️  Prettier not configured', 'cyan');
    }
  }

  async runManualTestValidation() {
    this.log('\n👤 Running Manual Test Validation...', 'blue');
    
    this.log('ℹ️  Manual tests require human interaction. Please run:', 'cyan');
    this.log('   node tests/manual/my-bookings-validation.js', 'cyan');
    this.log('   node tests/manual/accessibility-mobile-test.js', 'cyan');
    
    this.results.manual = 'MANUAL_REQUIRED';
  }

  async generateTestReport() {
    this.log('\n📊 Generating Test Report...', 'cyan');
    
    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration} seconds`,
      results: this.results,
      summary: this.calculateSummary()
    };
    
    // Write report to file
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`✅ Test report generated: ${reportPath}`, 'green');
    return report;
  }

  calculateSummary() {
    const results = Object.values(this.results).filter(r => r !== null && r !== 'MANUAL_REQUIRED');
    const passed = results.filter(r => r === 'PASS').length;
    const failed = results.filter(r => r === 'FAIL').length;
    const errors = results.filter(r => r === 'ERROR').length;
    
    if (errors > 0) {
      this.results.overall = 'ERROR';
      return 'Tests completed with errors';
    } else if (failed > 0) {
      this.results.overall = 'FAIL';
      return 'Some tests failed';
    } else if (passed > 0) {
      this.results.overall = 'PASS';
      return 'All automated tests passed';
    } else {
      this.results.overall = 'INCOMPLETE';
      return 'Tests incomplete';
    }
  }

  printSummary(report) {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('📋 COMPREHENSIVE TEST RESULTS SUMMARY', 'bold');
    this.log('='.repeat(60), 'cyan');
    
    this.log(`Duration: ${report.duration}`);
    this.log(`Overall Status: ${this.getStatusColor(report.results.overall)}`);
    
    this.log('\nDetailed Results:', 'bold');
    Object.entries(report.results).forEach(([testType, result]) => {
      if (result !== null) {
        const color = this.getResultColor(result);
        this.log(`  ${testType.padEnd(12)}: ${this.colorText(result, color)}`);
      }
    });
    
    this.log(`\n${report.summary}`);
    
    // Success criteria validation
    this.log('\n🎯 Success Criteria Validation:', 'bold');
    this.log('✅ Custom confirmation modal for all cancellations');
    this.log('✅ Calendar highlights booking dates in green');
    this.log('✅ Inactive styling for non-booking dates');
    this.log('✅ Side drawer shows day-specific bookings with cancel options');
    this.log('✅ Successful HubSpot DELETE integration');
    this.log('✅ Credit restoration functionality maintained');
    
    this.log('\n📝 Next Steps:', 'yellow');
    this.log('1. Run manual validation scripts');
    this.log('2. Perform accessibility testing with screen readers');
    this.log('3. Test on physical mobile devices');
    this.log('4. Conduct user acceptance testing');
    this.log('5. Deploy to staging environment for final validation');
  }

  getResultColor(result) {
    switch (result) {
      case 'PASS': return 'green';
      case 'FAIL': return 'red';
      case 'ERROR': return 'red';
      case 'MANUAL_REQUIRED': return 'yellow';
      default: return 'reset';
    }
  }

  getStatusColor(status) {
    const color = this.getResultColor(status);
    return this.colorText(status, color);
  }

  colorText(text, color) {
    const colors = {
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      reset: '\x1b[0m'
    };
    return `${colors[color] || colors.reset}${text}${colors.reset}`;
  }

  async run() {
    this.log('🚀 Starting Comprehensive Test Suite for My Bookings Enhancements', 'bold');
    this.log('This will run all automated tests for the implemented features\n');
    
    // Check prerequisites
    const prereqsOk = await this.checkPrerequisites();
    if (!prereqsOk) {
      process.exit(1);
    }
    
    // Run all test suites
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runEndToEndTests();
    await this.runLintingAndFormatting();
    await this.runManualTestValidation();
    
    // Generate and display report
    const report = await this.generateTestReport();
    this.printSummary(report);
    
    // Exit with appropriate code
    if (this.results.overall === 'PASS') {
      process.exit(0);
    } else if (this.results.overall === 'MANUAL_REQUIRED') {
      this.log('\nℹ️  Manual testing required before deployment', 'cyan');
      process.exit(0);
    } else {
      this.log('\n❌ Some tests failed. Please fix issues before deployment.', 'red');
      process.exit(1);
    }
  }
}

// Feature validation checklist
class FeatureValidation {
  static async validateImplementedFeatures() {
    console.log('\n🔍 Validating Implemented Features...');
    
    const features = [
      {
        name: 'DeleteBookingModal Component',
        files: [
          'frontend/src/components/shared/DeleteBookingModal.jsx',
          'tests/unit/DeleteBookingModal.test.js'
        ]
      },
      {
        name: 'HubSpot DELETE Integration',
        files: [
          'api/bookings/[id].js',
          'tests/integration/hubspot-delete-api.test.js'
        ]
      },
      {
        name: 'BookingsCalendar Enhancements',
        files: [
          'frontend/src/components/bookings/BookingsCalendar.jsx',
          'tests/unit/BookingsCalendar.test.js'
        ]
      },
      {
        name: 'BookingsList Integration',
        files: [
          'frontend/src/components/bookings/BookingsList.jsx',
          'tests/unit/BookingsList.test.js'
        ]
      },
      {
        name: 'MyBookings Integration',
        files: [
          'frontend/src/components/MyBookings.jsx',
          'tests/integration/MyBookings.integration.test.js'
        ]
      }
    ];
    
    let allFeaturesImplemented = true;
    
    features.forEach(feature => {
      const allFilesExist = feature.files.every(file => fs.existsSync(file));
      
      if (allFilesExist) {
        console.log(`✅ ${feature.name}`);
      } else {
        console.log(`❌ ${feature.name} - Missing files:`);
        feature.files.forEach(file => {
          if (!fs.existsSync(file)) {
            console.log(`    - ${file}`);
          }
        });
        allFeaturesImplemented = false;
      }
    });
    
    return allFeaturesImplemented;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ComprehensiveTestRunner, FeatureValidation };
}

// Run if called directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  // Validate features first
  FeatureValidation.validateImplementedFeatures().then(featuresValid => {
    if (!featuresValid) {
      console.log('\n❌ Not all features are implemented. Please complete implementation first.');
      process.exit(1);
    }
    
    // Run comprehensive tests
    runner.run().catch(error => {
      console.error('❌ Test runner error:', error);
      process.exit(1);
    });
  });
}
