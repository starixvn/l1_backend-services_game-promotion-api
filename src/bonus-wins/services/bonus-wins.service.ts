import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompletePromotionDto } from 'src/promotion/models/complete-promotion.dto';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { LogBuilder } from '../../core/action-log/utils/log-builder';
import { ActionLogService } from '../../core/action-log/services/action-log.service';
import { roundToFourDecimals } from '../../core/utils/number.utils';
import { CalculateTORequirementResponse } from '../../promotion/responses/calculate-to-requirement.response';
import { ClaimBonusWinsResponse } from '../../promotion/responses/claim-bonus-wins.response';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { UpdateTotalWinResponse } from '../../promotion/responses/update-total-win.response';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';
import { PromotionTicketService } from '../../promotion-ticket/services/promotion-ticket.service';

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
    private readonly actionLogService: ActionLogService,
    private readonly playerPromotionService: PlayerPromotionService,
    @Inject(forwardRef(() => PromotionTicketService))
    private readonly promotionTicketService: PromotionTicketService,
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
    baseTotalWinAmount: number,
  ): Promise<UpdateTotalWinResponse> {
    try {
      const roundedWinAmount = Math.round(winAmount * 100) / 100;
      const result = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
          promotionId,
        },
        {
          $set: { totalWinAmount: roundedWinAmount, baseTotalWinAmount },
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
    gameId: number,
    baseBetAmount: number,
  ): Promise<GetTOProgressResponse> {
    try {
      const activeBonusWin = await this.playerPromotionService.findExistingPromotion(
        playerId,
        operatorId,
        siteName,
        gameId,
      );

      if (!activeBonusWin || !activeBonusWin.isCompleted) {
        return {
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          progressPercentage: 0,
          canClaim: false,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.NO_ACTIVE_BONUS_WIN.code,
        };
      }

      const result = await this.playerPromotionModel.findOneAndUpdate(
        { _id: activeBonusWin._id },
        { $inc: { totalTurnover: betAmount, baseTotalTurnover: baseBetAmount } },
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
          siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
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
              baseMinRequiredTurnover: {
                $multiply: ['$baseTotalWinAmount', '$turnoverMultiplier'],
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
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
        promotionId,
      })
      .lean()
      .exec();
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
        };
      }

      const { totalTurnover, minRequiredTurnover, totalWinAmount } = playerPromotion;
      const promotion = await this.promotionModel
        .findById(playerPromotion.promotionId)
        .lean()
        .exec();

      if (promotion && promotion.claimExpirationDate < new Date()) {
        return {
          totalTurnover: 0,
          minRequiredTurnover: 0,
          remainingTO: 0,
          progressPercentage: 0,
          canClaim: false,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIMING_EXPIRED.code,
        };
      }

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
      const toRequirementResult = await this.getTOProgress(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      if (toRequirementResult.errorCode) {
        // Log error: Failed to get TO progress
        const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_GET_TO_PROGRESS_FAILED;
        await LogBuilder.create(
          operatorId,
          'claim-bonus-win',
          this.loggerService,
          this.actionLogService,
        )
          .withRequest({
            playerId,
            siteName,
            promotionId,
          })
          .withError(
            toRequirementResult.errorCode,
            toRequirementResult.errorMessage || errorConfig.message,
            errorConfig.description,
            {
              totalTurnover: toRequirementResult.totalTurnover,
              minRequiredTurnover: toRequirementResult.minRequiredTurnover,
              progressPercentage: toRequirementResult.progressPercentage,
              totalWinAmount: toRequirementResult.totalWinAmount,
              remainingTO: toRequirementResult.remainingTO,
              canClaim: toRequirementResult.canClaim,
              claimExpirationDate: toRequirementResult.claimExpirationDate,
            },
          )
          .send();

        return {
          claimedAmount: 0,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          totalWinAmount: 0,
          errorCode: toRequirementResult.errorCode,
        };
      }

      const isClaimable = await this.isClaimable(
        playerId,
        operatorId,
        siteName,
        promotionId,
        toRequirementResult.totalTurnover,
      );

      if (!toRequirementResult.canClaim) {
        // Log error: TO requirement not met
        const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET;
        await LogBuilder.create(
          operatorId,
          'claim-bonus-win',
          this.loggerService,
          this.actionLogService,
        )
          .withRequest({
            playerId,
            siteName,
            promotionId,
          })
          .withError(errorConfig.code, errorConfig.message, errorConfig.description, {
            totalTurnover: toRequirementResult.totalTurnover,
            minRequiredTurnover: toRequirementResult.minRequiredTurnover,
            progressPercentage: toRequirementResult.progressPercentage,
            totalWinAmount: toRequirementResult.totalWinAmount,
            remainingTO: toRequirementResult.remainingTO,
            canClaim: toRequirementResult.canClaim,
            claimExpirationDate: toRequirementResult.claimExpirationDate,
          })
          .send();

        return {
          claimedAmount: 0,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code,
        };
      }

      if (!isClaimable) {
        // Log error: Claim verification failed
        const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED;
        await LogBuilder.create(
          operatorId,
          'claim-bonus-win',
          this.loggerService,
          this.actionLogService,
        )
          .withRequest({
            playerId,
            siteName,
            promotionId,
          })
          .withError(errorConfig.code, errorConfig.message, errorConfig.description, {
            totalTurnover: toRequirementResult.totalTurnover,
            minRequiredTurnover: toRequirementResult.minRequiredTurnover,
            progressPercentage: toRequirementResult.progressPercentage,
            totalWinAmount: toRequirementResult.totalWinAmount,
            remainingTO: toRequirementResult.remainingTO,
            canClaim: toRequirementResult.canClaim,
            claimExpirationDate: toRequirementResult.claimExpirationDate,
          })
          .send();

        return {
          claimedAmount: 0,
          totalTurnover: 0,
          minRequiredTurnover: 0,
          totalWinAmount: 0,
          errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.code,
        };
      }

      const updatedPromotion = await this.playerPromotionModel.findOneAndUpdate(
        {
          playerId,
          operatorId,
          siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
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

        // Log success
        await LogBuilder.create(
          operatorId,
          'claim-bonus-win',
          this.loggerService,
          this.actionLogService,
        )
          .withRequest({
            playerId,
            siteName,
            promotionId,
          })
          .withResponse({
            claimedAmount: totalWinAmount,
            totalTurnover,
            minRequiredTurnover,
            totalWinAmount,
            progressPercentage: toRequirementResult.progressPercentage,
            remainingTO: toRequirementResult.remainingTO,
            canClaim: toRequirementResult.canClaim,
            claimExpirationDate: toRequirementResult.claimExpirationDate,
          })
          .send();

        return {
          claimedAmount: totalWinAmount,
          totalTurnover,
          minRequiredTurnover,
          totalWinAmount,
        };
      }

      // Log error: Update failed (promotion not found or already claimed)
      const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED;
      await LogBuilder.create(
        operatorId,
        'claim-bonus-win',
        this.loggerService,
        this.actionLogService,
      )
        .withRequest({
          playerId,
          siteName,
          promotionId,
        })
        .withError(errorConfig.code, errorConfig.message, errorConfig.description, {
          totalTurnover: toRequirementResult.totalTurnover,
          minRequiredTurnover: toRequirementResult.minRequiredTurnover,
          progressPercentage: toRequirementResult.progressPercentage,
          totalWinAmount: toRequirementResult.totalWinAmount,
          remainingTO: toRequirementResult.remainingTO,
          canClaim: toRequirementResult.canClaim,
          claimExpirationDate: toRequirementResult.claimExpirationDate,
        })
        .send();

      return {
        claimedAmount: 0,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        totalWinAmount: 0,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.code,
      };
    } catch (error) {
      this.loggerService.error('Error in claimBonusWins', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });

      // Log unexpected error
      const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR;
      await LogBuilder.create(
        operatorId,
        'claim-bonus-win',
        this.loggerService,
        this.actionLogService,
      )
        .withRequest({
          playerId,
          siteName,
          promotionId,
        })
        .withError(errorConfig.code, errorConfig.message, error.stack || error.message)
        .send();

      return {
        claimedAmount: 0,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        totalWinAmount: 0,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code,
      };
    }
  }

  private async isClaimable(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    totalTurnover: number,
  ): Promise<boolean> {
    const promotion = await this.promotionModel.findById(promotionId).lean().exec();

    if (!promotion) {
      this.loggerService.error(
        `isClaimable failed: Promotion not found in database - Player: ${playerId}`,
        undefined,
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
        },
      );
      return false;
    }

    const actualWinAmount = await this.promotionTicketService.calculateTotalWin({
      playerId,
      operatorId,
      siteName,
      promotionId,
    });

    const minRequiredTurnover = roundToFourDecimals(
      actualWinAmount.totalWinAmount * promotion.minTurnoverMultiplier,
    );

    const canClaim = this.canClaimBonusWins(
      totalTurnover,
      minRequiredTurnover,
      roundToFourDecimals(actualWinAmount.totalWinAmount),
    );

    if (!canClaim) {
      this.loggerService.warn(
        `isClaimable failed: canClaimBonusWins check failed - Player: ${playerId}`,
        {
          playerId,
          operatorId,
          siteName,
          promotionId,
          totalTurnover,
          minRequiredTurnover,
          totalWinAmount: actualWinAmount.totalWinAmount,
          turnoverMultiplier: promotion.minTurnoverMultiplier,
          reasons: {
            minRequiredTurnoverInvalid: minRequiredTurnover <= 0,
            turnoverNotMet: totalTurnover < minRequiredTurnover,
            noWinAmount: actualWinAmount.totalWinAmount <= 0,
          },
        },
      );
    }

    return canClaim;
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
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
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
    };
  }
}
