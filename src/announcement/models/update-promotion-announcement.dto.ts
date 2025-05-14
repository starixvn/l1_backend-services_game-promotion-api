import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  ValidateNested,
  ArrayUnique,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OperatorMappingDto } from './create-promotion-announcement.dto';
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
  @IsDateString()
  displayDate?: string;

  @ApiPropertyOptional({ type: [OperatorMappingDto] })
  @IsOptional()
  @IsArray()
  @ArrayUnique((item: OperatorMappingDto) => item.operatorId)
  @ValidateNested({ each: true })
  @Type(() => OperatorMappingDto)
  promotionMappings?: OperatorMappingDto[];

  @ApiPropertyOptional({ example: 'template_1' })
  @IsOptional()
  @IsString()
  imageTemplate?: string;
}
