import { IsString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionTicketDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: 'Operator identifier' })
  @IsString()
  operatorId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  siteName: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  promotionId: string;

  @ApiProperty({ description: 'Game identifier' })
  @IsNumber()
  @IsPositive()
  gameId: number;

  @ApiProperty({ description: 'Game round identifier' })
  @IsNumber()
  @IsPositive()
  gameRoundId: number;

  @ApiProperty({ description: 'Application type' })
  @IsNumber()
  @IsPositive()
  appType: number;

  @ApiProperty({ description: 'Bet amount' })
  @IsNumber()
  @IsPositive()
  betAmount: number;

  @ApiProperty({ description: 'Win amount' })
  @IsNumber()
  winAmount: number;
}
