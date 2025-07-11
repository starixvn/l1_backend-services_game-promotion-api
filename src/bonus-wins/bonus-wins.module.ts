import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlayerPromotion,
  PlayerPromotionSchema,
} from '../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionSchema } from '../promotion/schemas/promotion.schema';
import { BonusWinsController } from './controllers/bonus-wins.controller';
import { BonusWinsService } from './services/bonus-wins.service';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
    CoreModule,
  ],
  controllers: [BonusWinsController],
  providers: [BonusWinsService],
  exports: [BonusWinsService],
})
export class BonusWinsModule {}
