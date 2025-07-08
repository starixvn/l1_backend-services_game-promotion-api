import { ApiProperty } from '@nestjs/swagger';

export class GetTOProgressResponse {
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
    description: 'Progress percentage (0-100)',
    example: 91.0,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Whether the player can claim bonus wins',
    example: false,
  })
  canClaim: boolean;

  @ApiProperty({
    description: 'Total win amount from bonus items',
    example: 25.0,
  })
  totalWinAmount: number;

  @ApiProperty({
    description: 'Error code if operation failed',
    example: 'SB3000',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Error message if operation failed',
    example: 'Player promotion not found',
    required: false,
  })
  errorMessage?: string;
}
