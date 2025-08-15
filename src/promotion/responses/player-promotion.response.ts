import { ApiProperty } from '@nestjs/swagger';
import { PlayerPromotion } from '../schemas/player-promotion.schema';
import { BaseApiResponse } from '../../constants/response-types';

export class PlayerPromotionResponse extends BaseApiResponse {
  @ApiProperty({ type: PlayerPromotion, nullable: true })
  promotion?: PlayerPromotion | null;
}

export class PlayerPromotionStateResponse {
  @ApiProperty({
    description: 'Number of remaining bonus items',
    example: 5,
  })
  remainingBonusItems: number;

  @ApiProperty({
    description: 'Total win amount',
    example: 1500.5,
  })
  totalWinAmount: number;

  @ApiProperty({
    description: 'Total turnover amount',
    example: 3000.75,
  })
  totalTurnover: number;

  @ApiProperty({
    description: 'Minimum required turnover',
    example: 5000.0,
  })
  minRequiredTurnover: number;

  @ApiProperty({
    description: 'Remaining turnover needed',
    example: 1999.25,
  })
  remainingTO: number;

  @ApiProperty({
    description: 'Promotion status',
    example: 'TO in Progress',
    enum: ['TO in Progress', 'Ready to Claim', 'Completed', 'Expired'],
  })
  promotionStatus: string;
}
