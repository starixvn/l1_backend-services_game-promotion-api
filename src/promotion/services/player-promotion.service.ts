import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { PlayerDto } from '../models/player.dto';
import { EligiblePromotion } from '../responses/eligible-promotion.response';

@Injectable()
export class PlayerPromotionService {
  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) {}

  async hasAvailablePromotions(playerDto: PlayerDto): Promise<EligiblePromotion[]> {
    const { operatorId, siteName, playerId, currencyGroup } = playerDto;

    const runningPromotions = await this.getRunningPromotions(
      operatorId,
      siteName,
      playerId,
      currencyGroup,
    );
    const hasPromotion = await this.hasCurrentPromotion(playerId, operatorId, siteName);

    if (hasPromotion) {
      return [];
    }
    return runningPromotions.map(promotion => {
      const currencyGroup = promotion.currencyGroups[0];

      return {
        _id: promotion._id,
        name: promotion.name,
        code: promotion.code,
        bonusItemCount: promotion.bonusItemCount,
        currencyGroup,
      };
    });
  }

  private async getRunningPromotions(
    operatorId: string,
    siteName: string,
    playerId: string,
    currencyGroup: string,
  ): Promise<PromotionDocument[]> {
    const now = new Date();
    return this.promotionModel
      .find({
        operatorId,
        startDate: { $lte: now },
        endDate: { $gt: now },
        currencyGroups: { $in: [currencyGroup] },
        $and: [
          {
            $or: [{ offeredSiteNames: { $size: 0 } }, { offeredSiteNames: siteName }],
          },
          {
            $or: [{ offeredPlayerIds: { $size: 0 } }, { offeredPlayerIds: playerId }],
          },
        ],
      })
      .lean()
      .exec();
  }

  private async hasCurrentPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
  ): Promise<boolean> {
    const existingPromotion = await this.playerPromotionModel
      .findOne({
        playerId,
        operatorId,
        siteName,
        remainingBonusItems: { $gt: 0 },
      })
      .lean()
      .exec();

    return !!existingPromotion;
  }

  async assignPromotionToPlayer(
    playerId: string,
    promotionId: string,
    operatorId: string,
    siteName: string,
    currencyGroup: string,
  ): Promise<PlayerPromotion> {
    const promotion = await this.getPromotionById(promotionId);

    return this.createPlayerPromotion(playerId, operatorId, siteName, promotion, currencyGroup);
  }

  private async getPromotionById(promotionId: string): Promise<PromotionDocument> {
    const promotion = await this.promotionModel.findById(promotionId).exec();

    if (!promotion) {
      throw new Error('Promotion not found');
    }

    return promotion;
  }

  private async createPlayerPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotion: PromotionDocument,
    currencyGroup: string,
  ): Promise<PlayerPromotion> {
    const playerPromotion = new this.playerPromotionModel({
      playerId,
      operatorId,
      siteName,
      promotionId: promotion._id,
      promotionCode: promotion.code,
      currencyGroup,
      remainingBonusItems: promotion.bonusItemCount,
      lastUsedDate: null,
    });

    return playerPromotion.save();
  }
}
