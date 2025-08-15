import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PromotionSummaryDto {
  @ApiProperty({ description: 'Operator ID', example: 'ONEworksVGCash' })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({ description: 'Site name', example: 'lumi' })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({ description: 'Promotion ID', example: '689b00dbd459c639a74ef4eb' })
  @IsString()
  @IsNotEmpty()
  promotionId: string;
}
