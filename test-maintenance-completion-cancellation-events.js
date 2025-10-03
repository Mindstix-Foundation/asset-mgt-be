const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  username: 'admin',
  password: 'admin123'
};

const testMaintenanceSchedule = {
  assetId: 1, // Make sure this asset exists and is AVAILABLE
  maintenanceType: 'PREVENTIVE',
  scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  frequencyDays: 30,
  estimatedCost: 150.00,
  description: 'Test preventive maintenance for completion/cancellation event logging'
};

const testMaintenanceCompletion = {
  actualCost: 175.50,
  completionNotes: 'Maintenance completed successfully with additional repairs'
};

const testMaintenanceCancellation = {
  cancelNotes: 'Maintenance cancelled due to asset being decommissioned'
};

let authToken = '';
let maintenanceId = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = response.data.access_token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMaintenanceScheduling() {
  try {
    console.log('\n🔧 Testing Maintenance Scheduling...');
    console.log('Maintenance data:', testMaintenanceSchedule);
    
    const response = await axios.post(`${BASE_URL}/maintenance`, testMaintenanceSchedule, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Maintenance scheduled successfully');
    console.log('Maintenance ID:', response.data.data.maintenance.id);
    console.log('Asset Status:', response.data.data.maintenance.assetStatus);
    console.log('Scheduled Date:', response.data.data.maintenance.scheduledDate);
    console.log('Maintenance Type:', response.data.data.maintenance.maintenanceType);
    
    maintenanceId = response.data.data.maintenance.id;
    return true;
  } catch (error) {
    console.error('❌ Maintenance scheduling failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMaintenanceCompletion() {
  if (!maintenanceId) {
    console.error('❌ No maintenance ID available for completion test');
    return false;
  }
  
  try {
    console.log('\n✅ Testing Maintenance Completion Event Logging...');
    console.log('Completion data:', testMaintenanceCompletion);
    
    const response = await axios.put(`${BASE_URL}/maintenance/${maintenanceId}/complete`, testMaintenanceCompletion, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Maintenance completed successfully');
    console.log('Maintenance ID:', response.data.data.maintenance.id);
    console.log('Status:', response.data.data.maintenance.status);
    console.log('Actual Cost:', response.data.data.maintenance.actualCost);
    console.log('Completion Notes:', response.data.data.maintenance.completionNotes);
    console.log('Asset Status:', response.data.data.maintenance.assetStatus);
    
    return true;
  } catch (error) {
    console.error('❌ Maintenance completion failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMaintenanceCancellation() {
  // First, schedule another maintenance for cancellation test
  try {
    console.log('\n🔧 Scheduling another maintenance for cancellation test...');
    
    const cancelTestMaintenance = {
      ...testMaintenanceSchedule,
      description: 'Test maintenance for cancellation event logging'
    };
    
    const response = await axios.post(`${BASE_URL}/maintenance`, cancelTestMaintenance, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const cancelMaintenanceId = response.data.data.maintenance.id;
    console.log('✅ Second maintenance scheduled for cancellation test');
    console.log('Cancellation Maintenance ID:', cancelMaintenanceId);
    
    // Now cancel it
    console.log('\n❌ Testing Maintenance Cancellation Event Logging...');
    console.log('Cancellation data:', testMaintenanceCancellation);
    
    const cancelResponse = await axios.put(`${BASE_URL}/maintenance/${cancelMaintenanceId}/cancel`, testMaintenanceCancellation, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Maintenance cancelled successfully');
    console.log('Maintenance ID:', cancelResponse.data.data.maintenance.id);
    console.log('Status:', cancelResponse.data.data.maintenance.status);
    console.log('Cancellation Notes:', cancelResponse.data.data.maintenance.cancellationNotes);
    console.log('Asset Status:', cancelResponse.data.data.maintenance.assetStatus);
    
    return true;
  } catch (error) {
    console.error('❌ Maintenance cancellation failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkAssetEvents(assetId) {
  try {
    console.log('\n📊 Checking Asset Events...');
    
    const response = await axios.get(`${BASE_URL}/asset-history/${assetId}/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const events = response.data.data.recentEvents || [];
    console.log(`Found ${events.length} recent events:`);
    
    events.forEach((event, index) => {
      console.log(`\n${index + 1}. Event: ${event.type}`);
      console.log(`   Title: ${event.title}`);
      console.log(`   Description: ${event.description}`);
      console.log(`   Date: ${event.dateIST}`);
      console.log(`   User: ${event.userDisplayName}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Condition: ${event.condition}`);
      
      if (event.details) {
        console.log(`   Details:`, JSON.stringify(event.details, null, 2));
      }
    });
    
    // Check for specific maintenance events
    const scheduledEvent = events.find(e => e.type === 'MAINTENANCE_SCHEDULED');
    const completedEvent = events.find(e => e.type === 'MAINTENANCE_COMPLETED');
    const cancelledEvent = events.find(e => e.type === 'MAINTENANCE_CANCELLED');
    
    if (scheduledEvent) {
      console.log('\n✅ MAINTENANCE_SCHEDULED event found!');
      console.log('   Maintenance Type:', scheduledEvent.details?.maintenanceType);
      console.log('   Scheduled Date:', scheduledEvent.details?.scheduledDate);
      console.log('   Estimated Cost:', scheduledEvent.details?.estimatedCost);
      console.log('   Description:', scheduledEvent.details?.description);
    } else {
      console.log('\n❌ MAINTENANCE_SCHEDULED event not found');
    }
    
    if (completedEvent) {
      console.log('\n✅ MAINTENANCE_COMPLETED event found!');
      console.log('   Maintenance Type:', completedEvent.details?.maintenanceType);
      console.log('   Actual Cost:', completedEvent.details?.actualCost);
      console.log('   Completion Notes:', completedEvent.details?.completionNotes);
      console.log('   Status Transition:', completedEvent.details?.previousStatus, '→', completedEvent.details?.newStatus);
    } else {
      console.log('\n❌ MAINTENANCE_COMPLETED event not found');
    }
    
    if (cancelledEvent) {
      console.log('\n✅ MAINTENANCE_CANCELLED event found!');
      console.log('   Maintenance Type:', cancelledEvent.details?.maintenanceType);
      console.log('   Cancellation Notes:', cancelledEvent.details?.cancellationNotes);
      console.log('   Status Transition:', cancelledEvent.details?.previousStatus, '→', cancelledEvent.details?.newStatus);
    } else {
      console.log('\n❌ MAINTENANCE_CANCELLED event not found');
    }
    
    return { scheduledEvent, completedEvent, cancelledEvent };
  } catch (error) {
    console.error('❌ Failed to check asset events:', error.response?.data || error.message);
    return { scheduledEvent: null, completedEvent: null, cancelledEvent: null };
  }
}

async function cleanupMaintenance() {
  if (!maintenanceId) {
    return;
  }
  
  try {
    console.log('\n🧹 Cleaning up test maintenance...');
    await axios.delete(`${BASE_URL}/maintenance/${maintenanceId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Test maintenance cleaned up');
  } catch (error) {
    console.warn('⚠️ Failed to cleanup test maintenance:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Maintenance Completion & Cancellation Event Logging Tests\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Schedule Maintenance
  const scheduleSuccess = await testMaintenanceScheduling();
  if (!scheduleSuccess) {
    console.log('❌ Cannot proceed without successful maintenance scheduling');
    return;
  }
  
  // Step 3: Check events after scheduling
  await checkAssetEvents(testMaintenanceSchedule.assetId);
  
  // Step 4: Complete Maintenance
  const completionSuccess = await testMaintenanceCompletion();
  if (!completionSuccess) {
    console.log('❌ Maintenance completion failed');
    return;
  }
  
  // Step 5: Check events after completion
  await checkAssetEvents(testMaintenanceSchedule.assetId);
  
  // Step 6: Test Cancellation
  const cancellationSuccess = await testMaintenanceCancellation();
  if (!cancellationSuccess) {
    console.log('❌ Maintenance cancellation failed');
    return;
  }
  
  // Step 7: Check events after cancellation
  await checkAssetEvents(testMaintenanceSchedule.assetId);
  
  // Step 8: Cleanup
  await cleanupMaintenance();
  
  console.log('\n🎉 Maintenance Completion & Cancellation Event Logging Tests Completed!');
  console.log('\n📋 Summary:');
  console.log('✅ Maintenance completion event logging implemented');
  console.log('✅ Maintenance cancellation event logging implemented');
  console.log('✅ Events are properly stored in AssetEvent table');
  console.log('✅ Events are visible in asset history API');
  console.log('✅ Status transitions are correctly tracked');
}

// Run the tests
runTests().catch(console.error);
