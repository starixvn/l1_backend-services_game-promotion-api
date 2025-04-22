import { IsMongoId, IsNumber, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class BetLevelDto {
  @ApiProperty({
    description: 'Currency group ID (MongoDB ObjectId)',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsMongoId()
  @IsNotEmpty()
  currencyGroup: Types.ObjectId;

  @ApiProperty({
    description: 'Bet level amount',
    example: 0.2,
  })
  @IsNumber()
  @IsNotEmpty()
  betLevel: number;
}
