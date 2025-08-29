import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreatePromotionTicketDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: 'Operator identifier' })
  @IsString()
  operatorId: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  promotionId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  siteName: string;

  @ApiProperty({ description: 'Game identifier' })
  @IsNumber()
  @IsPositive()
  gameId: number;

  @ApiProperty({ description: 'Bet amount' })
  @IsNumber()
  @IsPositive()
  betAmount: number;

  @ApiProperty({ description: 'Base bet amount' })
  @IsNumber()
  @IsPositive()
  baseBetAmount: number;

  @ApiProperty({ description: 'Application type' })
  @IsNumber()
  @IsPositive()
  appType: number;

  @ApiProperty({ description: 'Game round identifier' })
  @IsNumber()
  @IsPositive()
  gameRoundId: number;

  @ApiProperty({ description: 'Win amount' })
  @IsNumber()
  winAmount: number;

  @ApiProperty({ description: 'Base win amount' })
  @IsNumber()
  baseWinAmount: number;
}
