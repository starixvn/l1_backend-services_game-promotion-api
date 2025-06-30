import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TotalWinDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: 'Operator identifier' })
  @IsString()
  operatorId: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  promotionId: string;
}
