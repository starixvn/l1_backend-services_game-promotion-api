import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CompletePromotionDto {
  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @IsNotEmpty()
  @IsString()
  operatorId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site1',
  })
  @IsNotEmpty()
  @IsString()
  siteName: string;

  @ApiProperty({
    description: 'Player identifier',
    example: 'player123',
  })
  @IsNotEmpty()
  @IsString()
  playerId: string;

  @ApiProperty({
    description: 'Currency group identifier',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsNotEmpty()
  @IsString()
  currencyGroup: string;

  @ApiProperty({
    description: 'Promotion identifier',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  promotionId: string;
}
