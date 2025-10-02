import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class PlayerPromotionPair {
  @ApiProperty({
    description: 'Player ID',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({
    description: 'Promotion ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  promotionId: string;
}

export class QueryIncompletePromotionsDto {
  @ApiProperty({
    description: 'Array of player-promotion pairs to query',
    type: [PlayerPromotionPair],
    example: [
      { playerId: '12345', promotionId: '507f1f77bcf86cd799439011' },
      { playerId: '67890', promotionId: '507f1f77bcf86cd799439012' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerPromotionPair)
  playerPromotionPairs: PlayerPromotionPair[];
}
