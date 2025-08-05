import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlayerPromotionDocument = PlayerPromotion & Document;

@Schema({ timestamps: true, collection: 'game_player_promotions' })
export class PlayerPromotion {
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
  bonusClaimed: boolean;

  @Prop({ type: Date, default: null })
  claimedAt: Date;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Number, default: 0 })
  coinValue: number;
}

export const PlayerPromotionSchema = SchemaFactory.createForClass(PlayerPromotion);
