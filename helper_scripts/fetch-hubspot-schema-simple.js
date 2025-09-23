#!/usr/bin/env node

/**
 * Simple HubSpot Schema Fetcher using fetch
 */

// Object definitions from documentation
const OBJECTS = {
  'contacts': '0-1',
  'deals': '0-3',
  'courses': '0-410',
  'transactions': '2-47045790',
  'payment_schedules': '2-47381547',
  'credit_notes': '2-41609496',
  'campus_venues': '2-41607847',
  'enrollments': '2-41701559',
  'lab_stations': '2-41603799',
  'bookings': '2-50158943',
  'mock_exams': '2-50158913'
};

async function fetchWithNode(url, options) {
  const https = require('https');
  const { URL } = require('url');

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const token = process.env.HS_PRIVATE_APP_TOKEN;

  if (!token) {
    console.error('HS_PRIVATE_APP_TOKEN not found');
    process.exit(1);
  }

  console.log('Fetching HubSpot schemas...\n');

  const results = {};

  for (const [name, objectId] of Object.entries(OBJECTS)) {
    console.log(`Fetching ${name} (${objectId})...`);

    try {
      // Try to fetch properties for this object
      const url = `https://api.hubapi.com/crm/v3/properties/${objectId}`;
      const response = await fetchWithNode(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        results[name] = {
          objectId,
          success: true,
          properties: data.results || [],
          propertyCount: (data.results || []).length
        };
        console.log(`  ✓ Found ${(data.results || []).length} properties`);
      } else {
        const errorText = await response.text();
        results[name] = {
          objectId,
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
        console.log(`  ✗ Error: HTTP ${response.status}`);
      }
    } catch (error) {
      results[name] = {
        objectId,
        success: false,
        error: error.message
      };
      console.log(`  ✗ Error: ${error.message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Save results
  require('fs').writeFileSync('./hubspot-schema-results.json', JSON.stringify(results, null, 2));

  // Generate summary
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  console.log(`\n📊 Summary: ${successful}/${total} objects successfully fetched`);
  console.log('✓ Results saved to: hubspot-schema-results.json');

  // Show successful objects
  console.log('\n✅ Successfully fetched:');
  Object.entries(results).forEach(([name, data]) => {
    if (data.success) {
      console.log(`   ${name}: ${data.propertyCount} properties`);
    }
  });

  // Show failed objects
  const failed = Object.entries(results).filter(([,data]) => !data.success);
  if (failed.length > 0) {
    console.log('\n❌ Failed to fetch:');
    failed.forEach(([name, data]) => {
      console.log(`   ${name}: ${data.error}`);
    });
  }
}

main().catch(console.error);