import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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

  @ApiProperty({ description: 'Application type' })
  @IsNumber()
  @IsPositive()
  appType: number;

  @ApiProperty({ description: 'Game round identifier' })
  @IsNumber()
  @IsPositive()
  gameRoundId: number;

  @ApiProperty({ description: 'Base bet amount' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ?? 0)
  baseTotalAmount?: number;

  @ApiProperty({ description: 'Win amount' })
  @IsNumber()
  winAmount: number;

  @ApiProperty({ description: 'Base win amount' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Transform(({ value }) => value ?? 0)
  baseBetWin?: number;

  @ApiProperty({ description: 'Exchange rate ID' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Transform(({ value }) => value ?? 1)
  exchangeRateId?: number;
}
