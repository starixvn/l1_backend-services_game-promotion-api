import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsOptional, IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { OperatorMappingDto, LocalizedStringDto } from './create-promotion-announcement.dto';

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

  @ApiPropertyOptional({ type: [OperatorMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatorMappingDto)
  promotionMappings?: OperatorMappingDto[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  template?: number;
}
