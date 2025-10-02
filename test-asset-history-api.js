// Test script to verify the new asset-history API structure
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testAssetId = 'AST-0001'; // Replace with actual asset ID

async function testAssetHistoryAPI() {
  console.log('=== Asset History API Test ===\n');

  try {
    // Test 1: Get asset history
    console.log('1. Testing GET /asset-history/:id');
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

    // Check for IST timestamps
    if (historyResponse.data.data.timeline?.length > 0) {
      const firstEvent = historyResponse.data.data.timeline[0];
      console.log('First event timestamps:');
      console.log('  - date (UTC):', firstEvent.date);
      console.log('  - dateIST:', firstEvent.dateIST);
      console.log('  - details.timestampIST:', firstEvent.details?.timestampIST);
    }

  } catch (error) {
    console.log('❌ Asset History API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
  }

  try {
    // Test 2: Get asset history summary
    console.log('\n2. Testing GET /asset-history/:id/summary');
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
      console.log('First recent event timestamps:');
      console.log('  - date (UTC):', firstEvent.date);
      console.log('  - dateIST:', firstEvent.dateIST);
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
        sortOrder: 'desc'
      },
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // Replace with actual token
      }
    });
    
    console.log('✅ Asset History with Query Parameters:');
    console.log('Status:', queryResponse.status);
    console.log('Pagination:', queryResponse.data.data.pagination);

  } catch (error) {
    console.log('❌ Asset History Query API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
  }

  console.log('\n=== Test Complete ===');
  console.log('\n📝 Notes:');
  console.log('- Replace YOUR_JWT_TOKEN with actual JWT token');
  console.log('- Replace testAssetId with actual asset ID');
  console.log('- Make sure the server is running on port 3000');
  console.log('- Check that IST timestamps are properly formatted');
}

// Run the test
testAssetHistoryAPI().catch(console.error);
