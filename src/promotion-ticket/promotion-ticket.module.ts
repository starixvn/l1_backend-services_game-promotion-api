import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionTicketController } from './controllers/promotion-ticket.controller';
import { PromotionTicketService } from './services/promotion-ticket.service';
import { PromotionTicket, PromotionTicketSchema } from './schemas/promotion-ticket.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PromotionTicket.name, schema: PromotionTicketSchema }]),
  ],
  controllers: [PromotionTicketController],
  providers: [PromotionTicketService],
  exports: [PromotionTicketService],
})
export class PromotionTicketModule {}
