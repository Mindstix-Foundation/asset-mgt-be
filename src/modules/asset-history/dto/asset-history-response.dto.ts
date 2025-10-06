import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetEventType } from './asset-history-query.dto';

export class AssetBasicInfoDto {
  @ApiProperty({ description: 'Asset ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Asset Code', example: 'AST-0001' })
  assetId: string;

  @ApiProperty({ description: 'Asset name', example: 'Laptop - Dell XPS 13' })
  name: string;

  @ApiProperty({ description: 'Current status', example: 'ASSIGNED' })
  currentStatus: string;

  @ApiProperty({ description: 'Current condition', example: 'GOOD' })
  currentCondition: string;

  @ApiPropertyOptional({ description: 'Asset type', example: 'Laptop' })
  assetType?: string;

  @ApiPropertyOptional({ description: 'Brand', example: 'Dell' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Model', example: 'XPS 13' })
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number', example: 'ABC123' })
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Current location', example: 'Office A' })
  location?: string;
}

export class AssetHistoryEventDto {
  @ApiProperty({ description: 'Event ID', example: 'event-123' })
  id: string;

  @ApiProperty({
    description: 'Event type',
    enum: AssetEventType,
    example: 'ASSET_ISSUED',
  })
  type: AssetEventType;

  @ApiProperty({
    description: 'Event date (IST)',
    example: '30/01/2025, 16:00:00',
  })
  dateIST: string;

  @ApiProperty({
    description: 'Event description',
    example: 'issue to John Doe (EMP-001)',
  })
  description: string;

  @ApiProperty({ description: 'User display name', example: 'Jane Smith' })
  userDisplayName: string;

  @ApiPropertyOptional({ description: 'Event details' })
  details?: any;

  @ApiProperty({ description: 'Event icon class', example: 'fas fa-user-plus' })
  icon: string;

  @ApiProperty({ description: 'Event color', example: '#007bff' })
  color: string;

  @ApiProperty({
    description: 'Asset status at time of event (or status change)',
    example: 'AVAILABLE → ASSIGNED',
  })
  status: string;

  @ApiProperty({
    description: 'Asset condition at time of event (or condition change)',
    example: 'GOOD',
  })
  condition: string;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Total number of events', example: 89 })
  totalEvents: number;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPrevious: boolean;

  @ApiProperty({ description: 'Events per page', example: 20 })
  limit: number;
}

export class AssetHistoryResponseDto {
  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-01-30T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Response description',
    example: 'Asset history retrieved successfully',
  })
  description: string;

  @ApiProperty({ description: 'Asset information' })
  asset: AssetBasicInfoDto;

  @ApiProperty({ description: 'Asset history timeline' })
  timeline: AssetHistoryEventDto[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: PaginationDto;
}

export class AssetHistorySummaryDto {
  @ApiProperty({ description: 'Total number of events', example: 89 })
  totalEvents: number;

  @ApiProperty({
    description: 'Last activity date (UTC)',
    example: '2024-12-15T10:30:00Z',
  })
  lastActivity: string;

  @ApiProperty({ description: 'Current status', example: 'ASSIGNED' })
  currentStatus: string;

  @ApiProperty({ description: 'Current condition', example: 'GOOD' })
  currentCondition: string;

  @ApiProperty({ description: 'Total assignments', example: 23 })
  totalAssignments: number;

  @ApiProperty({ description: 'Total maintenance events', example: 8 })
  totalMaintenance: number;

  @ApiProperty({ description: 'Total status changes', example: 12 })
  totalStatusChanges: number;

  @ApiProperty({ description: 'Total cost', example: 2500.0 })
  totalCost: number;

  @ApiPropertyOptional({ description: 'Event counts by type' })
  eventCounts?: Record<string, number>;
}

export class QuickStatsDto {
  @ApiPropertyOptional({
    description: 'Average assignment duration',
    example: '45 days',
  })
  avgAssignmentDuration?: string;

  @ApiPropertyOptional({
    description: 'Maintenance frequency',
    example: 'Every 6 months',
  })
  maintenanceFrequency?: string;

  @ApiPropertyOptional({
    description: 'Most common status',
    example: 'ASSIGNED',
  })
  mostCommonStatus?: string;

  @ApiPropertyOptional({
    description: 'Most common condition',
    example: 'GOOD',
  })
  mostCommonCondition?: string;
}

export class AssetHistorySummaryResponseDto {
  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-01-30T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Response description',
    example: 'Asset history summary retrieved successfully',
  })
  description: string;

  @ApiProperty({ description: 'Asset information' })
  asset: AssetBasicInfoDto;

  @ApiProperty({ description: 'Asset history summary' })
  summary: AssetHistorySummaryDto;

  @ApiProperty({ description: 'Recent events' })
  recentEvents: AssetHistoryEventDto[];

  @ApiProperty({ description: 'Quick statistics' })
  quickStats: QuickStatsDto;
}
