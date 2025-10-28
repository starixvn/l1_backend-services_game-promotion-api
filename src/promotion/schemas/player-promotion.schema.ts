import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BasePlayerPromotion } from './base-player-promotion.schema';

export type PlayerPromotionDocument = PlayerPromotion & Document;

@Schema({ timestamps: true, collection: 'game_player_promotions' })
export class PlayerPromotion extends BasePlayerPromotion {
  @Prop({ type: Boolean, default: false })
  bonusClaimed: boolean;

  @Prop({ type: Date, default: null })
  claimedAt: Date;
}

export const PlayerPromotionSchema = SchemaFactory.createForClass(PlayerPromotion);
