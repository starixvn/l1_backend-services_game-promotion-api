import { ApiProperty } from '@nestjs/swagger';

export class CheckTORequirementResponse {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Whether the player can claim bonus wins',
    example: true,
  })
  canClaim: boolean;

  @ApiProperty({
    description: 'Current total turnover amount',
    example: 45.5,
  })
  totalTurnover: number;

  @ApiProperty({
    description: 'Minimum required turnover amount',
    example: 50.0,
  })
  minRequiredTurnover: number;

  @ApiProperty({
    description: 'Remaining turnover needed',
    example: 4.5,
  })
  remainingTO: number;

  @ApiProperty({
    description: 'Total win amount from bonus items',
    example: 25.0,
  })
  totalWinAmount: number;

  @ApiProperty({
    description: 'Error code if validation failed',
    example: 'SB3005',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Error message if validation failed',
    example: 'Minimum turnover requirement not met',
    required: false,
  })
  errorMessage?: string;
}
