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
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromotionAnnouncement.name, schema: PromotionAnnouncementSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [PromotionAnnouncementController],
  providers: [PromotionAnnouncementService, PromotionService],
  exports: [PromotionAnnouncementService],
})
export class PromotionAnnouncementModule {}
