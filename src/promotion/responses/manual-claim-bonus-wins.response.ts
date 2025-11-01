import { ApiProperty } from '@nestjs/swagger';

export class AwardAPIResult {
  @ApiProperty({
    description: 'Success status of AwardAPI call',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message from AwardAPI',
    example: 'Award processed successfully',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Transaction ID from AwardAPI',
    example: '633b0a18-3cd8-4e59-8c1b-16fc301a5f53',
    required: false,
  })
  transactionId?: string;

  @ApiProperty({
    description: 'Error code from AwardAPI (0 = success, >0 = failure)',
    example: 0,
    required: false,
  })
  errorCode?: number;
}

export class ManualClaimBonusWinsResponse {
  @ApiProperty({
    description: 'Success status of manual claim operation',
    example: true,
  })
  success: boolean;

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
    description: 'Currency used for the award',
    example: 'INH',
  })
  currency: string;

  @ApiProperty({
    description: 'Result of AwardAPI call',
    type: AwardAPIResult,
  })
  awardAPIResult: AwardAPIResult;

  @ApiProperty({
    description: 'Admin user ID who performed the manual claim',
    example: 'admin456',
  })
  adminUserId: string;

  @ApiProperty({
    description: 'Timestamp when the manual claim was processed',
    example: '2025-10-30T09:00:48.665Z',
  })
  processedAt: string;

  @ApiProperty({
    description: 'Error code if manual claim failed',
    example: 'SB3031',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Error message if manual claim failed',
    example: 'AwardAPI call failed',
    required: false,
  })
  errorMessage?: string;
}
