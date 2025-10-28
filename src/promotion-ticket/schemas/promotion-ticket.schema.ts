import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PromotionTicketDocument = PromotionTicket & Document;

@Schema({ timestamps: true, collection: 'game_promotion_tickets' })
export class PromotionTicket {
  @Prop({ required: true })
  playerId: string;

  @Prop({ required: true })
  operatorId: string;

  @Prop({ required: true })
  siteName: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  playerPromotionId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: false })
  isClaimed: boolean;

  @Prop({ required: true })
  promotionId: string;

  @Prop({ required: true })
  gameId: number;

  @Prop({ required: true, type: Number })
  gameRoundId: number;

  @Prop({ required: true, type: Number })
  appType: number;

  @Prop({ required: true, type: Number })
  betAmount: number;

  @Prop({ required: true, type: Number })
  winAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  baseBetAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  baseWinAmount: number;
}

export const PromotionTicketSchema = SchemaFactory.createForClass(PromotionTicket);
