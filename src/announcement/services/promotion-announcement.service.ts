import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  PromotionAnnouncement,
  PromotionAnnouncementDocument,
} from '../schemas/promotion-announcement.schema';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { Model } from 'mongoose';
import { ANNOUNCEMENT_NOT_FOUND_DESCRIPTION } from '../../constants/api-messages';
import {
  PromotionAnnouncementFilterDto,
  PromotionAnnouncementStatus,
} from '../models/promotion-announcement-filter.dto';
import { PaginationResponse } from 'src/promotion/responses/pagination.response';
import { PromotionDocument } from 'src/promotion/schemas/promotion.schema';
import { Promotion } from '../../promotion/schemas/promotion.schema';
import { PromotionAnnouncementWithMappingsDto } from '../models/promotion-announcement-with-mapping.dto';

@Injectable()
export class PromotionAnnouncementService {
  constructor(
    @InjectModel(PromotionAnnouncement.name)
    private readonly promotionAnnouncementModel: Model<PromotionAnnouncementDocument>,

    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) {}

  /**
   * Creates a new announcement
   * @param createPromotionAnnouncementDto - The promotion announcement data
   * @returns The created promotion
   */
  async create(dto: CreatePromotionAnnouncementDto): Promise<PromotionAnnouncement> {
    const created = new this.promotionAnnouncementModel(dto);
    return created.save();
  }

  /**
   * Updates an announcement
   * @param id - The ID of the announcement to update
   * @param dto - The updated announcement data
   * @returns The updated announcement
   */
  async update(id: string, dto: UpdatePromotionAnnouncementDto): Promise<PromotionAnnouncement> {
    const updated = await this.promotionAnnouncementModel
      .findByIdAndUpdate(id, dto, {
        new: true,
      })
      .exec();

    if (!updated) {
      throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION);
    }

    return updated;
  }

  /**
   * Removes an announcement
   * @param id - The ID of the announcement to remove
   * @returns true if the announcement was removed, false otherwise
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.promotionAnnouncementModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION);
    }

    return true;
  }

  /**
   * Finds all announcements
   * @returns All announcements
   */
  async findAll(
    filterDto?: PromotionAnnouncementFilterDto,
  ): Promise<PaginationResponse<PromotionAnnouncementWithMappingsDto>> {
    console.log('filterDto', filterDto);
    const query: Record<string, any> = {};
    const now = new Date();

    const pageIndex = filterDto?.pageIndex || 1;
    const pageSize = filterDto?.pageSize || 10;
    const skip = (pageIndex - 1) * pageSize;
    if (filterDto) {
      // Filter by status (based on start and end dates)
      if (filterDto.status) {
        switch (filterDto.status) {
          case PromotionAnnouncementStatus.UP_COMING:
            query.fromDate = { $gt: now };
            break;
          case PromotionAnnouncementStatus.RUNNING:
            query.fromDate = { $lte: now };
            query.toDate = { $gt: now };
            break;
          case PromotionAnnouncementStatus.COMPLETED:
            query.toDate = { $lte: now };
            break;
        }
      }
    }
    console.log('query', query);
    // Add a computed field for status sorting
    const aggregationPipeline = [
      { $match: query },
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                {
                  // Running: startDate <= now AND endDate > now
                  case: {
                    $and: [{ $lte: ['$fromDate', now] }, { $gt: ['$toDate', now] }],
                  },
                  then: 1,
                },
                {
                  // Upcoming: startDate > now
                  case: { $gt: ['$fromDate', now] },
                  then: 2,
                },
                {
                  // Deleted/Ended: endDate <= now
                  case: { $lte: ['$toDate', now] },
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
          toDate: 1 as const,
          fromDate: 1 as const,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ];

    // Execute aggregation pipeline for items
    const items = await this.promotionAnnouncementModel.aggregate(aggregationPipeline).exec();
    const allCodes = [...new Set(items.flatMap(item => item.promotionMappings || []))];
    const promotions = await this.promotionModel
      .find({ code: { $in: allCodes } })
      .select('code operatorId') // chỉ lấy cần thiết
      .lean()
      .exec();
    const codeToOperatorMap = new Map(promotions.map(p => [p.code, p.operatorId]));
    const itemsWithMappings = items.map(item => ({
      ...item,
      mappings: (item.promotionMappings || [])
        .filter((code: string) => codeToOperatorMap.has(code))
        .map((code: string) => ({
          promotionCode: code,
          operatorId: codeToOperatorMap.get(code)!,
        })),
    }));
    // Count total documents matching the query
    const total = await this.promotionAnnouncementModel.countDocuments(query);

    return {
      items: itemsWithMappings,
      metadata: {
        total,
        pageIndex,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Finds an announcement by ID
   * @param id - The ID of the announcement to find
   * @returns The found announcement
   */
  async findById(id: string): Promise<PromotionAnnouncement> {
    const announcement = await this.promotionAnnouncementModel.findById(id).lean().exec();
    if (!announcement) {
      throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION);
    }
    return announcement;
  }

  /**
   * Finds a promotion announcement by promotion code
   * @param promotionCode - The promotion code to find the announcement for
   * @returns The found promotion announcement
   */
  async findByPromotionCode(promotionCode: string): Promise<PromotionAnnouncement> {
    const announcement = await this.promotionAnnouncementModel
      .findOne({ 'promotionMappings.promotionCode': promotionCode })
      .lean()
      .exec();

    if (!announcement) {
      throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION);
    }
    return announcement;
  }
}
