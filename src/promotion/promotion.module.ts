import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionController } from './controllers/promotion.controller';
import { PromotionService } from './services/promotion.service';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { PlayerPromotion, PlayerPromotionSchema } from './schemas/player-promotion.schema';
import { PlayerPromotionController } from './controllers/player-promotion.controller';
import { PlayerPromotionService } from './services/player-promotion.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
    ]),
  ],
  controllers: [PromotionController, PlayerPromotionController],
  providers: [PromotionService, PlayerPromotionService],
  exports: [PromotionService, PlayerPromotionService],
})
export class PromotionModule {}
