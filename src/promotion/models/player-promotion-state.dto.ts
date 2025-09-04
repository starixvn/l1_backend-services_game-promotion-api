import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
export class PlayerPromotionStateDto {
  @ApiProperty({
    description: 'Promotion ID',
    example: '68ac2079db851bea05471c5a',
  })
  @IsMongoId()
  @IsNotEmpty()
  promotionId: string;

  @ApiProperty({
    description: 'Player ID to search for (optional)',
    example: 'player123',
    required: false,
  })
  @IsOptional()
  @IsString()
  player?: string;

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
    description: 'Status filter',
    example: 'Active',
    required: false,
    enum: ['Active', 'Ineligible', 'Turnover Met', 'Bonus Redeemed', 'Opted Out'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Currencies to search for (optional)',
    example: 'USD,EUR',
    required: false,
  })
  @IsOptional()
  @IsString()
  currencies?: string;

  @ApiProperty({
    description: 'Page index (starts from 1)',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber()
  pageIndex: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  @IsNumber()
  pageSize: number;
}
