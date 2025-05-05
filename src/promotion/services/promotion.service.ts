import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionFilterDto, PromotionStatus } from '../models/promotion-filter.dto';

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
  async findAll(filterDto?: PromotionFilterDto): Promise<Promotion[]> {
    const query: Record<string, any> = {};
    const now = new Date();

    if (filterDto) {
      // Filter by operator IDs
      if (filterDto.operatorIds && filterDto.operatorIds.length > 0) {
        query.operatorId = { $in: filterDto.operatorIds };
      }

      // Filter by promotion code
      if (filterDto.code) {
        query.code = filterDto.code;
      }

      // Filter by status (based on start and end dates)
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

    // Return promotions without priority sorting
    return this.promotionModel.find(query).exec();
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
      operatorId: operatorId, // Always filter by operator ID for performance
    };

    const promotions = await this.promotionModel.find(query).exec();

    // Convert to array if needed and sort promotions based on priority rules
    return this.prioritizePromotions(
      Array.isArray(promotions) ? promotions : Array.from(promotions),
    );
  }

  /**
   * Sorts promotions according to priority rules:
   * 1. For same start/end dates: earlier creation date first (by ID)
   * 2. For all other cases: earliest end date first
   *
   * @param promotions - Array of promotions to sort
   * @returns Sorted array of promotions
   */
  private prioritizePromotions(promotions: Promotion[]): Promotion[] {
    // Ensure we're working with an array
    if (!Array.isArray(promotions)) {
      return [];
    }

    // Create a copy of the array to avoid modifying the original
    return [...promotions].sort((a, b) => {
      try {
        // Safely get timestamps - using a try-catch to handle any date conversion issues
        const aStartTime = this.getDateTimestamp(a.startDate);
        const bStartTime = this.getDateTimestamp(b.startDate);
        const aEndTime = this.getDateTimestamp(a.endDate);
        const bEndTime = this.getDateTimestamp(b.endDate);

        // Case 1: Same start and end dates - sort by creation date (based on ID)
        if (aStartTime === bStartTime && aEndTime === bEndTime) {
          // Cast to any to access the _id property that exists in MongoDB documents
          const docA = a as any;
          const docB = b as any;

          // Handle case where _id might not exist or not be a string
          if (!docA._id || !docB._id) {
            return 0;
          }

          return docA._id.toString().localeCompare(docB._id.toString());
        }

        // Case 2: All other cases - sort by earliest end date
        return aEndTime - bEndTime;
      } catch (error) {
        // If there's an error processing dates, don't change the order
        console.error('Error sorting promotions:', error);
        return 0;
      }
    });
  }

  /**
   * Safely converts a date value to a timestamp number
   * @param date - Date object, string, or number
   * @returns Timestamp number for comparison
   */
  private getDateTimestamp(date: Date | string | number): number {
    if (!date) {
      return 0;
    }

    try {
      if (date instanceof Date) {
        return date.getTime();
      }

      return new Date(date).getTime();
    } catch (error) {
      console.error('Error converting date to timestamp:', error);
      return 0;
    }
  }

  /**
   * Finds a promotion by ID
   * @param id - The promotion ID
   * @returns The found promotion or null
   */
  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findById(id).exec();
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
    // If name is updated, update code too
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
}
