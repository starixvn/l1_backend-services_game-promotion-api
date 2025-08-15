import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { UpdatePromotionTicketDto } from '../models/update-promotion-ticket.dto';
import { TotalWinDto } from '../models/total-win.dto';
import {
  CreatePromotionTicketResponse,
  UpdatePromotionTicketResponse,
} from '../responses/promotion-ticket.response';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { BonusWinsService } from '../../bonus-wins/services/bonus-wins.service';

interface PlayerPromotionContext {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
}
interface PlayerPromotionWinAmount {
  totalWinAmount: number;
  baseTotalWinAmount: number;
}

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

      // Update bonus wins after ticket creation
      await this.updateBonusWinsAfterTicketChange(createTicketDto);

      return {
        success: true,
        ticket: savedTicket,
      };
    } catch (error) {
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
   * Update a promotion ticket
   * @param updateTicketDto Ticket update data
   * @returns Success or failure response
   */
  async updateTicket(
    updateTicketDto: UpdatePromotionTicketDto,
  ): Promise<UpdatePromotionTicketResponse> {
    try {
      await this.promotionTicketModel.findOneAndUpdate(
        this.buildTicketQuery(updateTicketDto),
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseBetWin: updateTicketDto.baseBetWin,
          },
        },
        {
          new: true,
          lean: true,
        },
      );

      // Update bonus wins after ticket update
      await this.updateBonusWinsAfterTicketChange(updateTicketDto);

      return {
        success: true,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_SUCCESS,
      };
    } catch (error) {
      this.loggerService.error('Error in updateTicket', error.stack, {
        method: 'updateTicket',
        service: 'PromotionTicketService',
        dto: updateTicketDto,
        error: error.message,
      });

      return {
        success: false,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_FAILED,
      };
    }
  }

  /**
   * Get total win amount for a player by promotionId, playerId, operatorId, siteName
   * @param totalWinDto Total win calculation data
   * @returns Total win amount (number)
   */
  async calculateTotalWin(totalWinDto: TotalWinDto): Promise<PlayerPromotionWinAmount> {
    const tickets = await this.promotionTicketModel
      .find(this.buildPlayerPromotionQuery(totalWinDto))
      .lean()
      .exec();
    const totalWinAmount = tickets.reduce((sum, ticket) => sum + (ticket.winAmount || 0), 0);
    const baseTotalWinAmount = tickets.reduce((sum, ticket) => sum + (ticket.baseBetWin || 0), 0);

    return {
      totalWinAmount,
      baseTotalWinAmount,
    };
  }

  /**
   * Update bonus wins and trigger TO requirement calculation if needed
   * @param context Player promotion context
   */
  private async updateBonusWinsAfterTicketChange(context: PlayerPromotionContext): Promise<void> {
    try {
      const winAmount = await this.calculateTotalWin(context);
      const updateResult = await this.bonusWinsService.updateTotalWinAmount(
        context.playerId,
        context.operatorId,
        context.siteName,
        context.promotionId,
        winAmount.totalWinAmount,
        winAmount.baseTotalWinAmount,
      );

      // Trigger TO requirement calculation if no bonus items remain
      if (updateResult.success && updateResult.remainingBonusItems === 0) {
        await this.bonusWinsService.calculateTORequirement(
          context.playerId,
          context.operatorId,
          context.siteName,
          context.promotionId,
        );
      }
    } catch (error) {
      this.loggerService.error(
        'Failed to update total win amount or calculate TO requirement after ticket change',
        error.stack,
        {
          method: 'updateBonusWinsAfterTicketChange',
          service: 'PromotionTicketService',
          context,
          error: error.message,
        },
      );
      // Don't throw error to avoid failing the main operation
    }
  }

  /**
   * Build query for finding tickets by player promotion context
   * @param context Player promotion context
   * @returns MongoDB query object
   */
  private buildPlayerPromotionQuery(context: PlayerPromotionContext) {
    return {
      promotionId: context.promotionId,
      playerId: context.playerId,
      operatorId: context.operatorId,
      siteName: context.siteName,
    };
  }

  /**
   * Build query for finding specific ticket for update
   * @param updateTicketDto Update ticket data
   * @returns MongoDB query object
   */
  private buildTicketQuery(updateTicketDto: UpdatePromotionTicketDto) {
    return {
      playerId: updateTicketDto.playerId,
      operatorId: updateTicketDto.operatorId,
      siteName: updateTicketDto.siteName,
      promotionId: updateTicketDto.promotionId,
      gameId: updateTicketDto.gameId,
      gameRoundId: updateTicketDto.gameRoundId,
    };
  }
}
