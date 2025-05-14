import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  ValidateNested,
  ArrayUnique,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class OperatorMappingDto {
  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({
    description: 'Promotion code for the operator',
    example: 'promo-summer-01',
  })
  @IsString()
  @IsNotEmpty()
  promotionCode: string;
}

export class LocalizedStringDto {
  @ApiProperty({ example: 'Hot Slots - Hot Offer Promotion', description: 'English title' })
  @IsString()
  @IsNotEmpty()
  ['en-US']: string;

  @ApiProperty({
    example: 'Máy đánh bạc siêu hot - Ưu đãi cực chất',
    description: 'Vietnamese title',
  })
  @IsString()
  @IsOptional()
  ['vi-VN']?: string;

  @ApiProperty({ example: '热门老虎机 - 热门优惠活动', description: 'Simplified Chinese title' })
  @IsString()
  @IsOptional()
  ['zh-CN']?: string;

  @ApiProperty({ example: '熱門老虎機 - 超值優惠', description: 'Traditional Chinese title' })
  @IsString()
  @IsOptional()
  ['zh-TW']?: string;

  @ApiProperty({ example: 'สล็อตร้อน - โปรโมชั่นสุดฮอต', description: 'Thai title' })
  @IsString()
  @IsOptional()
  ['th-TH']?: string;

  @ApiProperty({ example: 'Slot panas - Promo Menarik', description: 'Indonesian title' })
  @IsString()
  @IsOptional()
  ['id-ID']?: string;
}

export class CreatePromotionAnnouncementDto {
  @ApiProperty({
    type: LocalizedStringDto,
    description: 'Promotion title in multiple languages',
  })
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  promotionTitle: LocalizedStringDto;

  @ApiProperty({
    type: LocalizedStringDto,
    description: 'Banner content in multiple languages',
  })
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  bannerContent: LocalizedStringDto;

  @ApiProperty({
    type: LocalizedStringDto,
    description: 'Terms and conditions in multiple languages',
  })
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  termsAndConditions: LocalizedStringDto;

  @ApiProperty({
    description: 'Display date in GMT+7',
    example: '2024-06-01T00:00:00Z',
  })
  @IsDateString()
  displayDate: string;

  @ApiProperty({
    type: [OperatorMappingDto],
    description: 'List of Operator-Promotion mappings',
  })
  @IsArray()
  @ArrayUnique((item: OperatorMappingDto) => item.operatorId, {
    message: 'Duplicate operatorId found in promotionMappings.',
  })
  @ValidateNested({ each: true })
  @Type(() => OperatorMappingDto)
  promotionMappings: OperatorMappingDto[];

  @ApiProperty({
    example: 'template_1',
    description: 'Template name used by the announcement',
  })
  @IsString()
  @IsNotEmpty()
  imageTemplate: string;
}
