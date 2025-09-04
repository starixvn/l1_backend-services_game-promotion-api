import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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

  @ApiProperty({ description: 'Bet amount to add to total turnover' })
  @IsNumber()
  @IsNotEmpty()
  betAmount: number;

  @ApiProperty({ description: 'Base bet amount to add to total turnover' })
  @IsNumber()
  @Transform(({ value }) => value ?? 0)
  @IsOptional()
  baseBetAmount?: number;

  @ApiProperty({ description: 'Game ID' })
  @IsNumber()
  @IsNotEmpty()
  gameId: number;
}
