import { ApiProperty } from '@nestjs/swagger';

export class VendorNameCheckDataDto {
  @ApiProperty({
    description: 'The vendor name that was checked',
    example: 'TechCorp Solutions',
  })
  name: string;

  @ApiProperty({
    description: 'Whether the vendor name is available',
    example: false,
  })
  available: boolean;

  @ApiProperty({
    description: 'Whether the vendor name already exists',
    example: true,
  })
  exists: boolean;
}

export class VendorNameCheckResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Vendor name availability checked',
  })
  message: string;

  @ApiProperty({
    description: 'Vendor name check data',
    type: VendorNameCheckDataDto,
  })
  data: VendorNameCheckDataDto;
}
