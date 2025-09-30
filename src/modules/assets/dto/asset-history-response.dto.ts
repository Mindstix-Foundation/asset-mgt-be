import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetEventType } from './asset-history-query.dto';

export class AssetHistoryEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AssetEventType })
  type: AssetEventType;

  @ApiProperty()
  date: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  user?: string;

  @ApiPropertyOptional()
  userId?: number;

  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  userDisplayName?: string;

  @ApiProperty()
  details: Record<string, any>;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  color?: string;
}

export class AssetHistorySummaryDto {
  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  lastActivity: string;

  @ApiProperty()
  currentStatus: string;

  @ApiProperty()
  currentCondition: string;

  @ApiProperty()
  totalAssignments: number;

  @ApiProperty()
  totalMaintenance: number;

  @ApiProperty()
  totalStatusChanges: number;

  @ApiPropertyOptional()
  totalCost?: number;

  @ApiPropertyOptional()
  avgAssignmentDuration?: string;

  @ApiPropertyOptional()
  maintenanceFrequency?: string;

  @ApiPropertyOptional()
  mostCommonStatus?: string;
}

export class AssetBasicInfoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  assetId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  currentStatus: string;

  @ApiProperty()
  currentCondition: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  serialNumber?: string;

  @ApiProperty()
  assetType: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  model: string;
}

export class AssetHistoryPaginationDto {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;

  @ApiProperty()
  limit: number;
}

class AssetHistoryDataDto {
  @ApiProperty({ type: () => AssetBasicInfoDto })
  asset: AssetBasicInfoDto;

  @ApiProperty({ type: [AssetHistoryEventDto] })
  timeline: AssetHistoryEventDto[];

  @ApiProperty({ type: () => AssetHistoryPaginationDto })
  pagination: AssetHistoryPaginationDto;

  @ApiPropertyOptional({ type: () => AssetHistorySummaryDto })
  summary?: AssetHistorySummaryDto;
}

export class AssetHistoryResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: () => AssetHistoryDataDto })
  data: AssetHistoryDataDto;
}

class QuickStatsDto {
  @ApiProperty()
  avgAssignmentDuration: string;

  @ApiProperty()
  maintenanceFrequency: string;

  @ApiProperty()
  mostCommonStatus: string;
}

class AssetHistorySummaryDataDto {
  @ApiProperty({ type: () => AssetBasicInfoDto })
  asset: AssetBasicInfoDto;

  @ApiProperty({ type: () => AssetHistorySummaryDto })
  summary: AssetHistorySummaryDto;

  @ApiProperty({ type: [AssetHistoryEventDto] })
  recentEvents: AssetHistoryEventDto[];

  @ApiProperty({ type: () => QuickStatsDto })
  quickStats: QuickStatsDto;
}

export class AssetHistorySummaryResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: () => AssetHistorySummaryDataDto })
  data: AssetHistorySummaryDataDto;
}
