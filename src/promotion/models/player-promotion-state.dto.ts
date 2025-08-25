import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class PlayerPromotionStateDto {
  @ApiProperty({
    description: 'Player ID',
    example: 'player123',
  })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({
    description: 'Operator ID',
    example: 'operator456',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site789',
  })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({
    description: 'Promotion ID',
    example: 'promotion101',
  })
  @IsMongoId()
  @IsNotEmpty()
  promotionId: string;
}
