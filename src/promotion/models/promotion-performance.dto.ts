import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsDateString, IsOptional } from 'class-validator';

export class PromotionPerformanceDto {
  @ApiProperty({ description: 'Promotion ID', example: '689b00dbd459c639a74ef4eb' })
  @IsMongoId()
  @IsNotEmpty()
  promotionId: string;

  @ApiProperty({
    description: 'Start date of promotion (optional - defaults to promotion start date)',
    example: '2025-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    description: 'End date of promotion (optional - defaults to promotion end date)',
    example: '2025-01-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: Date;
}
