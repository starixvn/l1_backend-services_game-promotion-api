import { ApiProperty } from '@nestjs/swagger';

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
    description:
      'Error code if manual claim failed (SB3033 = AwardAPI failed, SB3032 = other failure)',
    example: 'SB3033',
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
