import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PromotionAnnouncementSchema,
  PromotionAnnouncement,
} from './schemas/promotion-announcement.schema';
import { PromotionAnnouncementController } from './controllers/promotion-announcement.controller';
import { PromotionAnnouncementService } from './services/promotion-announcement.service';
import { PromotionService } from '../promotion/services/promotion.service';
import { Promotion, PromotionSchema } from '../promotion/schemas/promotion.schema';
import {
  PlayerPromotion,
  PlayerPromotionSchema,
} from '../promotion/schemas/player-promotion.schema';
import {
  PromotionTicket,
  PromotionTicketSchema,
} from '../promotion-ticket/schemas/promotion-ticket.schema';
import { LoggerService } from '../core/logger/logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromotionAnnouncement.name, schema: PromotionAnnouncementSchema },
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
      { name: PromotionTicket.name, schema: PromotionTicketSchema },
    ]),
  ],
  controllers: [PromotionAnnouncementController],
  providers: [PromotionAnnouncementService, PromotionService, LoggerService],
  exports: [PromotionAnnouncementService],
})
export class PromotionAnnouncementModule {}
