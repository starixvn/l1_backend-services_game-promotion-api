import { ApiProperty } from '@nestjs/swagger';

export class PromotionPerformanceResponse {
  @ApiProperty({ description: 'Status of the promotion', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Number of bonus items redeemed', example: 150 })
  bonusRedeemed: number;

  @ApiProperty({ description: 'Total turnover amount', example: 50000 })
  totalTurnover: number;

  @ApiProperty({ description: 'Minimum required turnover', example: 10000 })
  minRequiredTurnover: number;

  @ApiProperty({ description: 'Number of unique players', example: 25 })
  uniquePlayers: number;
}
