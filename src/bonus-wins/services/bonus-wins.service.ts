import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
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
import { ManualClaimBonusWinsResponse } from '../../promotion/responses/manual-claim-bonus-wins.response';
import { AwardAPIService } from './award-api.service';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';
import { PromotionTicketService } from '../../promotion-ticket/services/promotion-ticket.service';
import {
  PlayerFinishedPromotion,
  PlayerFinishedPromotionDocument,
} from '../../promotion/schemas/player-finished-promotion.schema';

/**
 * Service for managing bonus wins and turnover tracking
 */
@Injectable()
export class BonusWinsService {
  private readonly CLAIM_BONUS_WIN_ACTION = 'claim-bonus-win';

  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    @InjectModel(PlayerFinishedPromotion.name)
    private readonly playerFinishedPromotionModel: Model<PlayerFinishedPromotionDocument>,
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    private readonly loggerService: LoggerService,
    private readonly actionLogService: ActionLogService,
    private readonly playerPromotionService: PlayerPromotionService,
    @Inject(forwardRef(() => PromotionTicketService))
    private readonly promotionTicketService: PromotionTicketService,
    private readonly awardAPIService: AwardAPIService,
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
                $round: [{ $multiply: ['$totalWinAmount', '$turnoverMultiplier'] }, 2],
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
    isManualClaim = false,
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

      if (promotion && promotion.claimExpirationDate < new Date() && !isManualClaim) {
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
      const actualWinAmount = await this.promotionTicketService.calculateTotalWin({
        playerId,
        operatorId,
        siteName,
        promotionId,
        playerPromotionId: playerPromotion._id,
      });

      const canClaim = this.canClaimBonusWins(
        totalTurnover,
        minRequiredTurnover,
        totalWinAmount,
        actualWinAmount.totalWinAmount,
      );

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
    isManualClaim = false,
  ): Promise<ClaimBonusWinsResponse> {
    try {
      // Step 1: Get and validate TO progress
      const toProgress = await this.getTOProgress(
        playerId,
        operatorId,
        siteName,
        promotionId,
        isManualClaim,
      );

      const toProgressError = await this.validateTOProgress(
        playerId,
        operatorId,
        siteName,
        promotionId,
        toProgress,
      );
      if (toProgressError) {
        return toProgressError;
      }

      // Step 2: Get and validate player promotion
      const playerPromotion = await this.validatePlayerPromotion(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );
      if (!playerPromotion) {
        return this.createErrorResponse(
          PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
        );
      }

      // Step 3: Validate claim conditions
      const claimError = await this.validateClaimConditions(
        playerId,
        operatorId,
        siteName,
        promotionId,
        playerPromotion,
        toProgress,
      );
      if (claimError) {
        return claimError;
      }
      // Step 4: Process the claim
      const claimResult = await this.executeClaimProcess(
        playerId,
        operatorId,
        siteName,
        promotionId,
        playerPromotion,
        toProgress,
      );
      if (claimResult.errorCode) {
        return claimResult;
      }

      // Step 5: Log success and return
      await this.logClaimSuccess(playerId, operatorId, siteName, promotionId, toProgress);

      return claimResult;
    } catch (error) {
      return this.handleClaimUnexpectedError(playerId, operatorId, siteName, promotionId, error);
    }
  }

  /**
   * Validate TO progress result
   */
  private async validateTOProgress(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    toProgress: GetTOProgressResponse,
  ): Promise<ClaimBonusWinsResponse | null> {
    if (!toProgress.errorCode) {
      return null;
    }
    const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_GET_TO_PROGRESS_FAILED;
    await this.createClaimLogBuilder(playerId, operatorId, siteName, promotionId)
      .withError(
        toProgress.errorCode,
        toProgress.errorMessage || errorConfig.message,
        errorConfig.description,
        {
          totalTurnover: toProgress.totalTurnover,
          minRequiredTurnover: toProgress.minRequiredTurnover,
          progressPercentage: toProgress.progressPercentage,
          totalWinAmount: toProgress.totalWinAmount,
          remainingTO: toProgress.remainingTO,
          canClaim: toProgress.canClaim,
          claimExpirationDate: toProgress.claimExpirationDate,
        },
      )
      .send();

    return this.createErrorResponse(toProgress.errorCode);
  }

