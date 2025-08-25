import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId } from 'class-validator';

export class PromotionPerformanceDto {
  @ApiProperty({ description: 'Promotion ID', example: '689b00dbd459c639a74ef4eb' })
  @IsMongoId()
  @IsNotEmpty()
  promotionId: string;
}
