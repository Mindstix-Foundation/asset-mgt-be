const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🔍 Testing ${description}: ${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing API Endpoints...');
  console.log(`Base URL: ${BASE_URL}`);
  
  await testEndpoint('/asset-types', 'Asset Types');
  await testEndpoint('/brands', 'Brands');
  await testEndpoint('/models', 'Models');
  await testEndpoint('/asset-categories', 'Asset Categories');
  await testEndpoint('/vendors', 'Vendors');
  await testEndpoint('/assets', 'Assets');
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);