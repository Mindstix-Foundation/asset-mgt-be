import { IsNumber, IsPositive } from 'class-validator';

export class MarkAsReadDto {
  @IsNumber()
  @IsPositive()
  notificationId: number;
}
