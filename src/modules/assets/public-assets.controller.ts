import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/decorators/public.decorator';
import { AssetsService } from './assets.service';

@ApiTags('Public Assets')
@Controller('public/assets')
export class PublicAssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Public asset lookup by QR token',
    description:
      'Returns limited asset details and current owner for QR sticker scans. No authentication required.',
  })
  @ApiParam({ name: 'token', description: 'Opaque QR token (UUID)' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findByToken(@Param('token') token: string) {
    if (!token?.trim()) {
      throw new NotFoundException('Asset not found');
    }
    return this.assetsService.findPublicByQrToken(token.trim());
  }
}
