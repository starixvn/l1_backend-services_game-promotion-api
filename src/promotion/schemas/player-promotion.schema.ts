import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlayerPromotionDocument = PlayerPromotion & Document;

export type PlayerClaimedPromotionDocument = PlayerPromotion &
  Document & {
    betLevel: number | undefined;
    isGiftCode: boolean;
  };

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
}

export const PlayerPromotionSchema = SchemaFactory.createForClass(PlayerPromotion);
