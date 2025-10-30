import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PromotionDocument = Promotion & Document;
export type PromotionExpiryDocument = Promotion & {
  _id: string;
  players: {
    playerId: string;
    totalWin: number;
  }[];
};

@Schema({ timestamps: true })
export class BetLevel {
  @ApiProperty({
    description: 'Currency group ID (MongoDB ObjectId)',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  currencyGroup: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    description: 'Bet level amount',
    example: 0.2,
  })
  @Prop({ required: true })
  betLevel: number;
}
@Schema({ timestamps: true })
export class CoinValue {
  @ApiProperty({
    description: 'Currency group ID (MongoDB ObjectId)',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  currencyGroup: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    description: 'Coin value amount',
    example: 0.2,
  })
  @Prop({ required: true })
  coinValue: number;
}

@Schema({ timestamps: true, collection: 'game_promotions' })
export class Promotion {
  @ApiProperty({
    description: 'Name of the promotion',
    example: 'Summer Classic Free Spins',
  })
  @Prop({ required: true })
  name: string;

  @ApiProperty({
    description: 'Promotion code derived from the name',
    example: 'summer-classic-free-spins',
  })
  @Prop({ required: true })
  code: string;

  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @Prop({ required: true })
  operatorId: string;

  @ApiProperty({
    description:
      'List of site names where the promotion is offered. Empty means offer to all sites',
    type: [String],
    example: ['site1', 'site2'],
  })
  @Prop({ type: [String], default: [] })
  offeredSiteNames: string[];

  @ApiProperty({
    description: 'List of currency group IDs',
    type: [String],
    example: ['60d21b4667d0d01ce67a7e3b', '60d21b4667d0d01ce67a7e3c'],
  })
  @Prop({ type: [MongooseSchema.Types.ObjectId], required: true })
  currencyGroups: MongooseSchema.Types.ObjectId[];

  @ApiProperty({
    description: 'Start date and time of the promotion',
    example: '2024-06-01T00:00:00Z',
  })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({
    description: 'End date and time of the promotion',
    example: '2024-06-30T23:59:59Z',
  })
  @Prop({ required: true })
  endDate: Date;

  @ApiProperty({
    description: 'Date and time when bonus items become unclaimable',
    example: '2024-07-15T23:59:59Z',
  })
  @Prop({ required: true })
  claimExpirationDate: Date;

  @ApiProperty({
    description: 'Number of free spins per player',
    example: 50,
  })
  @Prop({ required: true })
  bonusItemCount: number;

  @ApiProperty({
    description: 'List of eligible player IDs. Empty means all players',
    type: [String],
    example: ['player1', 'player2'],
  })
  @Prop({ type: [String], default: [] })
  offeredPlayerIds: string[];

  @ApiProperty({
    description: 'Game configuration type: 2 = ClassicSlot, 3 = CascadingSlot',
    example: 2,
  })
  @Prop({ required: true })
  gameConfigType: number;

  @ApiProperty({
    description: 'List of eligible game IDs',
    type: [Number],
    example: [1001, 1002],
  })
  @Prop({ type: [Number], required: true })
  gameIds: number[];

  @ApiProperty({
    description: 'List of bet levels for this promotion',
    type: [BetLevel],
  })
  @Prop({ type: [{ type: BetLevel }], default: [] })
  betLevels: BetLevel[];

  @ApiProperty({
    description: 'List of coin levels for this promotion',
    type: [CoinValue],
  })
  @Prop({ type: [{ type: CoinValue }], default: [] })
  coinValues: CoinValue[];

  @ApiProperty({
    description: 'Indicates if this promotion is a gift code',
    example: false,
  })
  @Prop({ default: false, required: true })
  isGiftCode: boolean;

  @ApiProperty({
    description: 'Minimum TO multiplier required (at least 2X) to claim bonus wins',
    example: 2,
    minimum: 2,
  })
  @Prop({ type: Number, default: 2, required: true })
  minTurnoverMultiplier: number;

  @Prop({ type: Number, default: 1, required: true })
  maxRedemptionTimes: number;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
