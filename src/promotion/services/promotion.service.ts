import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Promotion, PromotionDocument, PromotionExpiryDocument } from '../schemas/promotion.schema';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';
import { PaginationResponse } from '../responses/pagination.response';
import { LoggerService } from '../../core/logger/logger.service';
import {
  PromotionTicket,
  PromotionTicketDocument,
} from '../../promotion-ticket/schemas/promotion-ticket.schema';
import { PromotionPerformanceResponse } from '../responses/performance-promotion.response';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { roundToTwoDecimals, calculatePercentage } from '../../core/utils';
import { PromotionPerformanceDto } from '../models/promotion-performance.dto';
import { PROMOTION_ERROR_CODES } from '../../constants/error-codes';

const EXPIRY_CHECK_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    @InjectModel(PromotionTicket.name)
    private readonly promotionTicketModel: Model<PromotionTicketDocument>,
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Creates a new promotion
   * @param createPromotionDto - The promotion data
   * @returns The created promotion
   */
  async createPromotion(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const newPromotion = new this.promotionModel({
      ...createPromotionDto,
    });

    return newPromotion.save();
  }

  /**
   * Finds all promotions with optional filtering
   * @param filterDto - Filters for promotions
   * @returns Array of promotions
   */
  async findAll(filterDto?: PromotionFilterDto): Promise<PaginationResponse<Promotion>> {
    const query: Record<string, any> = {};
    const now = new Date();

    const pageIndex = filterDto?.pageIndex || 1;
    const pageSize = filterDto?.pageSize || DEFAULT_PAGE_SIZE;
    const skip = (pageIndex - 1) * pageSize;

    if (filterDto) {
      if (filterDto.operatorIds && filterDto.operatorIds.length > 0) {
        query.operatorId = { $in: filterDto.operatorIds };
      }

      if (filterDto.code) {
        query.code = { $regex: filterDto.code, $options: 'i' };
      }

      if (filterDto.status) {
        switch (filterDto.status) {
          case PromotionStatus.NOT_STARTED:
            query.startDate = { $gt: now };
            break;
          case PromotionStatus.RUNNING:
            query.startDate = { $lte: now };
            query.endDate = { $gt: now };
            break;
          case PromotionStatus.ENDED:
            query.endDate = { $lte: now };
            break;
        }
      }
    }

    const aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'promotion_announcements',
          let: { promotionCode: '$code' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$promotionCode', '$promotionMappings'],
                },
              },
            },
            {
              $project: {
                announcementTitle: { $ifNull: ['$promotionTitle.en-US', ''] },
              },
            },
          ],
          as: 'announcements',
        },
      },
      {
        $addFields: {
          announcementTitle: {
            $ifNull: [{ $arrayElemAt: ['$announcements.announcementTitle', 0] }, ''],
          },
        },
      },
      {
        $project: {
          announcements: 0,
        },
      },
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [{ $lte: ['$startDate', now] }, { $gt: ['$endDate', now] }],
                  },
                  then: 1,
                },
                {
                  case: { $gt: ['$startDate', now] },
                  then: 2,
                },
                {
                  case: { $lte: ['$endDate', now] },
                  then: 3,
                },
              ],
              default: 4,
            },
          },
        },
      },
      {
        $sort: {
          statusOrder: 1 as const,
          endDate: 1 as const,
          startDate: 1 as const,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ];

    const items = await this.promotionModel.aggregate(aggregationPipeline).exec();
    const total = await this.promotionModel.countDocuments(query);

    return {
      items: items,
      metadata: {
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Gets only running promotions (active at current time) sorted by priority
   * @param operatorId - Operator ID to filter by (optional - if provided, filter by operatorId, otherwise get all)
   * @param gameId - Game ID to filter by (optional - if provided, filter by gameId, otherwise get all)
   * @returns Array of running promotions sorted by priority rules
   */
  async getRunningPromotions(operatorId?: string, gameId?: string): Promise<Promotion[]> {
    const now = new Date();
    const query: Record<string, any> = {
      startDate: { $lte: now },
      endDate: { $gt: now },
    };

    // Add operatorId filter if provided
    if (operatorId) {
      query.operatorId = operatorId;
    }

    // Add gameId filter if provided
    if (gameId) {
      query.gameIds = { $in: [parseInt(gameId)] };
    }

    return this.promotionModel
      .find(query, null, { sort: { endDate: 1, _id: 1 }, lean: true })
      .exec();
  }

  /**
   * Get all promotions sorted by priority (running)
   * @returns Array of running promotions sorted by priority rules
   */
  async getAllPromotionsRunning(): Promise<Promotion[]> {
    const now = new Date();
    return this.promotionModel
      .find({ startDate: { $lte: now }, claimExpirationDate: { $gt: now } }, null, {
        sort: { endDate: 1, _id: 1 },
        lean: true,
      })
      .exec();
  }

  /**
   * Finds a promotion by ID
   * @param id - The promotion ID
   * @returns The found promotion or null
   */
  async findOne(id: string): Promise<Promotion> {
    if (!id) {
      this.logger.error(`Promotion ID is required`);
      throw new NotFoundException(`Promotion ID is required`);
    }

    const promotion = await this.promotionModel.findById(id).lean().exec();
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return promotion;
  }

  /**
   * Updates a promotion by ID
   * @param id - The promotion ID
   * @param updatePromotionDto - The updated promotion data
   * @returns The updated promotion
   */
  async update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    if (!id) {
      this.logger.error(`Promotion ID is required`);
      throw new NotFoundException(`Promotion ID is required`);
    }

    const update: Record<string, any> = { ...updatePromotionDto };

    const updatedPromotion = await this.promotionModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (!updatedPromotion) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }

    return updatedPromotion;
  }

  /**
   * Deletes a promotion by ID
   * @param id - The promotion ID
   * @returns true if deleted, false otherwise
   */
  async remove(id: string): Promise<boolean> {
    if (!id) {
      this.logger.error(`Promotion ID is required`);
      throw new NotFoundException(`Promotion ID is required`);
    }
    const result = await this.promotionModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return true;
  }

  /**
   * Checks if a promotion code exists
   * @param code - The promotion code to check
   * @returns true if the code exists, false otherwise
   */
  async doesCodeExist(code: string): Promise<boolean> {
    const existing = await this.promotionModel.exists({ code: code.toUpperCase() });
    return !!existing;
  }

  /**
   * Gets promotions that are NOT_STARTED and not mapped to any announcement
   * @returns Array of unmapped NOT_STARTED promotions
   */
  async getUnmappedNotStartedPromotions(): Promise<Promotion[]> {
    const now = new Date();
    const aggregationPipeline = [
      { $match: { startDate: { $gt: now } } }, // NOT_STARTED
      {
        $lookup: {
          from: 'promotion_announcements',
          let: { promotionCode: '$code' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$promotionCode', '$promotionMappings'],
                },
              },
            },
          ],
          as: 'announcements',
        },
      },
      { $match: { 'announcements.0': { $exists: false } } }, // Chưa mapping announcement nào
      { $project: { announcements: 0 } },
      { $sort: { startDate: 1 as const } },
    ];
    return this.promotionModel.aggregate(aggregationPipeline).exec();
  }

  async findManyByCodes(codes: string[]): Promise<Promotion[]> {
    return this.promotionModel
      .find({ code: { $in: codes } })
      .lean()
      .exec();
  }

  /**
   * Gets promotions that are expiring soon (endDate within now and now+days)
   * @param operatorId - Operator ID to filter by (optional)
   * @param gameId - Game ID to filter by (optional)
   * @param days - Number of days to consider as expiring soon (default: 3)
   * @returns Array of expiring promotions
   */
  async getExpiringPromotions(gameId?: string): Promise<PromotionExpiryDocument[]> {
    const now = new Date();
    const query: Record<string, any> = {
      endDate: {
        $lt: now,
        $gte: new Date(now.getTime() - EXPIRY_CHECK_SECONDS * MILLISECONDS_PER_SECOND),
      },
    };

    if (gameId) {
      query.gameIds = { $in: [parseInt(gameId)] };
    }

    const promotionExpirys = (await this.promotionModel
      .find(query, null, { sort: { endDate: 1, _id: 1 }, lean: true })
      .exec()) as unknown as PromotionExpiryDocument[];

    const playerPromotions = await this.playerPromotionModel
      .find({
        promotionId: { $in: promotionExpirys.map(promotion => promotion._id) },
        totalWinAmount: { $gt: 0 },
        isCompleted: false,
      })
      .exec();

    const promotionsWithPlayers: PromotionExpiryDocument[] = [];

    for (const promotion of promotionExpirys) {
      const playerPromotionExpireds = playerPromotions.filter(
        playerPromotion => playerPromotion.promotionId.toString() === promotion._id.toString(),
      );

      if (playerPromotionExpireds.length > 0) {
        const playerStats = playerPromotionExpireds.map(playerPromotion => ({
          playerId: playerPromotion.playerId,
          totalWin: playerPromotion.totalWinAmount,
        }));

        promotion.players = playerStats;
        promotionsWithPlayers.push(promotion);
      }
    }

    return promotionsWithPlayers;
  }

  /**
   * Get promotion summary statistics
   * @param summaryDto - Summary parameters
   * @returns Promotion summary data
   */
  async getPromotionPerformance(
    promotionDto: PromotionPerformanceDto,
  ): Promise<PromotionPerformanceResponse> {
    const { promotionId, isBaseCurrency } = promotionDto;
    const promotion = await this.promotionModel.findById(promotionId).lean();

    if (!promotion) {
      throw new NotFoundException(PROMOTION_ERROR_CODES.PROMOTION_NOT_FOUND);
    }

    // Determine which fields to use based on isBaseCurrency flag
    const totalWinAmountField = isBaseCurrency ? '$baseTotalWinAmount' : '$totalWinAmount';
    const totalTurnoverField = isBaseCurrency ? '$baseTotalTurnover' : '$totalTurnover';
    const minRequiredTurnoverField = isBaseCurrency
      ? '$baseMinRequiredTurnover'
      : '$minRequiredTurnover';

    const [result] = await this.playerPromotionModel.aggregate([
      {
        $match: {
          promotionId: new Types.ObjectId(promotionId),
        },
      },
      {
        $group: {
          _id: null,
          bonusIssued: { $sum: totalWinAmountField },
          bonusRedeemed: {
            $sum: {
              $cond: [{ $eq: ['$bonusClaimed', true] }, totalWinAmountField, 0],
            },
          },
          totalTurnover: { $sum: totalTurnoverField },
          minRequiredTurnover: { $sum: minRequiredTurnoverField },
          uniquePlayers: { $addToSet: '$playerId' },
        },
      },
      {
        $project: {
          _id: 0,
          bonusIssued: 1,
          bonusRedeemed: 1,
          totalTurnover: 1,
          minRequiredTurnover: 1,
          uniquePlayers: { $size: '$uniquePlayers' },
        },
      },
    ]);

    const bonusIssued = result?.bonusIssued || 0;
    const bonusRedeemed = result?.bonusRedeemed || 0;
    const totalTurnover = result?.totalTurnover || 0;
    const minRequiredTurnover = result?.minRequiredTurnover || 0;
    const uniquePlayers = result?.uniquePlayers || 0;

    return {
      bonusIssued: roundToTwoDecimals(bonusIssued),
      bonusRedeemed: roundToTwoDecimals(bonusRedeemed),
      redemptionRate: calculatePercentage(bonusRedeemed, bonusIssued),
      totalTurnover: roundToTwoDecimals(totalTurnover),
      minRequiredTurnover: roundToTwoDecimals(minRequiredTurnover),
      uniquePlayers,
      avgBonusPerPlayer: roundToTwoDecimals(bonusIssued / uniquePlayers),
      avgTurnoverPerPlayer: roundToTwoDecimals(totalTurnover / uniquePlayers),
      dailyStats: [],
    };
  }
}
