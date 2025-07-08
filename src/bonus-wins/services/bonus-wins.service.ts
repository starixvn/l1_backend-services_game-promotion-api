import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { UpdateTotalWinResponse } from '../../promotion/responses/update-total-win.response';
import { UpdateTotalTurnoverResponse } from '../../promotion/responses/update-total-turnover.response';
import { CalculateTORequirementResponse } from '../../promotion/responses/calculate-to-requirement.response';
import { LoggerService } from '../../core/logger/logger.service';
import { CheckTORequirementResponse } from '../../promotion/responses/check-to-requirement.response';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { ClaimBonusWinsResponse } from '../../promotion/responses/claim-bonus-wins.response';

/**
 * Service for managing bonus wins and turnover tracking
 */
@Injectable()
export class BonusWinsService {
  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Update total win amount for a player promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @param winAmount Win amount to add
   * @returns Success response with updated total win amount
   */
  async updateTotalWinAmount(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    winAmount: number,
  ): Promise<UpdateTotalWinResponse> {
    try {
      const result = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
        },
        {
          $set: { totalWinAmount: winAmount },
        },
        {
          new: true,
          lean: true,
        },
      );

      if (result) {
        return {
          success: true,
          totalWinAmount: result.totalWinAmount,
          remainingBonusItems: result.remainingBonusItems,
        };
      }
    } catch (error) {
      this.loggerService.error('Error in updateTotalWinAmount', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        winAmount,
        error: error.message,
      });
    }

    return {
      success: false,
      totalWinAmount: 0,
      remainingBonusItems: 0,
      ...PLAYER_PROMOTION_ERROR_CODES.UPDATE_TOTAL_WIN_FAILED,
    };
  }

  /**
   * Update total turnover for a player promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @param betAmount Bet amount to add
   * @returns Success response with updated total turnover and remaining TO
   */
  async updateTotalTurnover(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    betAmount: number,
  ): Promise<UpdateTotalTurnoverResponse> {
    try {
      const result = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
        },
        {
          $inc: { totalTurnover: betAmount },
        },
        {
          new: true,
          lean: true,
        },
      );

      if (result) {
        const remainingTO = Math.max(0, result.minRequiredTurnover - result.totalTurnover);
        return {
          success: true,
          totalTurnover: result.totalTurnover,
          remainingTO,
        };
      }
    } catch (error) {
      this.loggerService.error('Error in updateTotalTurnover', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        betAmount,
        error: error.message,
      });
    }

    return {
      success: false,
      totalTurnover: 0,
      remainingTO: 0,
      ...PLAYER_PROMOTION_ERROR_CODES.UPDATE_TOTAL_TO_FAILED,
    };
  }

  /**
   * Calculate TO requirement for a player promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns Success response with calculated TO requirement
   */
  async calculateTORequirement(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<CalculateTORequirementResponse> {
    try {
      const playerPromotion = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
          remainingBonusItems: 0,
          turnoverMultiplier: { $gte: 2.0, $ne: null },
        },
        [
          {
            $set: {
              minRequiredTurnover: {
                $multiply: ['$totalWinAmount', '$turnoverMultiplier'],
              },
            },
          },
        ],
        {
          new: true,
          lean: true,
        },
      );

      if (playerPromotion) {
        const { totalWinAmount, turnoverMultiplier, minRequiredTurnover } = playerPromotion;

        return {
          success: true,
          minRequiredTurnover,
          totalWinAmount,
          turnoverMultiplier,
        };
      }
    } catch (error) {
      this.loggerService.error('Error in calculateTORequirement', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });
    }

    return {
      success: false,
      minRequiredTurnover: 0,
      totalWinAmount: 0,
      turnoverMultiplier: 0,
      ...PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND,
    };
  }

  /**
   * Find player promotion by promotion ID
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns Player promotion document or null
   */
  async findByPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<PlayerPromotionDocument | null> {
    return this.playerPromotionModel
      .findOne({
        playerId,
        operatorId,
        siteName,
        promotionId,
      })
      .lean()
      .exec();
  }

  /**
   * Check if TO requirement is met for bonus claim
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns TO requirement validation result
   */
  async checkTORequirement(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<CheckTORequirementResponse> {
    try {
      const playerPromotion = await this.findByPromotion(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      if (!playerPromotion) {
        return {
          success: false,
          canClaim: false,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          totalWinAmount: 0,
          ...PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND,
        };
      }

      const { totalTurnover, minRequiredTurnover, totalWinAmount } = playerPromotion;

      const canClaim = this.canClaimBonusWins(totalTurnover, minRequiredTurnover, totalWinAmount);

      return {
        success: true,
        canClaim,
        totalTurnover,
        minRequiredTurnover,
        remainingTO: Math.max(0, minRequiredTurnover - totalTurnover),
        totalWinAmount,
      };
    } catch (error) {
      this.loggerService.error('Error in checkTORequirement', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });

      return {
        success: false,
        canClaim: false,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        totalWinAmount: 0,
        ...PLAYER_PROMOTION_ERROR_CODES.STREAM_PROCESSING_ERROR,
      };
    }
  }

  /**
   * Get TO progress status for a player promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns TO progress status
   */
  async getTOProgress(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<GetTOProgressResponse> {
    try {
      const playerPromotion = await this.findByPromotion(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      if (!playerPromotion) {
        return {
          success: false,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          progressPercentage: 0,
          canClaim: false,
          totalWinAmount: 0,
          ...PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND,
        };
      }

      const { totalTurnover, minRequiredTurnover, totalWinAmount } = playerPromotion;

      const canClaim = this.canClaimBonusWins(totalTurnover, minRequiredTurnover, totalWinAmount);

      // Calculate progress percentage (0-100)
      // If no TO required (minRequiredTurnover = 0), show 100% progress
      const progressPercentage =
        minRequiredTurnover === 0
          ? 100
          : Math.min(100, (totalTurnover / minRequiredTurnover) * 100);

      return {
        success: true,
        totalTurnover,
        minRequiredTurnover,
        remainingTO: Math.max(0, minRequiredTurnover - totalTurnover),
        progressPercentage,
        canClaim,
        totalWinAmount,
      };
    } catch (error) {
      this.loggerService.error('Error in getTOProgress', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });

      return {
        success: false,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        progressPercentage: 0,
        canClaim: false,
        totalWinAmount: 0,
        ...PLAYER_PROMOTION_ERROR_CODES.STREAM_PROCESSING_ERROR,
      };
    }
  }

  /**
   * Claim bonus wins for a player
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns Claim bonus wins response
   */
  async claimBonusWins(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<ClaimBonusWinsResponse> {
    try {
      // Single atomic operation with all conditions in the query
      const updatedPromotion = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
          remainingBonusItems: 0,
          totalTurnover: { $gte: '$minRequiredTurnover' },
          minRequiredTurnover: { $gt: 0 },
          totalWinAmount: { $gt: 0 },
          bonusClaimed: { $ne: true },
        },
        {
          $set: {
            bonusClaimed: true,
            claimedAt: new Date(),
          },
        },
        {
          new: true,
          lean: true,
        },
      );

      if (updatedPromotion) {
        return {
          success: true,
          claimedAmount: updatedPromotion.totalWinAmount,
          totalTurnover: updatedPromotion.totalTurnover,
          minRequiredTurnover: updatedPromotion.minRequiredTurnover,
          totalWinAmount: updatedPromotion.totalWinAmount,
        };
      }
    } catch (error) {
      this.loggerService.error('Error in claimBonusWins', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });
    }

    return {
      success: false,
      claimedAmount: 0,
      totalTurnover: 0,
      minRequiredTurnover: 0,
      totalWinAmount: 0,
      ...PLAYER_PROMOTION_ERROR_CODES.BONUS_WIN_CLAIM_FAILED,
    };
  }

  /**
   * Calculate if player can claim bonus wins
   * @param totalTurnover Current total turnover
   * @param minRequiredTurnover Minimum required turnover
   * @param totalWinAmount Total win amount from bonus items
   * @returns Whether player can claim bonus wins
   */
  private canClaimBonusWins(
    totalTurnover: number,
    minRequiredTurnover: number,
    totalWinAmount: number,
  ): boolean {
    // When minRequiredTurnover = 0, players cannot claim (security measure)
    return minRequiredTurnover > 0 && totalTurnover >= minRequiredTurnover && totalWinAmount > 0;
  }
}
