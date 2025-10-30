import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { PlayerPromotion, PlayerPromotionSchema } from './schemas/player-promotion.schema';
import { PlayerPromotionController } from './controllers/player-promotion.controller';
import { PlayerPromotionService } from './services/player-promotion.service';
import {
  PromotionTicket,
  PromotionTicketSchema,
} from '../promotion-ticket/schemas/promotion-ticket.schema';
import { CoreModule } from '../core/core.module';
import { LoggerService } from '../core/logger/logger.service';
import {
  PlayerFinishedPromotion,
  PlayerFinishedPromotionSchema,
} from './schemas/player-finished-promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
      { name: PlayerFinishedPromotion.name, schema: PlayerFinishedPromotionSchema },
      { name: PromotionTicket.name, schema: PromotionTicketSchema },
    ]),
    CoreModule,
  ],
  controllers: [PromotionController, PlayerPromotionController],
  providers: [PromotionService, PlayerPromotionService, LoggerService],
  exports: [PromotionService, PlayerPromotionService],
})
export class PromotionModule {}
