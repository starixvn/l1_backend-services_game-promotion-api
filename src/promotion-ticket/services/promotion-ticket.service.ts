import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { CreatePromotionTicketResponse } from '../responses/promotion-ticket.response';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';

/**
 * Service for managing promotion tickets
 */
@Injectable()
export class PromotionTicketService {
  constructor(
    @InjectModel(PromotionTicket.name)
    private readonly promotionTicketModel: Model<PromotionTicketDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Create a new promotion ticket
   * @param createTicketDto Ticket creation data
   * @returns Success or failure response with ticket data
   */
  async createTicket(
    createTicketDto: CreatePromotionTicketDto,
  ): Promise<CreatePromotionTicketResponse> {
    try {
      const ticket = new this.promotionTicketModel(createTicketDto);
      const savedTicket = await ticket.save();

      return {
        success: true,
        ticket: savedTicket,
        ...PROMOTION_TICKET_ERROR_CODES.CREATION_SUCCESS,
      };
    } catch (error) {
      // Log the exception to Sentry with context
      this.loggerService.captureException(error, {
        method: 'createTicket',
        service: 'PromotionTicketService',
        dto: createTicketDto,
      });

      return {
        success: false,
        ...PROMOTION_TICKET_ERROR_CODES.CREATION_FAILED,
      };
    }
  }
}
