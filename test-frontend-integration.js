// Test script to verify frontend integration with new asset-history API
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testAssetId = 'AST-0001'; // Replace with actual asset ID

async function testFrontendIntegration() {
  console.log('=== Frontend Integration Test ===\n');

  try {
    // Test 1: Get asset history (new endpoint)
    console.log('1. Testing new GET /asset-history/:id endpoint');
    const historyResponse = await axios.get(`${BASE_URL}/asset-history/${testAssetId}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // Replace with actual token
      }
    });
    
    console.log('✅ Asset History API Response:');
    console.log('Status:', historyResponse.status);
    console.log('Data structure:', {
      message: historyResponse.data.message,
      hasAsset: !!historyResponse.data.data.asset,
      hasTimeline: !!historyResponse.data.data.timeline,
      hasPagination: !!historyResponse.data.data.pagination,
      timelineLength: historyResponse.data.data.timeline?.length || 0
    });

    // Check for IST timestamps in timeline events
    if (historyResponse.data.data.timeline?.length > 0) {
      const firstEvent = historyResponse.data.data.timeline[0];
      console.log('\n📅 First event timestamp analysis:');
      console.log('  - date (UTC):', firstEvent.date);
      console.log('  - dateIST:', firstEvent.dateIST);
      console.log('  - details.timestamp:', firstEvent.details?.timestamp);
      console.log('  - details.timestampIST:', firstEvent.details?.timestampIST);
      
      // Verify IST format
      if (firstEvent.dateIST) {
        const istPattern = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/;
        const isValidIST = istPattern.test(firstEvent.dateIST);
        console.log('  - IST format valid:', isValidIST);
        console.log('  - IST example:', firstEvent.dateIST);
      }
    }

  } catch (error) {
    console.log('❌ Asset History API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
  }

  try {
    // Test 2: Get asset history summary (new endpoint)
    console.log('\n2. Testing new GET /asset-history/:id/summary endpoint');
    const summaryResponse = await axios.get(`${BASE_URL}/asset-history/${testAssetId}/summary`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // Replace with actual token
      }
    });
    
    console.log('✅ Asset History Summary API Response:');
    console.log('Status:', summaryResponse.status);
    console.log('Data structure:', {
      message: summaryResponse.data.message,
      hasAsset: !!summaryResponse.data.data.asset,
      hasSummary: !!summaryResponse.data.data.summary,
      hasRecentEvents: !!summaryResponse.data.data.recentEvents,
      hasQuickStats: !!summaryResponse.data.data.quickStats
    });

    // Check for IST timestamps in recent events
    if (summaryResponse.data.data.recentEvents?.length > 0) {
      const firstEvent = summaryResponse.data.data.recentEvents[0];
      console.log('\n📅 First recent event timestamp analysis:');
      console.log('  - date (UTC):', firstEvent.date);
      console.log('  - dateIST:', firstEvent.dateIST);
      console.log('  - details.timestampIST:', firstEvent.details?.timestampIST);
    }

  } catch (error) {
    console.log('❌ Asset History Summary API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
  }

  try {
    // Test 3: Test with query parameters
    console.log('\n3. Testing GET /asset-history/:id with query parameters');
    const queryResponse = await axios.get(`${BASE_URL}/asset-history/${testAssetId}`, {
      params: {
        page: 1,
        limit: 5,
        sortBy: 'date',
        sortOrder: 'desc',
        eventTypes: 'ASSIGNED,RETURNED'
      },
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // Replace with actual token
      }
    });
    
    console.log('✅ Asset History with Query Parameters:');
    console.log('Status:', queryResponse.status);
    console.log('Pagination:', queryResponse.data.data.pagination);
    console.log('Filtered events count:', queryResponse.data.data.timeline?.length || 0);

  } catch (error) {
    console.log('❌ Asset History Query API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
  }

  console.log('\n=== Frontend Integration Test Complete ===');
  console.log('\n📝 Frontend Changes Summary:');
  console.log('✅ Updated assetHistoryService.ts to use new endpoints:');
  console.log('   - /asset-history/:id (was /assets/:id/history)');
  console.log('   - /asset-history/:id/summary (was /assets/:id/history/summary)');
  console.log('\n✅ Enhanced AssetHistoryView.vue with IST timestamp display:');
  console.log('   - Main event timestamp shows IST format prominently');
  console.log('   - Details timestamp shows both IST and UTC');
  console.log('   - Responsive design for mobile devices');
  console.log('   - Monospace font for better timestamp readability');
  console.log('\n🎯 Expected Frontend Behavior:');
  console.log('   - Timeline events show IST timestamps in DD/MM/YYYY, HH:MM:SS format');
  console.log('   - UTC timestamps shown as secondary information');
  console.log('   - Consistent timezone display across all history events');
  console.log('\n📋 Next Steps:');
  console.log('1. Replace YOUR_JWT_TOKEN with actual JWT token');
  console.log('2. Replace testAssetId with actual asset ID');
  console.log('3. Start the backend server: npm run start:dev');
  console.log('4. Start the frontend: npm run dev');
  console.log('5. Navigate to asset history page to see IST timestamps');
}

// Run the test
testFrontendIntegration().catch(console.error);
