import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsOptional, IsDate, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from './create-promotion-announcement.dto';

export class UpdatePromotionAnnouncementDto {
  @ApiPropertyOptional({ type: LocalizedStringDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  promotionTitle?: LocalizedStringDto;

  @ApiPropertyOptional({ type: LocalizedStringDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  bannerContent?: LocalizedStringDto;

  @ApiPropertyOptional({ type: LocalizedStringDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  termsAndConditions?: LocalizedStringDto;

  @ApiPropertyOptional({ example: '2024-06-01T00:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @ApiPropertyOptional({ example: '2024-06-01T00:00:00Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @ApiPropertyOptional({
    description: 'List of promotion codes',
    type: [String],
    example: ['code1', 'code2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  promotionMappings?: string[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  template?: number;
}
