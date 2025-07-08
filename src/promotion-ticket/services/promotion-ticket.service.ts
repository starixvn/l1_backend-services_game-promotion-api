import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { TotalWinDto } from '../models/total-win.dto';
import { CreatePromotionTicketResponse } from '../responses/promotion-ticket.response';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { BonusWinsService } from '../../bonus-wins/services/bonus-wins.service';

/**
 * Service for managing promotion tickets
 */
@Injectable()
export class PromotionTicketService {
  constructor(
    @InjectModel(PromotionTicket.name)
    private readonly promotionTicketModel: Model<PromotionTicketDocument>,
    private readonly loggerService: LoggerService,
    private readonly bonusWinsService: BonusWinsService,
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

      // Update total win amount after creating the ticket
      try {
        const winAmount = await this.calculateTotalWin({
          playerId: createTicketDto.playerId,
          operatorId: createTicketDto.operatorId,
          siteName: createTicketDto.siteName,
          promotionId: createTicketDto.promotionId,
        });
        const updateResult = await this.bonusWinsService.updateTotalWinAmount(
          createTicketDto.playerId,
          createTicketDto.operatorId,
          createTicketDto.siteName,
          createTicketDto.promotionId,
          winAmount,
        );

        // Check if remaining bonus items is 0 to trigger TO requirement calculation
        if (updateResult.success && updateResult.remainingBonusItems === 0) {
          // Trigger calculate TO requirement when no bonus items remain
          await this.bonusWinsService.calculateTORequirement(
            createTicketDto.playerId,
            createTicketDto.operatorId,
            createTicketDto.siteName,
            createTicketDto.promotionId,
          );
        }
      } catch (updateError) {
        // Log the error but don't fail the ticket creation
        this.loggerService.error(
          'Failed to update total win amount or calculate TO requirement after ticket creation',
          updateError.stack,
          {
            method: 'createTicket',
            service: 'PromotionTicketService',
            playerId: createTicketDto.playerId,
            operatorId: createTicketDto.operatorId,
            promotionId: createTicketDto.promotionId,
            winAmount: createTicketDto.winAmount,
            error: updateError.message,
          },
        );
      }

      return {
        success: true,
        ticket: savedTicket,
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

  /**
   * Get total win amount for a player by promotionId, playerId, operatorId, siteName
   * @param totalWinDto Total win calculation data
   * @returns Total win amount (number)
   */
  async calculateTotalWin(totalWinDto: TotalWinDto): Promise<number> {
    const tickets = await this.promotionTicketModel
      .find({
        promotionId: totalWinDto.promotionId,
        playerId: totalWinDto.playerId,
        operatorId: totalWinDto.operatorId,
        siteName: totalWinDto.siteName,
      })
      .lean()
      .exec();
    return tickets.reduce((sum, ticket) => sum + (ticket.winAmount || 0), 0);
  }
}
