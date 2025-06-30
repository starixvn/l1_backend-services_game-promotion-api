import { ApiProperty } from '@nestjs/swagger';

export class CalculateTORequirementResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Calculated minimum required turnover' })
  minRequiredTurnover: number;

  @ApiProperty({ description: 'Total win amount used for calculation' })
  totalWinAmount: number;

  @ApiProperty({ description: 'Turnover multiplier used' })
  turnoverMultiplier: number;

  @ApiProperty({ description: 'Error code if failed' })
  code?: string;

  @ApiProperty({ description: 'Error message if failed' })
  message?: string;
}
