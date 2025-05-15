import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum PromotionAnnouncementStatus {
  UP_COMING = 'upcoming',
  RUNNING = 'running',
  COMPLETED = 'completed',
}

export class PromotionAnnouncementFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by promotion status',
    enum: PromotionAnnouncementStatus,
    example: PromotionAnnouncementStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(PromotionAnnouncementStatus)
  status?: PromotionAnnouncementStatus;

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
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
