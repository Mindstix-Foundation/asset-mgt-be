import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Actual Asset Events - Only events that can be triggered from specific pages/modals
export enum AssetEventType {
  // === ASSET LIFECYCLE EVENTS ===
  ASSET_CREATED = 'ASSET_CREATED', // @AddAssetView.vue or Bulk Upload in @AssetsView.vue
  ASSET_UPDATED = 'ASSET_UPDATED', // @EditAssetView.vue
  ASSET_RETIRED = 'ASSET_RETIRED', // Retirement modal in @AssetsView.vue
  ASSET_REACTIVATED = 'ASSET_REACTIVATED', // Reactivation modal in @AssetsView.vue

  // === ASSIGNMENT EVENTS ===
  ASSET_ISSUED = 'ASSET_ISSUED', // @IssueAssetView.vue
  ASSET_COLLECTED = 'ASSET_COLLECTED', // @CollectAssetView.vue

  // === MAINTENANCE EVENTS ===
  MAINTENANCE_SCHEDULED = 'MAINTENANCE_SCHEDULED', // @ScheduleMaintenanceView.vue
  MAINTENANCE_UPDATED = 'MAINTENANCE_UPDATED', // @EditMaintenanceView.vue
  MAINTENANCE_COMPLETED = 'MAINTENANCE_COMPLETED', // Completion modal in @MaintenanceView.vue
  MAINTENANCE_CANCELLED = 'MAINTENANCE_CANCELLED', // Cancellation modal in @MaintenanceView.vue
}

export class AssetHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of events per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by event types (comma-separated)',
    example: 'ASSET_ASSIGNED,ASSET_RETURNED,MAINTENANCE_SCHEDULED',
    type: String,
  })
  @IsOptional()
  @IsString()
  eventTypes?: string;

  @ApiPropertyOptional({
    description: 'Filter events from this date (YYYY-MM-DD)',
    example: '2024-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter events to this date (YYYY-MM-DD)',
    example: '2024-12-31',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID who performed the action',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Search in event descriptions and notes',
    example: 'maintenance',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['date', 'eventType'],
    default: 'date',
    example: 'date',
  })
  @IsOptional()
  @IsString()
  @IsIn(['date', 'eventType'])
  sortBy?: string = 'date';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({
    description: 'Cache busting parameter (timestamp)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  _t?: number;
}
