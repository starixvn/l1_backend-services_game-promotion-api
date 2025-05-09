import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayUnique,
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

export class CreatePromotionAnnouncementDto {
  @ApiProperty({
    example: 'Super_Free_Spins_2024',
    description: 'Promotion title shown to client (letters, numbers, underscores only)',
  })
  @IsString()
  @IsNotEmpty()
  promotionTitle: string;

  @ApiProperty({
    example: 'Get 50 free spins this summer!',
    description: 'Banner content shown to player',
  })
  @IsString()
  @IsNotEmpty()
  bannerContent: string;

  @ApiProperty({
    description: 'Promotion rules and terms',
    example: 'Spins expire in 7 days...',
  })
  @IsString()
  @IsNotEmpty()
  termsAndConditions: string;

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
}
