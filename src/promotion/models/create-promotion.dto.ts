import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BetLevelDto } from './bet-level.dto';
import { CoinValueDto } from './coin-value.dto';

export enum GameConfigType {
  ClassicSlot = 2,
  CascadingSlot = 3,
}

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Name of the promotion',
    example: 'Summer Classic Free Spins',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Promotion code derived from the name',
    example: 'SUMMER-CLASSIC-FREE-SPINS',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  code: string;

  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

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

  @ApiProperty({
    description: 'List of currency group IDs',
    type: [String],
    example: ['60d21b4667d0d01ce67a7e3b', '60d21b4667d0d01ce67a7e3c'],
  })
  @IsArray()
  @IsNotEmpty()
  currencyGroups: Types.ObjectId[];

  @ApiProperty({
    description: 'Start date and time of the promotion',
    example: '2024-06-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'End date and time of the promotion',
    example: '2024-06-30T23:59:59Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    description: 'Date and time when bonus items become unclaimable',
    example: '2024-07-15T23:59:59Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  claimExpirationDate: Date;

  @ApiProperty({
    description: 'Number of free spins per player',
    example: 50,
  })
  @IsNumber()
  @IsNotEmpty()
  bonusItemCount: number;

  @ApiPropertyOptional({
    description: 'List of eligible player IDs. Empty means all players',
    type: [String],
    example: ['player1', 'player2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  offeredPlayerIds?: string[];

  @ApiProperty({
    description: 'Game configuration type',
    enum: GameConfigType,
    example: GameConfigType.ClassicSlot,
  })
  @IsEnum(GameConfigType)
  @IsNotEmpty()
  gameConfigType: GameConfigType;

  @ApiProperty({
    description: 'List of eligible game IDs',
    type: [Number],
    example: [1001, 1002],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  gameIds: number[];

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

  @ApiPropertyOptional({
    description: 'List of coin values for this promotion',
    type: [CoinValueDto],
    example: [
      {
        currencyGroup: '60d21b4667d0d01ce67a7e3b',
        coinValue: 0.2,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoinValueDto)
  @IsOptional()
  coinValues?: CoinValueDto[];

  @ApiPropertyOptional({
    description: 'Indicates if this promotion is a gift code',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isGiftCode?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum TO multiplier required (at least 2X) to claim bonus wins',
    example: 2,
    minimum: 2,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  minTurnoverMultiplier?: number;
}
