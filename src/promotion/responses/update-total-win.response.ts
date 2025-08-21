import { ApiProperty } from '@nestjs/swagger';

export class UpdateTotalWinResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Updated total win amount' })
  totalWinAmount: number;

  @ApiProperty({ description: 'Remaining bonus items count' })
  remainingBonusItems: number;

  @ApiProperty({ description: 'Error code if failed' })
  code?: string;

  @ApiProperty({ description: 'Error message if failed' })
  message?: string;
}
