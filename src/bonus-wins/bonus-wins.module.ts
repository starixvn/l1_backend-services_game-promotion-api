import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlayerPromotion,
  PlayerPromotionSchema,
} from '../promotion/schemas/player-promotion.schema';
import {
  PlayerFinishedPromotion,
  PlayerFinishedPromotionSchema,
} from '../promotion/schemas/player-finished-promotion.schema';
import { Promotion, PromotionSchema } from '../promotion/schemas/promotion.schema';
import { BonusWinsController } from './controllers/bonus-wins.controller';
import { BonusWinsService } from './services/bonus-wins.service';
import { AwardAPIService } from './services/award-api.service';
import { CoreModule } from '../core/core.module';
import { PromotionModule } from '../promotion/promotion.module';
import { PromotionTicketModule } from '../promotion-ticket/promotion-ticket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
      { name: PlayerFinishedPromotion.name, schema: PlayerFinishedPromotionSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
    CoreModule,
    PromotionModule,
    forwardRef(() => PromotionTicketModule),
  ],
  controllers: [BonusWinsController],
  providers: [BonusWinsService, AwardAPIService],
  exports: [BonusWinsService],
})
export class BonusWinsModule {}
