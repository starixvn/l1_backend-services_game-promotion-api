import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BasePlayerPromotion } from './base-player-promotion.schema';

export type PlayerFinishedPromotionDocument = PlayerFinishedPromotion & Document;

@Schema({ timestamps: true, collection: 'game_player_finished_promotions' })
export class PlayerFinishedPromotion extends BasePlayerPromotion {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  playerPromotionId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  redemptionCount: number;

  @Prop({ type: Boolean, default: true })
  bonusClaimed: boolean;

  @Prop({ type: Date, required: true })
  claimedAt: Date;
}

export const PlayerFinishedPromotionSchema = SchemaFactory.createForClass(PlayerFinishedPromotion);
