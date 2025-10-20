import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Action Log Schema
 * Stores structured logs for player actions (bonus claims, promotions, etc.)
 */
@Schema({ collection: 'promotion_requests', timestamps: true })
export class ActionLog extends Document {
  @Prop({ required: true, index: true })
  operatorId: string;

  @Prop({ required: true, index: true })
  logTimeStamp: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ type: Object, required: true })
  request: {
    playerId: string;
    siteName: string;
    promotionId?: string;
    [key: string]: any;
  };

  @Prop({ type: Object })
  response?: {
    claimedAmount?: number;
    totalTurnover?: number;
    minRequiredTurnover?: number;
    totalWinAmount?: number;
    progressPercentage?: number;
    errorCode?: string;
    errorMessage?: string;
    errorDescription?: string;
    [key: string]: any;
  };
}

export const ActionLogSchema = SchemaFactory.createForClass(ActionLog);

// Create compound indexes for efficient queries
ActionLogSchema.index({ operatorId: 1, logTimeStamp: -1 });
ActionLogSchema.index({ 'request.playerId': 1, logTimeStamp: -1 });
ActionLogSchema.index({ action: 1, logTimeStamp: -1 });
ActionLogSchema.index({ 'response.errorCode': 1, logTimeStamp: -1 });
