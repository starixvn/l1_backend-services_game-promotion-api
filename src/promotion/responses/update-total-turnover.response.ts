import { ApiProperty } from '@nestjs/swagger';

export class UpdateTotalTurnoverResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Updated total turnover' })
  totalTurnover: number;

  @ApiProperty({ description: 'Remaining TO needed' })
  remainingTO: number;

  @ApiProperty({ description: 'Error code if failed' })
  code?: string;

  @ApiProperty({ description: 'Error message if failed' })
  message?: string;
}
