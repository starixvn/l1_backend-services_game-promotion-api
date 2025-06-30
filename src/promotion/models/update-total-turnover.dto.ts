import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTotalTurnoverDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'Operator identifier' })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  @IsNotEmpty()
  promotionId: string;

  @ApiProperty({ description: 'Bet amount to add to total turnover' })
  @IsNumber()
  @IsNotEmpty()
  betAmount: number;
}
