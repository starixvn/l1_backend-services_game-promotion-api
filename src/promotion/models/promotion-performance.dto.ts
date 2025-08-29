import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsMongoId, IsDateString, IsOptional, IsBoolean } from 'class-validator';

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

  @ApiProperty({
    description: 'Flag to use base currency values instead of regular values',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isBaseCurrency?: boolean;
}
