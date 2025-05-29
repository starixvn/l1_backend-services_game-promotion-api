import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';
import { PaginationResponse } from '../responses/pagination.response';

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
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
                  $in: [
                    '$$promotionCode',
                    {
                      $map: {
                        input: '$promotionMappings',
                        as: 'mapping',
                        in: '$$mapping.promotionCode',
                      },
                    },
                  ],
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
   * @param operatorId - Operator ID to filter by (required for performance)
   * @returns Array of running promotions sorted by priority rules
   */
  async getRunningPromotions(operatorId: string): Promise<Promotion[]> {
    const now = new Date();
    const query: Record<string, any> = {
      startDate: { $lte: now },
      endDate: { $gt: now },
      operatorId: operatorId,
    };

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
                  $in: [
                    '$$promotionCode',
                    {
                      $map: {
                        input: '$promotionMappings',
                        as: 'mapping',
                        in: '$$mapping.promotionCode',
                      },
                    },
                  ],
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
}
