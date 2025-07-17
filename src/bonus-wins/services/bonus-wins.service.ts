import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompletePromotionDto } from 'src/promotion/models/complete-promotion.dto';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { CalculateTORequirementResponse } from '../../promotion/responses/calculate-to-requirement.response';
import { CheckTORequirementResponse } from '../../promotion/responses/check-to-requirement.response';
import { ClaimBonusWinsResponse } from '../../promotion/responses/claim-bonus-wins.response';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { UpdateTotalWinResponse } from '../../promotion/responses/update-total-win.response';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';

/**
 * Service for managing bonus wins and turnover tracking
 */
@Injectable()
export class BonusWinsService {
  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    private readonly loggerService: LoggerService,
    private readonly playerPromotionService: PlayerPromotionService,
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
      const roundedWinAmount = Math.round(winAmount * 100) / 100;
      const result = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
        },
        {
          $set: { totalWinAmount: roundedWinAmount },
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
   * Find active bonus win for TO tracking
   * Sorting priority: FIFO > Earliest expiry > Highest win amount
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @returns Active bonus win or null
   */
  private async findActiveBonusWin(
    playerId: string,
    operatorId: string,
    siteName: string,
  ): Promise<PlayerPromotionDocument | null> {
    const now = new Date();

    return this.playerPromotionModel
      .findOne({
        playerId,
        operatorId,
        siteName,
        remainingBonusItems: 0, // Promotion finished
        bonusClaimed: false, // Bonus not claimed yet
        minRequiredTurnover: { $gt: 0 }, // Has TO requirement
        startDate: { $lte: now },
        endDate: { $gt: now },
      })
      .sort({
        createdAt: 1, // FIFO - first priority
        endDate: 1, // Earliest expiry - second priority
        totalWinAmount: -1, // Highest win amount - third priority
      })
      .lean()
      .exec();
  }

  /**
   * Update total turnover for active bonus win
   * Tracks TO for all eligible games
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param betAmount Bet amount to add
   * @returns Success response with updated total turnover and remaining TO
   */
  async updateTotalTurnover(
    playerId: string,
    operatorId: string,
    siteName: string,
    betAmount: number,
  ): Promise<GetTOProgressResponse> {
    try {
      const activeBonusWin = await this.playerPromotionService.findExistingPromotion(
        playerId,
        operatorId,
        siteName,
      );

      if (!activeBonusWin) {
        return {
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          progressPercentage: 0,
          canClaim: false,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.NO_ACTIVE_BONUS_WIN.code,
          errorMessage: PLAYER_PROMOTION_ERROR_CODES.NO_ACTIVE_BONUS_WIN.message,
        };
      }

      const result = await this.playerPromotionModel.findOneAndUpdate(
        { _id: activeBonusWin._id },
        { $inc: { totalTurnover: betAmount } },
        { new: true, lean: true },
      );

      if (result) {
        return this.getTOProgress(
          playerId,
          operatorId,
          siteName,
          activeBonusWin.promotionId.toString(),
        );
      }
    } catch (error) {
      this.loggerService.error('Error in updateTotalTurnover', error.stack, {
        playerId,
        operatorId,
        siteName,
        betAmount,
        error: error.message,
      });
    }

    return {
      totalTurnover: 0,
      minRequiredTurnover: 0,
      remainingTO: 0,
      progressPercentage: 0,
      canClaim: false,
      totalWinAmount: 0,
      errorCode: PLAYER_PROMOTION_ERROR_CODES.UPDATE_TOTAL_TO_FAILED.code,
      errorMessage: PLAYER_PROMOTION_ERROR_CODES.UPDATE_TOTAL_TO_FAILED.message,
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

      if (!playerPromotion || !!playerPromotion.claimedAt) {
        return {
          success: false,
          canClaim: false,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          totalWinAmount: 0,
          ...(playerPromotion?.claimedAt
            ? PLAYER_PROMOTION_ERROR_CODES.BONUS_ALREADY_CLAIMED
            : PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND),
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

      if (!playerPromotion || !!playerPromotion.claimedAt) {
        return {
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          progressPercentage: 0,
          canClaim: false,
          totalWinAmount: 0,
          errorCode: playerPromotion?.claimedAt
            ? PLAYER_PROMOTION_ERROR_CODES.BONUS_ALREADY_CLAIMED.code
            : PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
          errorMessage: playerPromotion?.claimedAt
            ? PLAYER_PROMOTION_ERROR_CODES.BONUS_ALREADY_CLAIMED.message
            : PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.message,
        };
      }

      const { totalTurnover, minRequiredTurnover, totalWinAmount } = playerPromotion;
      const promotion = await this.promotionModel
        .findById(playerPromotion.promotionId)
        .lean()
        .exec();

      const canClaim = this.canClaimBonusWins(totalTurnover, minRequiredTurnover, totalWinAmount);

      // Calculate progress percentage (0-100) rounded to 2 decimal places
      // If no TO required (minRequiredTurnover = 0), show 100% progress
      const progressPercentage =
        minRequiredTurnover === 0
          ? 100
          : Math.round(Math.min(100, (totalTurnover / minRequiredTurnover) * 100) * 100) / 100;

      return {
        totalTurnover,
        minRequiredTurnover,
        remainingTO: Math.max(0, minRequiredTurnover - totalTurnover),
        progressPercentage,
        canClaim,
        totalWinAmount,
        claimExpirationDate: promotion?.claimExpirationDate,
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
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        progressPercentage: 0,
        canClaim: false,
        totalWinAmount: 0,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.STREAM_PROCESSING_ERROR.code,
        errorMessage: PLAYER_PROMOTION_ERROR_CODES.STREAM_PROCESSING_ERROR.message,
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
      const toRequirementResult = await this.checkTORequirement(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      if (toRequirementResult.errorCode) {
        return {
          claimedAmount: 0,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          totalWinAmount: 0,
          errorCode: toRequirementResult.errorCode,
        };
      }

      if (!toRequirementResult.canClaim) {
        return {
          claimedAmount: 0,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.BONUS_WIN_CLAIM_FAILED.code,
          errorMessage: PLAYER_PROMOTION_ERROR_CODES.BONUS_WIN_CLAIM_FAILED.message,
        };
      }

      const updatedPromotion = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
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
        const { totalTurnover, minRequiredTurnover, totalWinAmount } = updatedPromotion;
        return {
          claimedAmount: totalWinAmount,
          totalTurnover,
          minRequiredTurnover,
          totalWinAmount,
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
      claimedAmount: 0,
      totalTurnover: 0,
      minRequiredTurnover: 0,
      totalWinAmount: 0,
      errorCode: PLAYER_PROMOTION_ERROR_CODES.BONUS_WIN_CLAIM_FAILED.code,
      errorMessage: PLAYER_PROMOTION_ERROR_CODES.BONUS_WIN_CLAIM_FAILED.message,
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

  /**
   * Complete a promotion by setting isCompleted to true
   * @param completeDto Complete promotion data
   * @returns Player promotion response or null if not found
   */
  async completePromotion(completeDto: CompletePromotionDto): Promise<GetTOProgressResponse> {
    const { operatorId, siteName, playerId, promotionId } = completeDto;

    const result = await this.playerPromotionModel.findOneAndUpdate(
      {
        operatorId,
        playerId,
        promotionId,
        siteName,
      },
      {
        $set: {
          isCompleted: true,
        },
      },
      {
        new: true,
        lean: true,
      },
    );

    if (result) {
      return this.getTOProgress(playerId, operatorId, siteName, promotionId);
    }

    return {
      totalTurnover: 0,
      minRequiredTurnover: 0,
      remainingTO: 0,
      progressPercentage: 0,
      canClaim: false,
      totalWinAmount: 0,
      errorCode: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
      errorMessage: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.message,
    };
  }
}
