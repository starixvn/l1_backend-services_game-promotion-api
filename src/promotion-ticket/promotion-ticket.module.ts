import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionTicketController } from './controllers/promotion-ticket.controller';
import { PromotionTicketService } from './services/promotion-ticket.service';
import { PromotionTicket, PromotionTicketSchema } from './schemas/promotion-ticket.schema';
import { CoreModule } from '../core/core.module';
import { BonusWinsModule } from '../bonus-wins/bonus-wins.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PromotionTicket.name, schema: PromotionTicketSchema }]),
    CoreModule,
    forwardRef(() => BonusWinsModule),
  ],
  controllers: [PromotionTicketController],
  providers: [PromotionTicketService],
  exports: [PromotionTicketService],
})
export class PromotionTicketModule {}
