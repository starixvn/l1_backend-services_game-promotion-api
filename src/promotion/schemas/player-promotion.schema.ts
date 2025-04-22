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

  @Prop({ type: Date, default: null })
  lastUsedDate: Date;
}

export const PlayerPromotionSchema = SchemaFactory.createForClass(PlayerPromotion);
