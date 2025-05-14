import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  PromotionAnnouncement,
  PromotionAnnouncementDocument,
} from '../schemas/promotion-announcement.schema';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { Model } from 'mongoose';
import { ANNOUNCEMENT_NOT_FOUND_DESCRIPTION } from 'src/constants/api-messages';

@Injectable()
export class PromotionAnnouncementService {
  constructor(
    @InjectModel(PromotionAnnouncement.name)
    private readonly promotionAnnouncementModel: Model<PromotionAnnouncementDocument>,
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
    const updated = await this.promotionAnnouncementModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

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
  async findAll(): Promise<PromotionAnnouncement[]> {
    return this.promotionAnnouncementModel.find().exec();
  }

  /**
   * Finds an announcement by ID
   * @param id - The ID of the announcement to find
   * @returns The found announcement
   */
  async findById(id: string): Promise<PromotionAnnouncement> {
    const announcement = await this.promotionAnnouncementModel.findById(id).exec();
    if (!announcement) {
      throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION);
    }
    return announcement;
  }
}
