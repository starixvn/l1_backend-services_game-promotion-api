import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemPromotionDto {
  @ApiProperty({
    description: 'Player ID',
    example: 'player123',
  })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({
    description: 'Operator ID',
    example: 'op123',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site1',
  })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({
    description: 'Currency group',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsString()
  @IsNotEmpty()
  currencyGroup: string;

  @ApiProperty({
    description: 'Gift code to redeem',
    example: 'SUMMER2024',
  })
  @IsString()
  giftCode: string;
}
