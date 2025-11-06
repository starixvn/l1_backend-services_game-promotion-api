import { ApiProperty } from '@nestjs/swagger';

export class ClaimBonusWinsResponse {
  @ApiProperty({
    description: 'Player finished promotion ID',
    example: '65f1a2b3c4d5e6f7g8h9i0j1',
  })
  playerFinishedPromotionId: string;

  @ApiProperty({
    description: 'Amount of bonus wins claimed',
    example: 25.0,
  })
  claimedAmount: number;

  @ApiProperty({
    description: 'Total turnover at time of claim',
    example: 100.0,
  })
  totalTurnover: number;

  @ApiProperty({
    description: 'Minimum required turnover that was met',
    example: 100.0,
  })
  minRequiredTurnover: number;

  @ApiProperty({
    description: 'Total win amount from all bonus items',
    example: 25.0,
  })
  totalWinAmount: number;

  @ApiProperty({
    description: 'Error code if claim failed',
    example: 'SB3005',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Error message if claim failed',
    example: 'Minimum turnover requirement not met',
    required: false,
  })
  errorMessage?: string;
}
