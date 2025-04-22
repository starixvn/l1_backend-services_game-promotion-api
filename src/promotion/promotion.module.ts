import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { PlayerPromotion, PlayerPromotionSchema } from './schemas/player-promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
