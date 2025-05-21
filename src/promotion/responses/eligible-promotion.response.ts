import { ApiProperty } from '@nestjs/swagger';
import { Schema as MongooseSchema } from 'mongoose';

export class EligiblePromotion {
  @ApiProperty({
    description: 'Promotion ID',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  _id: string;

  @ApiProperty({
    description: 'Name of the promotion',
    example: 'Summer Classic Free Spins',
  })
  name: string;

  @ApiProperty({
    description: 'Promotion code',
    example: 'summer-classic-free-spins',
  })
  code: string;

  @ApiProperty({
    description: 'Number of free spins per player',
    example: 50,
  })
  bonusItemCount: number;

  @ApiProperty({
    description: 'Currency group ID for this player',
    example: '60d21b4667d0d01ce67a7e3c',
  })
  currencyGroup: MongooseSchema.Types.ObjectId | string;
}

export class EligiblePromotionsResponse {
  @ApiProperty({
    description: 'List of eligible promotions',
    type: [EligiblePromotion],
  })
  promotions: EligiblePromotion[];
}
