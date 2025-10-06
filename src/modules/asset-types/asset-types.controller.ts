import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AssetTypesService } from './asset-types.service';
import { CreateAssetTypeDto, AssetTypeQueryDto } from './dto';

@ApiTags('asset-types')
@ApiBearerAuth('JWT-auth')
@Controller('asset-types')
export class AssetTypesController {
  constructor(private readonly assetTypesService: AssetTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new asset type' })
  async create(
    @Body() createAssetTypeDto: CreateAssetTypeDto,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException(
        'User authentication required. Please login to create asset types.',
      );
    }
    const userId = req.user.id;
    return this.assetTypesService.create(createAssetTypeDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all asset types with filtering and pagination',
  })
  async findAll(@Query() queryDto: AssetTypeQueryDto) {
    return this.assetTypesService.findAll(queryDto);
  }

  @Get('by-category/:categoryId')
  @ApiOperation({ summary: 'Get asset types by category ID' })
  @ApiParam({ name: 'categoryId', description: 'Asset Category ID' })
  async findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.assetTypesService.findByCategory(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset type by ID' })
  @ApiParam({ name: 'id', description: 'Asset Type ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetTypesService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete asset type by ID' })
  @ApiParam({ name: 'id', description: 'Asset Type ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetTypesService.remove(id);
  }
}
