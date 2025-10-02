// Test script to verify timezone functionality
const { TimezoneUtil } = require('./dist/shared/utils/timezone.util');

// Test data
const testData = {
  createdAt: new Date('2024-01-15T10:30:00.000Z'),
  updatedAt: new Date('2024-01-15T14:45:30.000Z'),
  purchaseDate: new Date('2024-01-10T00:00:00.000Z'),
  warrantyStartDate: new Date('2024-01-10T00:00:00.000Z'),
  warrantyEndDate: new Date('2025-01-10T00:00:00.000Z'),
  issueDate: new Date('2024-01-12T09:15:00.000Z'),
  returnDate: new Date('2024-01-14T17:30:00.000Z'),
  name: 'Test Asset',
  status: 'AVAILABLE'
};

console.log('=== Timezone Utility Test ===\n');

console.log('1. Individual timestamp conversion:');
console.log('Created At (UTC):', testData.createdAt.toISOString());
console.log('Created At (IST):', TimezoneUtil.toISTString(testData.createdAt));
console.log('Updated At (UTC):', testData.updatedAt.toISOString());
console.log('Updated At (IST):', TimezoneUtil.toISTString(testData.updatedAt));

console.log('\n2. Business dates (should remain unchanged):');
console.log('Purchase Date (UTC):', testData.purchaseDate.toISOString());
console.log('Purchase Date (IST):', TimezoneUtil.toISTString(testData.purchaseDate));
console.log('Issue Date (UTC):', testData.issueDate.toISOString());
console.log('Issue Date (IST):', TimezoneUtil.toISTString(testData.issueDate));

console.log('\n3. Transform audit timestamps only:');
const transformed = TimezoneUtil.transformAuditTimestamps(testData, ['createdAt', 'updatedAt']);
console.log('Original createdAt:', testData.createdAt.toISOString());
console.log('Transformed createdAt:', transformed.createdAt);
console.log('Original purchaseDate:', testData.purchaseDate.toISOString());
console.log('Transformed purchaseDate:', transformed.purchaseDate);

console.log('\n4. Current IST time:');
console.log('Current IST:', TimezoneUtil.getCurrentIST());

console.log('\n=== Test Complete ===');
