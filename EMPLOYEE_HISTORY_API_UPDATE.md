# Employee Asset History API Update

## Overview
Modified the employee asset history API to fetch data from the `AssetEvent` table instead of the `AssetIssue` table to properly capture condition data (FAIR, POOR, DAMAGED) at both issue and return times.

## Changes Made

### File: `src/employees/employees.service.ts`

#### Method: `getAssetEvents()`

**Previous Implementation:**
- Fetched data from `AssetIssue` table
- Expanded each issue into ASSIGNED and RETURNED events
- Issue condition data was available from `issueCondition` field
- Return condition data was available from `returnCondition` field
- Problem: Not all condition values were properly captured, especially FAIR, POOR, and DAMAGED conditions

**New Implementation:**
- Fetches data from `AssetEvent` table
- Queries for `ASSET_ISSUED` and `ASSET_COLLECTED` event types
- Filters events by employee ID using metadata JSON field
- Extracts condition data from event metadata:
  - For ASSET_ISSUED: `metadata.issueCondition`
  - For ASSET_COLLECTED: `metadata.returnCondition`
- Maps events to ASSIGNED/RETURNED actions for frontend compatibility

## Benefits

1. **Complete Condition Data**: Now properly retrieves all condition values (NEW, GOOD, FAIR, POOR, DAMAGED) from the metadata stored in AssetEvent table
2. **Single Source of Truth**: Uses the AssetEvent table which is the centralized event logging system
3. **Better Audit Trail**: Leverages the comprehensive event logging that captures all asset state changes
4. **Metadata Flexibility**: Can access additional event details stored in the JSON metadata field

## Data Flow

### When Asset is Issued:
1. `AssetIssue` record created with `issueCondition`
2. `AssetEvent` record created with type `ASSET_ISSUED` and metadata containing:
   - `issueCondition`: The condition at issue time
   - `issueReason`: Reason for issuing
   - `issueDate`: Business date of issue
   - `notes`: Additional notes
   - Employee details (employeeId, employeeName, employeeEmail)

### When Asset is Collected:
1. `AssetIssue` record updated with `returnCondition` and `returnDate`
2. `AssetEvent` record created with type `ASSET_COLLECTED` and metadata containing:
   - `returnCondition`: The condition at return time
   - `returnReason`: Reason for return
   - `returnDate`: Business date of return
   - `notes`: Additional notes
   - Employee details (employeeId, employeeName, employeeEmail)

### Employee History Query:
1. Query `AssetEvent` table for events where `metadata.employeeId` matches the requested employee
2. Filter for `ASSET_ISSUED` and `ASSET_COLLECTED` event types
3. Transform events into ASSIGNED/RETURNED format
4. Extract condition from metadata
5. Apply filters (action, assetType, dateFrom, dateTo, search)
6. Sort and paginate results

## API Response Structure

The response structure remains unchanged for frontend compatibility:

```json
{
  "message": "Asset events retrieved successfully",
  "data": {
    "assetEvents": [
      {
        "id": 123,
        "assetId": "ASSET-001",
        "assetName": "Dell Latitude 5520",
        "assetType": "Laptop",
        "brand": "Dell",
        "model": "Latitude 5520",
        "action": "ASSIGNED" | "RETURNED",
        "date": "2024-01-15",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "condition": "GOOD" | "FAIR" | "POOR" | "DAMAGED" | "NEW",
        "reason": "Work from home setup",
        "notes": "Employee needs laptop for remote work",
        "performedBy": "John Doe"
      }
    ],
    "pagination": {
      "totalCount": 50,
      "currentPage": 1,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Testing Recommendations

1. **Test condition display**: Verify that all condition values (NEW, GOOD, FAIR, POOR, DAMAGED) display correctly in the employee history view
2. **Test filters**: Ensure all filters (action, assetType, dateFrom, dateTo, search) work correctly
3. **Test sorting**: Verify sorting by date, action, and assetType works as expected
4. **Test pagination**: Confirm pagination works with different page sizes
5. **Test with historical data**: Check that the query returns events for employees with multiple asset assignments

## Database Schema Reference

### AssetEvent Table
```prisma
model AssetEvent {
  id            Int           @id @default(autoincrement())
  assetId       Int           @map("asset_id")
  eventType     AssetEventType @map("event_type")
  eventDate     DateTime      @map("event_date") @db.Timestamptz(6)
  performedBy   Int           @map("performed_by")
  
  // Audit fields
  fieldName     String?       @map("field_name")
  oldValue      String?       @map("old_value")
  newValue      String?       @map("new_value")
  
  // Event details (stores condition, reason, notes, etc.)
  metadata      Json?
  
  // Relations
  asset         Asset         @relation("AssetEvents", fields: [assetId], references: [id])
  performedByUser User        @relation("AssetEventPerformedBy", fields: [performedBy], references: [id])
  
  @@map("asset_events")
}
```

## Migration Notes

- No database migration required
- No frontend changes required (API response format unchanged)
- The change is backward compatible
- Existing endpoints and response structures remain the same

## Deployment

1. Build the backend: `npm run build`
2. Restart the backend server
3. Test the employee asset history endpoint: `GET /api/employees/:id/asset-events`

## Date: 2025-10-03