  /**
   * Validate player promotion exists
   */
  private async validatePlayerPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<PlayerPromotionDocument | null> {
    return this.findByPromotion(playerId, operatorId, siteName, promotionId);
  }

  /**
   * Validate claim conditions (canClaim and isClaimable)
   */
  private async validateClaimConditions(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    playerPromotion: PlayerPromotionDocument,
    toProgress: GetTOProgressResponse,
  ): Promise<ClaimBonusWinsResponse | null> {
    const isClaimable = await this.isClaimable(
      playerId,
      operatorId,
      siteName,
      promotionId,
      toProgress.totalTurnover,
      playerPromotion._id,
      toProgress.totalWinAmount,
    );

    // Check if turnover requirement is met
    if (!toProgress.canClaim) {
      const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET;
      await this.logClaimError(
        playerId,
        operatorId,
        siteName,
        promotionId,
        errorConfig,
        toProgress,
      );
      return this.createErrorResponse(errorConfig.code);
    }

    // Check if claim verification passed
    if (!isClaimable) {
      const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED;
      await this.logClaimError(
        playerId,
        operatorId,
        siteName,
        promotionId,
        errorConfig,
        toProgress,
      );
      return this.createErrorResponse(errorConfig.code);
    }

    return null;
  }

  /**
   * Execute the claim process
   */
  private async executeClaimProcess(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    playerPromotion: PlayerPromotionDocument,
    toProgress: GetTOProgressResponse,
  ): Promise<ClaimBonusWinsResponse> {
    const { playerFinishedPromotion, errorCode } = await this.processBonusClaim(
      playerId,
      operatorId,
      siteName,
      promotionId,
      playerPromotion,
    );

    if (errorCode || !playerFinishedPromotion) {
      const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED;
      await LogBuilder.create(
        operatorId,
        this.CLAIM_BONUS_WIN_ACTION,
        this.loggerService,
        this.actionLogService,
      )
        .withRequest({ playerId, siteName, operatorId, promotionId })
        .withError(errorConfig.code, errorConfig.message, errorConfig.description, {
          totalTurnover: toProgress.totalTurnover,
          minRequiredTurnover: toProgress.minRequiredTurnover,
          progressPercentage: toProgress.progressPercentage,
          totalWinAmount: toProgress.totalWinAmount,
          remainingTO: toProgress.remainingTO,
          canClaim: toProgress.canClaim,
          claimExpirationDate: toProgress.claimExpirationDate,
        })
        .send();

      return this.createErrorResponse(errorCode || errorConfig.code);
    }

    return {
      playerFinishedPromotionId: playerFinishedPromotion._id,
      playerPromotionId: playerPromotion._id,
      claimedAmount: playerFinishedPromotion.totalWinAmount,
      totalTurnover: playerFinishedPromotion.totalTurnover,
      minRequiredTurnover: playerFinishedPromotion.minRequiredTurnover,
      totalWinAmount: playerFinishedPromotion.totalWinAmount,
    };
  }

  /**
   * Log claim error
   */
  private async logClaimError(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    errorConfig: { code: string; message: string; description: string },
    toProgress: GetTOProgressResponse,
  ): Promise<void> {
    await this.createClaimLogBuilder(playerId, operatorId, siteName, promotionId)
      .withError(errorConfig.code, errorConfig.message, errorConfig.description, {
        totalTurnover: toProgress.totalTurnover,
        minRequiredTurnover: toProgress.minRequiredTurnover,
        progressPercentage: toProgress.progressPercentage,
        totalWinAmount: toProgress.totalWinAmount,
        remainingTO: toProgress.remainingTO,
        canClaim: toProgress.canClaim,
        claimExpirationDate: toProgress.claimExpirationDate,
      })
      .send();
  }

  /**
   * Log claim success
   */
  private async logClaimSuccess(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    toProgress: GetTOProgressResponse,
  ): Promise<void> {
    await this.createClaimLogBuilder(playerId, operatorId, siteName, promotionId)
      .withResponse({
        claimedAmount: toProgress.totalWinAmount,
        totalTurnover: toProgress.totalTurnover,
        minRequiredTurnover: toProgress.minRequiredTurnover,
        totalWinAmount: toProgress.totalWinAmount,
        progressPercentage: toProgress.progressPercentage,
        remainingTO: toProgress.remainingTO,
        canClaim: toProgress.canClaim,
        claimExpirationDate: toProgress.claimExpirationDate,
      })
      .send();
  }

