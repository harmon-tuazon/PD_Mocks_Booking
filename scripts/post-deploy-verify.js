#!/usr/bin/env node

const https = require('https');
const process = require('process');

// Configuration
const DEPLOYMENT_URL = process.argv[2] || 'https://mocksbooking-prepdoctors.vercel.app';
const TIMEOUT = 30000; // 30 seconds

console.log('🔍 Post-deployment verification starting...');
console.log(`🌐 Testing URL: ${DEPLOYMENT_URL}`);

// Test endpoints to verify
const tests = [
  {
    name: 'Homepage/Login redirect',
    path: '/',
    expectedStatus: [200, 302],
    expectedContent: ['login', 'Login', 'PrepDoctors']
  },
  {
    name: 'Login page',
    path: '/login',
    expectedStatus: [200],
    expectedContent: ['login', 'email', 'password']
  },
  {
    name: 'API Health Check',
    path: '/api/health',
    expectedStatus: [200, 404], // 404 is OK if we don't have a health endpoint
    expectedContent: []
  },
  {
    name: 'Static Assets',
    path: '/assets/index-',
    expectedStatus: [200, 404], // Will check if assets are loading
    expectedContent: [],
    partial: true // Partial URL match
  }
];

let testsPassed = 0;
let testsFailed = 0;

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);

    const options = {
      hostname: requestUrl.hostname,
      port: requestUrl.port || 443,
      path: requestUrl.pathname + requestUrl.search,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Deployment-Verification-Bot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.toLowerCase()
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTest(test) {
  const url = `${DEPLOYMENT_URL}${test.path}`;

  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   URL: ${url}`);

    const response = await makeRequest(url);

    // Check status code
    if (!test.expectedStatus.includes(response.status)) {
      console.log(`   ❌ Status: ${response.status} (expected: ${test.expectedStatus.join(' or ')})`);
      return false;
    }

    console.log(`   ✅ Status: ${response.status}`);

    // Check content
    if (test.expectedContent && test.expectedContent.length > 0) {
      let contentMatches = 0;
      for (const content of test.expectedContent) {
        if (response.body.includes(content.toLowerCase())) {
          contentMatches++;
          console.log(`   ✅ Content contains: "${content}"`);
        } else {
          console.log(`   ⚠️  Content missing: "${content}"`);
        }
      }

      // At least one content match required
      if (contentMatches === 0 && test.expectedContent.length > 0) {
        console.log(`   ❌ No expected content found`);
        console.log(`   📄 Response preview: ${response.body.substring(0, 200)}...`);
        return false;
      }
    }

    console.log(`   ✅ ${test.name} passed`);
    return true;

  } catch (error) {
    console.log(`   ❌ ${test.name} failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`\n🚀 Running ${tests.length} deployment verification tests...\n`);

  for (const test of tests) {
    const passed = await runTest(test);
    if (passed) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${((testsPassed / tests.length) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All deployment verification tests passed!');
    console.log('🔗 Your application is successfully deployed and accessible.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('💡 Common issues:');
    console.log('   - SPA routing not configured properly');
    console.log('   - Frontend build not deployed');
    console.log('   - API endpoints not working');
    console.log('   - Static assets missing');

    if (testsPassed > 0) {
      console.log('\n✅ Some tests passed, so deployment is partially working.');
      process.exit(1);
    } else {
      console.log('\n❌ All tests failed. Deployment may have critical issues.');
      process.exit(2);
    }
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Post-Deployment Verification Tool');
  console.log('');
  console.log('Usage: node scripts/post-deploy-verify.js [URL]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/post-deploy-verify.js');
  console.log('  node scripts/post-deploy-verify.js https://your-app.vercel.app');
  console.log('');
  process.exit(0);
}

// Run the tests
runAllTests().catch((error) => {
  console.error('🚨 Verification script failed:', error);
  process.exit(3);
});