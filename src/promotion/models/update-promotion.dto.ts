import {
  IsString,
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BetLevelDto } from './bet-level.dto';
import { GameConfigType } from './create-promotion.dto';

export class UpdatePromotionDto {
  @ApiPropertyOptional({
    description: 'Name of the promotion',
    example: 'Summer Classic Free Spins',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Code of the promotion',
    example: 'summer-class-free-spins',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Operator identifier',
    example: 'op123',
  })
  @IsString()
  @IsOptional()
  operatorId?: string;

  @ApiPropertyOptional({
    description:
      'List of site names where the promotion is offered. Empty means offer to all sites',
    type: [String],
    example: ['site1', 'site2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  offeredSiteNames?: string[];

  @ApiPropertyOptional({
    description: 'List of currency group IDs',
    type: [String],
    example: ['60d21b4667d0d01ce67a7e3b', '60d21b4667d0d01ce67a7e3c'],
  })
  @IsArray()
  @IsOptional()
  currencyGroups?: Types.ObjectId[];

  @ApiPropertyOptional({
    description: 'Start date and time of the promotion',
    example: '2024-06-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date and time of the promotion',
    example: '2024-06-30T23:59:59Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Number of free spins per player',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  bonusItemCount?: number;

  @ApiPropertyOptional({
    description: 'List of eligible player IDs. Empty means all players',
    type: [String],
    example: ['player1', 'player2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  offeredPlayerIds?: string[];

  @ApiPropertyOptional({
    description: 'Game configuration type',
    enum: GameConfigType,
    example: GameConfigType.ClassicSlot,
  })
  @IsEnum(GameConfigType)
  @IsOptional()
  gameConfigType?: GameConfigType;

  @ApiPropertyOptional({
    description: 'List of eligible game IDs',
    type: [Number],
    example: [1001, 1002],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  gameIds?: number[];

  @ApiPropertyOptional({
    description: 'List of bet levels for this promotion',
    type: [BetLevelDto],
    example: [
      {
        currencyGroup: '60d21b4667d0d01ce67a7e3b',
        betLevel: 0.2,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BetLevelDto)
  @IsOptional()
  betLevels?: BetLevelDto[];
}
