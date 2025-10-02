const axios = require('axios');

async function testAssetHistoryAPI() {
  try {
    console.log('🧪 Testing Enhanced Asset History API...\n');
    
    // Test with a sample asset ID
    const assetId = 'AST-0001'; // Replace with an actual asset ID from your database
    const baseURL = 'http://localhost:3000';
    
    console.log(`📋 Testing asset history for: ${assetId}`);
    
    // Test 1: Get asset history summary
    console.log('\n1️⃣ Testing Asset History Summary...');
    try {
      const summaryResponse = await axios.get(`${baseURL}/api/assets/${assetId}/history/summary`);
      console.log('✅ Summary API Response:');
      console.log(JSON.stringify(summaryResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Summary API Error:', error.response?.data || error.message);
    }
    
    // Test 2: Get detailed asset history
    console.log('\n2️⃣ Testing Detailed Asset History...');
    try {
      const historyResponse = await axios.get(`${baseURL}/api/assets/${assetId}/history`, {
        params: {
          page: 1,
          limit: 10,
          sortBy: 'date',
          sortOrder: 'desc'
        }
      });
      console.log('✅ History API Response:');
      console.log(JSON.stringify(historyResponse.data, null, 2));
      
      // Check if we have enhanced details
      if (historyResponse.data.data?.timeline?.length > 0) {
        const firstEvent = historyResponse.data.data.timeline[0];
        console.log('\n🔍 Enhanced Details Check:');
        console.log('Event Title:', firstEvent.title);
        console.log('Event Description:', firstEvent.description);
        console.log('Has oldValueDisplay:', !!firstEvent.details?.oldValueDisplay);
        console.log('Has newValueDisplay:', !!firstEvent.details?.newValueDisplay);
        console.log('Has detailedDescription:', !!firstEvent.details?.detailedDescription);
        console.log('Has user info:', !!firstEvent.details?.user);
        console.log('Has timestamp:', !!firstEvent.details?.timestamp);
        
        if (firstEvent.details?.oldValueDisplay && firstEvent.details?.newValueDisplay) {
          console.log('\n📊 Change Details:');
          console.log('Field:', firstEvent.details.fieldDisplayName);
          console.log('From:', firstEvent.details.oldValueDisplay);
          console.log('To:', firstEvent.details.newValueDisplay);
        }
      }
    } catch (error) {
      console.log('❌ History API Error:', error.response?.data || error.message);
    }
    
    // Test 3: Test with specific event type filter
    console.log('\n3️⃣ Testing Event Type Filter...');
    try {
      const filteredResponse = await axios.get(`${baseURL}/api/assets/${assetId}/history`, {
        params: {
          eventTypes: ['STATUS_CHANGED', 'CONDITION_CHANGED'],
          limit: 5
        }
      });
      console.log('✅ Filtered API Response:');
      console.log(`Found ${filteredResponse.data.data?.timeline?.length || 0} filtered events`);
    } catch (error) {
      console.log('❌ Filtered API Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testAssetHistoryAPI();
