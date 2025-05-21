import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PromotionAnnouncementSchema,
  PromotionAnnouncement,
} from './schemas/promotion-announcement.schema';
import { PromotionAnnouncementController } from './controllers/promotion-announcement.controller';
import { PromotionAnnouncementService } from './services/promotion-announcement.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromotionAnnouncement.name, schema: PromotionAnnouncementSchema },
    ]),
  ],
  controllers: [PromotionAnnouncementController],
  providers: [PromotionAnnouncementService],
  exports: [PromotionAnnouncementService],
})
export class PromotionAnnouncementModule {}
