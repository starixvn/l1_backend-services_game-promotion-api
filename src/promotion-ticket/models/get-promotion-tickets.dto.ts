import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPromotionTicketsDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  promotionId: string;

  @ApiProperty({ description: 'Round identifier' })
  @IsString()
  @IsOptional()
  roundId?: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: Date;

  @ApiProperty({
    description: 'Page index (0-based)',
    default: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pageIndex = 1;

  @ApiProperty({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize = 10;
}
