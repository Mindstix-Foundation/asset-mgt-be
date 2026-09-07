import { PartialType } from '@nestjs/swagger';
import { CreateSoftwareLicenseDto } from './create-software-license.dto';

export class UpdateSoftwareLicenseDto extends PartialType(
  CreateSoftwareLicenseDto,
) {}
