import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdatePromotionTicketDto {
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

  @ApiProperty({ description: 'Base win amount' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ?? 1)
  baseBetWin?: number;
}
