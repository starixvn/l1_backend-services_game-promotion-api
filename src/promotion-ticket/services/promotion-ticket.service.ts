import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { BonusWinsService } from '../../bonus-wins/services/bonus-wins.service';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { UpdatePromotionTicketDto } from '../models/update-promotion-ticket.dto';
import {
  CreatePromotionTicketResponse,
  UpdatePromotionTicketResponse,
  GetPromotionTicketsPlayerResponse,
  PromotionTicketsPlayerResponse,
} from '../responses/promotion-ticket.response';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { GetPromotionTicketsDto } from '../models/get-promotion-tickets.dto';
import { TotalWinDto } from '../models/total-win.dto';

interface PlayerPromotionContext {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  playerPromotionId: MongooseSchema.Types.ObjectId;
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
      const findPlayerPromotion = await this.bonusWinsService.findByPromotion(
        createTicketDto.playerId,
        createTicketDto.operatorId,
        createTicketDto.siteName,
        createTicketDto.promotionId,
      );
      if (!findPlayerPromotion) {
        return {
          success: false,
          ...PROMOTION_TICKET_ERROR_CODES.CREATION_FAILED,
        };
      }
      ticket.playerPromotionId = findPlayerPromotion._id;
      const savedTicket = await ticket.save();

      // Update bonus wins after ticket creation
      await this.updateBonusWinsAfterTicketChange({
        playerId: createTicketDto.playerId,
        operatorId: createTicketDto.operatorId,
        siteName: createTicketDto.siteName,
        promotionId: createTicketDto.promotionId,
        playerPromotionId: findPlayerPromotion?._id,
      });

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
      const updatedTicket = await this.promotionTicketModel.findOneAndUpdate(
        this.buildTicketQuery(updateTicketDto),
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto?.baseWinAmount || 0,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      if (!updatedTicket) {
        return {
          success: false,
          ...PROMOTION_TICKET_ERROR_CODES.UPDATE_FAILED,
        };
      }

      // Update bonus wins after ticket update
      await this.updateBonusWinsAfterTicketChange({
        playerId: updateTicketDto.playerId,
        operatorId: updateTicketDto.operatorId,
        siteName: updateTicketDto.siteName,
        promotionId: updateTicketDto.promotionId,
        playerPromotionId: updatedTicket.playerPromotionId,
      });

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
   * Get promotion tickets by promotionId and playerId with pagination
   * @param promotionId Promotion identifier
   * @param playerId Player identifier
   * @param ticketId Ticket identifier
   * @param pageIndex Page index (0-based)
   * @param pageSize Number of items per page
   * @returns Paginated list of promotion tickets
   */
  async getPromotionTickets(
    params: GetPromotionTicketsDto,
  ): Promise<GetPromotionTicketsPlayerResponse> {
    const {
      promotionId,
      playerPromotionId,
      playerId,
      roundId,
      startDate,
      endDate,
      pageIndex,
      pageSize,
    } = params;

    try {
      const query: any = {
        promotionId,
        playerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
      if (playerPromotionId) {
        query.playerPromotionId = playerPromotionId;
      }
      if (roundId) {
        query.$expr = {
          $regexMatch: {
            input: { $toString: '$gameRoundId' },
            regex: roundId,
            options: 'i',
          },
        };
      }

      // Get all records to calculate totals and count (without pagination)
      const allTickets = await this.promotionTicketModel.find(query).lean().exec();

      const { totalCount, totalBetAmount, totalWinAmount, totalBaseBetAmount, totalBaseWinAmount } =
        this.calculateTicketTotals(allTickets);

      const totalPages = Math.ceil(totalCount / pageSize);
      const skip = (pageIndex - 1) * pageSize;

      // Get paginated tickets
      const tickets = await this.promotionTicketModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec();

      return {
        tickets,
        totalPages,
        pageSize,
        metaData: {
          totalCount,
          totalBaseBetAmount,
          totalBaseWinAmount,
          totalWinAmount,
          totalBetAmount,
        },
      };
    } catch (error) {
      this.loggerService.captureException(error, {
        method: 'getPromotionTickets',
        service: 'PromotionTicketService',
        promotionId,
        playerId,
        pageIndex,
        pageSize,
      });

      return {
        tickets: [],
        totalPages: 0,
        pageSize: 0,
        metaData: {
          totalCount: 0,
          totalBaseBetAmount: 0,
          totalBaseWinAmount: 0,
          totalWinAmount: 0,
          totalBetAmount: 0,
        },
      };
    }
  }

  /**
   * Get promotion tickets by promotionId and playerId with pagination
   * @param promotionId Promotion identifier
   * @param playerId Player identifier
   * @param ticketId Ticket identifier
   * @returns List of promotion tickets
   */
  async exportPromotionTickets(
    params: GetPromotionTicketsDto,
  ): Promise<PromotionTicketsPlayerResponse> {
    const { promotionId, playerPromotionId, playerId, roundId, startDate, endDate } = params;
    try {
      const query: any = {
        promotionId,
        playerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
      if (playerPromotionId) {
        query.playerPromotionId = playerPromotionId;
      }

      if (roundId) {
        query.$expr = {
          $regexMatch: {
            input: { $toString: '$gameRoundId' },
            regex: roundId,
            options: 'i',
          },
        };
      }

      const tickets = await this.promotionTicketModel
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return {
        tickets,
      };
    } catch (error) {
      this.loggerService.captureException(error, {
        method: 'exportPromotionTickets',
        service: 'PromotionTicketService',
        params,
      });
    }
    return {
      tickets: [],
    };
  }

  /**
   * Get total win amount for a player by promotionId, playerId, operatorId, siteName
   * @param totalWinDto Total win calculation data
   * @returns Total win amount (number)
   */
  async calculateTotalWin(totalWinDto: PlayerPromotionContext): Promise<PlayerPromotionWinAmount> {
    const tickets = await this.promotionTicketModel
      .find(this.buildPlayerPromotionQuery(totalWinDto))
      .lean()
      .exec();
    const { totalWinAmount, baseTotalWinAmount } = tickets.reduce(
      (acc, ticket) => ({
        totalWinAmount: acc.totalWinAmount + (ticket.winAmount || 0),
        baseTotalWinAmount: acc.baseTotalWinAmount + (ticket.baseWinAmount || 0),
      }),
      { totalWinAmount: 0, baseTotalWinAmount: 0 },
    );

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
      $and: [
        {
          $or: [
            { playerPromotionId: { $eq: context.playerPromotionId } },
            { playerPromotionId: { $exists: false } },
          ],
        },
      ],
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

  /**
   * Calculate totals from an array of tickets
   * @param tickets Array of promotion tickets
   * @returns Object containing total count and amounts
   */
  private calculateTicketTotals(tickets: any[]): {
    totalCount: number;
    totalBetAmount: number;
    totalWinAmount: number;
    totalBaseBetAmount: number;
    totalBaseWinAmount: number;
  } {
    if (!tickets || tickets.length === 0) {
      return {
        totalCount: 0,
        totalBetAmount: 0,
        totalWinAmount: 0,
        totalBaseBetAmount: 0,
        totalBaseWinAmount: 0,
      };
    }

    return tickets.reduce(
      (acc, ticket) => {
        acc.totalCount++;
        acc.totalBetAmount += ticket.betAmount || 0;
        acc.totalWinAmount += ticket.winAmount || 0;
        acc.totalBaseBetAmount += ticket.baseBetAmount || 0;
        acc.totalBaseWinAmount += ticket.baseWinAmount || 0;
        return acc;
      },
      {
        totalCount: 0,
        totalBetAmount: 0,
        totalWinAmount: 0,
        totalBaseBetAmount: 0,
        totalBaseWinAmount: 0,
      },
    );
  }

  async calculateTotalWinAmount(totalWinDto: TotalWinDto): Promise<number> {
    const playerPromotion = await this.bonusWinsService.findByPromotion(
      totalWinDto.playerId,
      totalWinDto.operatorId,
      totalWinDto.siteName,
      totalWinDto.promotionId,
    );
    if (!playerPromotion) {
      this.loggerService.error('Player promotion not found', undefined, {
        method: 'calculateTotalWinAmount',
        service: 'PromotionTicketService',
        totalWinDto,
      });
      return 0;
    }
    return (
      await this.calculateTotalWin({
        playerId: totalWinDto.playerId,
        operatorId: totalWinDto.operatorId,
        siteName: totalWinDto.siteName,
        promotionId: totalWinDto.promotionId,
        playerPromotionId: playerPromotion._id,
      })
    ).totalWinAmount;
  }
}
