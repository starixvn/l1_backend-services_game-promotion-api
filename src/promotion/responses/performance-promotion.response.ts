import { ApiProperty } from '@nestjs/swagger';

export class DailyPromotionStats {
  @ApiProperty({ description: 'Date', example: '2025-01-01' })
  date: string;

  @ApiProperty({ description: 'Bonus issued on this date', example: 1000.5 })
  bonusIssued: number;

  @ApiProperty({ description: 'Bonus redeemed on this date', example: 750.25 })
  bonusRedeemed: number;

  @ApiProperty({ description: 'Redemption rate for this date', example: 75 })
  redemptionRate: number;
}

export class PromotionPerformanceResponse {
  @ApiProperty({ description: 'Total bonus issued', example: 10000.5 })
  bonusIssued: number;

  @ApiProperty({ description: 'Total bonus redeemed', example: 7500.25 })
  bonusRedeemed: number;

  @ApiProperty({ description: 'Overall redemption rate', example: 75 })
  redemptionRate: number;

  @ApiProperty({ description: 'Total turnover', example: 50000 })
  totalTurnover: number;

  @ApiProperty({ description: 'Minimum required turnover', example: 25000 })
  minRequiredTurnover: number;

  @ApiProperty({ description: 'Number of unique players', example: 150 })
  uniquePlayers: number;

  @ApiProperty({ description: 'Average bonus per player', example: 66.67 })
  avgBonusPerPlayer: number;

  @ApiProperty({ description: 'Average turnover per player', example: 333.33 })
  avgTurnoverPerPlayer: number;

  @ApiProperty({ description: 'Daily statistics', type: [DailyPromotionStats] })
  dailyStats: DailyPromotionStats[];
}
