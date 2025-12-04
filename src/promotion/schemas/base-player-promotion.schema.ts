import { Prop } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export abstract class BasePlayerPromotion {
  @Prop({ required: true })
  playerId: string;

  @Prop({ required: true })
  operatorId: string;

  @Prop({ required: true })
  siteName: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Promotion' })
  promotionId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  promotionCode: string;

  @Prop({ required: true })
  gameId: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  currencyGroup: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  remainingBonusItems: number;

  @Prop({ required: true })
  initialBonusItem: number;

  @Prop({ required: true })
  betLevel: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Date, default: null })
  lastUsedDate: Date;

  @Prop({ type: Boolean, required: true })
  isGiftCode: boolean;

  @Prop({ type: Number, default: 0, required: true })
  totalWinAmount: number;

  @Prop({ type: Number, default: 0, required: true })
  totalTurnover: number;

  @Prop({ type: Number, default: 0, required: true })
  minRequiredTurnover: number;

  @Prop({ type: Number, required: true, min: 2 })
  turnoverMultiplier: number;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Number, default: 0 })
  coinValue: number;

  @Prop({ type: Number, default: 0 })
  baseTotalWinAmount: number;

  @Prop({ type: Number, default: 0 })
  baseTotalTurnover: number;

  @Prop({ type: Number, default: 0 })
  baseMinRequiredTurnover: number;

  @Prop({ type: Date, default: null })
  joinedAt: Date;
}
