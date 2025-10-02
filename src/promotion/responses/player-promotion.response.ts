import { ApiProperty } from '@nestjs/swagger';
import { PlayerPromotion } from '../schemas/player-promotion.schema';
import { BaseApiResponse } from '../../constants/response-types';

export class PlayerPromotionResponse extends BaseApiResponse {
  @ApiProperty({ type: PlayerPromotion, nullable: true })
  promotion?: PlayerPromotion | null;
}

export class PlayerPromotionStateResponse {
  @ApiProperty({
    description: 'Player ID',
    example: 'JohnDoe123',
  })
  id: string;

  @ApiProperty({
    description: 'Player username',
    example: 'JohnDoe123',
  })
  username: string;

  @ApiProperty({
    description: 'Player status',
    example: 'Active',
    enum: ['Active', 'Ineligible', 'Turnover Met', 'Bonus Redeemed', 'Expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Site name',
    example: 'Site 1',
  })
  siteName: string;

  @ApiProperty({
    description: 'Currency',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Date when player joined the promotion',
    example: '2024-01-15',
  })
  dateJoined: string;

  @ApiProperty({
    description: 'Total bonus win',
    example: 125.5,
  })
  bonusWin: number;
  @ApiProperty({
    description: 'Base total bonus win',
    example: 125.5,
  })
  baseBonusWin: number;

  @ApiProperty({
    description: 'Total turnover contributed',
    example: 890.25,
  })
  turnover: number;
  @ApiProperty({
    description: 'Base total turnover contributed',
    example: 890.25,
  })
  baseTurnover: number;

  @ApiProperty({
    description: 'Progress information',
    example: { current: 1.5, required: 2.0 },
  })
  progress: {
    current: number;
    required: number;
  };

  @ApiProperty({
    description: 'Total bonus redeemed',
    example: 0.0,
  })
  bonusClaimed: number;
  @ApiProperty({
    description: 'Total bonus redeemed',
    example: 0.0,
  })
  baseBonusClaimed: number;

  @ApiProperty({
    description: 'Last activity date',
    example: '2024-01-25',
  })
  lastActivity: string;

  @ApiProperty({
    description: 'Initial bonus item',
    example: 100,
  })
  initialBonusItem: number;
  @ApiProperty({
    description: 'Remaining bonus items',
    example: 100,
  })
  remainingBonusItems: number;
}

export class PlayersResponse {
  @ApiProperty({
    description: 'List of players',
    type: [PlayerPromotionStateResponse],
  })
  items: PlayerPromotionStateResponse[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      pageIndex: 1,
      totalCount: 100,
      baseTotalWinAmount: 10000.5,
      baseTotalTurnover: 50000.25,
      baseTotalBonusClaimed: 7500.0,
      pageSize: 10,
    },
  })
  metadata: {
    pageIndex: number;
    totalCount: number;
    baseTotalWinAmount: number;
    baseTotalTurnover: number;
    baseTotalBonusClaimed: number;
    pageSize: number;
  };
}
