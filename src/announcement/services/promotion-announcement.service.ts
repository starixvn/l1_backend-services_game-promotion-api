import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  PromotionAnnouncement,
  PromotionAnnouncementDocument,
} from '../schemas/promotion-announcement.schema';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { Model } from 'mongoose';

@Injectable()
export class PromotionAnnouncementService {
  constructor(
    @InjectModel(PromotionAnnouncement.name)
    private readonly promotionAnnouncementModel: Model<PromotionAnnouncementDocument>,
  ) {}

  async create(dto: CreatePromotionAnnouncementDto): Promise<PromotionAnnouncement> {
    const created = new this.promotionAnnouncementModel(dto);
    return created.save();
  }

  async update(id: string, dto: UpdatePromotionAnnouncementDto): Promise<PromotionAnnouncement> {
    const updated = await this.promotionAnnouncementModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException('Promotion Announcement not found');
    }

    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.promotionAnnouncementModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Promotion Announcement not found');
    }

    return true;
  }
}