  /**
   * Handle unexpected error during claim
   */
  private async handleClaimUnexpectedError(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    error: any,
  ): Promise<ClaimBonusWinsResponse> {
    const errorConfig = PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR;
    await this.createClaimLogBuilder(playerId, operatorId, siteName, promotionId)
      .withError(errorConfig.code, errorConfig.message, error.stack || error.message)
      .send();

    this.loggerService.error('Error in claimBonusWins', error.stack, {
      playerId,
      operatorId,
      siteName,
      promotionId,
      error: error.message,
    });

    return this.createErrorResponse(PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code);
  }

  /**
   * Create error response
   */
  private createErrorResponse(errorCode: string): ClaimBonusWinsResponse {
    return {
      playerFinishedPromotionId: '',
      playerPromotionId: '',
      claimedAmount: 0,
      totalTurnover: 0,
      minRequiredTurnover: 0,
      totalWinAmount: 0,
      errorCode,
    };
  }

  async processBonusClaim(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    playerPromotion: PlayerPromotionDocument,
  ): Promise<{
    errorCode?: string;
    playerFinishedPromotion?: PlayerFinishedPromotionDocument;
  }> {
    try {
      const maxRedemptionCount = await this.playerPromotionService.getPromotionRedeemedCount(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );
      const { _id, joinedAt, totalWinAmount, ...restPromotionFields } = playerPromotion;

      const playerFinishedPromotion = await this.playerFinishedPromotionModel.findOneAndUpdate(
        {
          playerPromotionId: _id,
        },
        {
          $set: {
            ...restPromotionFields,
            bonusClaimed: totalWinAmount > 0,
            claimedAt: new Date(),
          },
          $setOnInsert: {
            seq: null,
            redemptionCount: maxRedemptionCount + 1,
            joinedAt,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

      if (!playerFinishedPromotion) {
        return { errorCode: PLAYER_PROMOTION_ERROR_CODES.MOVING_TO_FINISHED_PROMOTION_FAILED.code };
      }
      const deleteResult = await this.playerPromotionModel.deleteOne({ _id });
      if (!deleteResult.deletedCount) {
        this.loggerService.error(
          'Error in processBonusClaim: delete player promotion failed',
          undefined,
          {
            playerId,
            operatorId,
            siteName,
            promotionId,
          },
        );
        return { errorCode: PLAYER_PROMOTION_ERROR_CODES.DELETE_PLAYER_PROMOTION_FAILED.code };
      }

      return { playerFinishedPromotion };
    } catch (error) {
      this.loggerService.error('Error in processBonusClaim', error.stack, {
        playerId,
        operatorId,
        siteName,
        promotionId,
        error: error.message,
      });
      return { errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code };
    }
  }

  private async isClaimable(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
    totalTurnover: number,
    playerPromotionId: MongooseSchema.Types.ObjectId,
    totalWinAmount: number,
  ): Promise<boolean> {
    const promotion = await this.promotionModel.findById(promotionId).lean().exec();

    if (!promotion) {
      await LogBuilder.create(
        operatorId,
        this.CLAIM_BONUS_WIN_ACTION,
        this.loggerService,
        this.actionLogService,
      )
        .withRequest({
          playerId,
          siteName,
          promotionId,
          operatorId,
        })
        .withError(
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_PROMOTION_NOT_FOUND.code,
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_PROMOTION_NOT_FOUND.message,
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_PROMOTION_NOT_FOUND.description,
        )
        .send();
      return false;
    }

    const actualWinAmount = await this.promotionTicketService.calculateTotalWin({
      playerId,
      operatorId,
      siteName,
      promotionId,
      playerPromotionId,
    });

    const minRequiredTurnover = roundToFourDecimals(
      actualWinAmount.totalWinAmount * promotion.minTurnoverMultiplier,
    );

    const canClaim = this.canClaimBonusWins(
      totalTurnover,
      minRequiredTurnover,
      totalWinAmount,
      actualWinAmount.totalWinAmount,
    );

    if (!canClaim) {
      await LogBuilder.create(
        operatorId,
        this.CLAIM_BONUS_WIN_ACTION,
        this.loggerService,
        this.actionLogService,
      )
        .withRequest({
          playerId,
          siteName,
          promotionId,
          operatorId,
        })
        .withError(
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code,
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.message,
          PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.description,
        )
        .withResponse({
          totalTurnover,
          minRequiredTurnover,
          totalWinAmount: actualWinAmount.totalWinAmount,
          turnoverMultiplier: promotion.minTurnoverMultiplier,
          reasons: {
            minRequiredTurnoverInvalid: minRequiredTurnover <= 0,
            turnoverNotMet: totalTurnover < minRequiredTurnover,
            noWinAmount: actualWinAmount.totalWinAmount <= 0,
          },
        })
        .send();
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
    actualWinAmount: number,
  ): boolean {
    return (
      minRequiredTurnover > 0 &&
      roundToFourDecimals(totalTurnover) >= roundToFourDecimals(minRequiredTurnover) &&
      totalWinAmount > 0 &&
      roundToFourDecimals(totalWinAmount) === roundToFourDecimals(actualWinAmount)
    );
  }

  /**
   * Manually claim bonus wins for a player (admin-triggered)
   * This method performs the standard claim process and then calls AwardAPI to reward the player
   * @param promotionId Promotion ID
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteId Site ID
   * @param currency Currency code
   * @param adminUserId Admin user performing the manual claim
   * @returns Manual claim bonus wins response
   */
  async manualClaimBonusWins(
    promotionId: string,
    playerId: string,
    operatorId: string,
    siteId: string,
    siteName: string,
    currency: string,
    adminUserId: string,
    gameTypeId: number,
  ): Promise<ManualClaimBonusWinsResponse> {
    try {
      const claimResult = await this.claimBonusWins(
        playerId,
        operatorId,
        siteName,
        promotionId,
        true,
      );

      if (claimResult.errorCode) {
        return {
          success: false,
          claimedAmount: 0,
          errorCode: claimResult.errorCode,
          errorMessage: claimResult.errorMessage || 'Claim bonus wins failed',
        };
      }

      const awardResult = await this.awardAPIService.awardPlayer({
        playerId,
        amount: claimResult.claimedAmount,
        promotionId,
        currency,
        siteId,
        gameTypeId,
        operatorId,
      });

      const { claimedAmount } = claimResult;

      this.loggerService.captureMessage('manual-claim-bonus-wins', 'fatal', {
        action: 'manual-claim-bonus-wins',
        adminUserId,
        playerId,
        operatorId,
        siteName,
        promotionId,
        currency,
        claimedAmount,
        gameTypeId,
        awardAPISuccess: awardResult.success,
        awardAPIErrorCode: awardResult.errorCode,
      });

      return {
        success: awardResult.success,
        claimedAmount,
        errorCode: awardResult.success
          ? undefined
          : PLAYER_PROMOTION_ERROR_CODES.MANUAL_CLAIM_AWARD_API_FAILED.code,
        errorMessage: awardResult.success ? undefined : awardResult.message,
      };
    } catch (error) {
      this.loggerService.error('Error in manualClaimBonusWins', error.stack, {
        promotionId,
        playerId,
        operatorId,
        siteId,
        currency,
        adminUserId,
        error: error.message,
      });

      return {
        success: false,
        claimedAmount: 0,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.MANUAL_CLAIM_FAILED.code,
        errorMessage: `Manual claim failed: ${error.message}`,
      };
    }
  }
  /**
   * Create a LogBuilder instance for claim bonus win operations
   */
  private createClaimLogBuilder(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ) {
    return LogBuilder.create(
      operatorId,
      this.CLAIM_BONUS_WIN_ACTION,
      this.loggerService,
      this.actionLogService,
    ).withRequest({
      playerId,
      siteName,
      promotionId,
      operatorId,
    });
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
      const toProgressResult = await this.getTOProgress(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      if (toProgressResult.totalWinAmount === 0) {
        const processBonusClaimResult = await this.processBonusClaim(
          playerId,
          operatorId,
          siteName,
          promotionId,
          result,
        );
        if (processBonusClaimResult.errorCode) {
          this.loggerService.error(
            'Failed to move the promotion to the finished state when totalWinAmount is 0',
            undefined,
            {
              method: 'completePromotion',
              service: 'BonusWinsService',
              playerId,
              operatorId,
              siteName,
              promotionId,
              error: processBonusClaimResult.errorCode,
            },
          );
        }
      }

      return toProgressResult;
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
