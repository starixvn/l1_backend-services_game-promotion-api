import { IsEnum, IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum PromotionStatus {
  NOT_STARTED = 'not_started',
  RUNNING = 'running',
  ENDED = 'ended',
}

export class PromotionFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by one or more operator IDs',
    example: ['op123', 'op456'],
    isArray: true,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Handle both string and array inputs
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim());
    }
    return value;
  })
  operatorIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by promotion status',
    enum: PromotionStatus,
    example: PromotionStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({
    description: 'Filter by promotion code (partial match)',
    example: 'summer-classic-free-spins',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  pageIndex?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (minimum 1)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}
