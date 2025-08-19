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
import { PromotionSummaryDto } from '../models/promotion-summary.dto';
import { PromotionSummaryResponse } from '../responses/summary-promotion.response';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { PROMOTION_NOT_FOUND_DESCRIPTION } from '../../constants/api-messages';

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

  private getPromotionStatus(startDate: Date, endDate: Date): PromotionStatus {
    const now = new Date();

    if (now < startDate) {
      return PromotionStatus.NOT_STARTED;
    }

    if (now > endDate) {
      return PromotionStatus.ENDED;
    }

    return PromotionStatus.RUNNING;
  }

  /**
   * Get promotion summary statistics
   * @param summaryDto - Summary parameters
   * @returns Promotion summary data
   */
  async getPromotionSummary(summaryDto: PromotionSummaryDto): Promise<PromotionSummaryResponse> {
    const { operatorId, promotionId, siteName } = summaryDto;
    const promotion = await this.promotionModel.findById(promotionId).lean();

    if (!promotion) {
      throw new NotFoundException(PROMOTION_NOT_FOUND_DESCRIPTION);
    }

    const status = this.getPromotionStatus(promotion.startDate, promotion.endDate);
    const [result] = await this.playerPromotionModel.aggregate([
      {
        $match: {
          promotionId: new Types.ObjectId(promotionId),
          operatorId,
          siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
        },
      },
      {
        $group: {
          _id: null,
          bonusRedeemed: {
            $sum: {
              $cond: [{ $eq: ['$bonusClaimed', true] }, '$baseTotalWinAmount', 0],
            },
          },
          totalTurnover: { $sum: '$baseTotalTurnover' },
          minRequiredTurnover: { $sum: '$baseMinRequiredTurnover' },
          uniquePlayers: { $addToSet: '$playerId' },
        },
      },
      {
        $project: {
          _id: 0,
          bonusRedeemed: 1,
          totalTurnover: 1,
          minRequiredTurnover: 1,
          uniquePlayers: { $size: '$uniquePlayers' },
        },
      },
    ]);
    return {
      status,
      bonusRedeemed: result?.bonusRedeemed || 0,
      totalTurnover: result?.totalTurnover || 0,
      minRequiredTurnover: result?.minRequiredTurnover || 0,
      uniquePlayers: result?.uniquePlayers || 0,
    };
  }
}
