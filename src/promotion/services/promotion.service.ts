import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument, PromotionExpiryDocument } from '../schemas/promotion.schema';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';
import { PaginationResponse } from '../responses/pagination.response';
import {
  PromotionTicket,
  PromotionTicketDocument,
} from '../../promotion-ticket/schemas/promotion-ticket.schema';

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    @InjectModel(PromotionTicket.name)
    private readonly promotionTicketModel: Model<PromotionTicketDocument>,
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
    const pageSize = filterDto?.pageSize || 10;
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

    // Get promotions with pagination and sorting
    const promotions = await this.promotionModel
      .find(query)
      .sort({ endDate: 1, startDate: 1, _id: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    // Get all promotion codes that are mapped to announcements with their titles
    const announcementMappings = await this.promotionModel.db
      .collection('promotion_announcements')
      .find({})
      .project({ promotionMappings: 1, 'promotionTitle.en-US': 1 })
      .toArray();

    // Create a map for quick lookup
    const announcementMap = new Map<string, string>();
    announcementMappings.forEach((announcement: any) => {
      announcement.promotionMappings?.forEach((code: string) => {
        announcementMap.set(code, announcement.promotionTitle?.['en-US'] || '');
      });
    });

    // Add announcementTitle and statusOrder to each promotion
    const items = promotions.map(promotion => {
      const announcementTitle = announcementMap.get(promotion.code) || '';

      // Calculate status order
      let statusOrder = 4; // default
      if (promotion.startDate <= now && promotion.endDate > now) {
        statusOrder = 1; // RUNNING
      } else if (promotion.startDate > now) {
        statusOrder = 2; // NOT_STARTED
      } else if (promotion.endDate <= now) {
        statusOrder = 3; // EXPIRED
      }

      return {
        ...promotion,
        announcementTitle,
        statusOrder,
      };
    });

    // Sort by statusOrder, endDate, startDate
    items.sort((a, b) => {
      if (a.statusOrder !== b.statusOrder) {
        return a.statusOrder - b.statusOrder;
      }
      if (a.endDate !== b.endDate) {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

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
    const existing = await this.promotionModel.exists({ code });
    return !!existing;
  }

  /**
   * Gets promotions that are NOT_STARTED and not mapped to any announcement
   * @returns Array of unmapped NOT_STARTED promotions
   */
  async getUnmappedNotStartedPromotions(): Promise<Promotion[]> {
    const now = new Date();

    // Get all NOT_STARTED promotions
    const notStartedPromotions = await this.promotionModel
      .find({ startDate: { $gt: now } })
      .sort({ startDate: 1 })
      .lean()
      .exec();

    // Get all promotion codes that are mapped to announcements
    const mappedPromotionCodes = await this.promotionModel.db
      .collection('promotion_announcements')
      .distinct('promotionMappings');

    // Filter out promotions that are already mapped
    const unmappedPromotions = notStartedPromotions.filter(
      promotion => !mappedPromotionCodes.includes(promotion.code),
    );

    return unmappedPromotions;
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
      endDate: { $lt: now },
    };

    // Add gameId filter if provided
    if (gameId) {
      query.gameIds = { $in: [parseInt(gameId)] };
    }

    const promotionExpirys = (await this.promotionModel
      .find(query, null, { sort: { endDate: 1, _id: 1 }, lean: true })
      .exec()) as unknown as PromotionExpiryDocument[];

    for (const promotion of promotionExpirys) {
      const matchPromotionStage = {
        $match: {
          promotionId: promotion._id.toString(),
        },
      };

      const lookupPlayerPromotionStage = {
        $lookup: {
          from: 'game_player_promotions',
          localField: 'playerId',
          foreignField: 'playerId',
          as: 'playerPromotion',
        },
      };

      const filterActivePlayersStage = {
        $match: {
          $or: [
            // Include players who don't have a promotion record yet
            { playerPromotion: { $size: 0 } },
            // Include players who still have remaining bonus items and match the promotion
            {
              $and: [
                { 'playerPromotion.remainingBonusItems': { $gt: 0 } },
                { 'playerPromotion.promotionId': promotion._id.toString() },
              ],
            },
          ],
        },
      };

      const groupByPlayerStage = {
        $group: {
          _id: '$playerId',
          totalWin: { $sum: '$winAmount' },
        },
      };

      const projectFinalStage = {
        $project: {
          playerId: '$_id',
          totalWin: 1,
          _id: 0,
        },
      };

      const playerStats = await this.promotionTicketModel
        .aggregate([
          matchPromotionStage,
          lookupPlayerPromotionStage,
          filterActivePlayersStage,
          groupByPlayerStage,
          projectFinalStage,
        ])
        .exec();
      promotion.players = playerStats;
    }

    return promotionExpirys;
  }
}
