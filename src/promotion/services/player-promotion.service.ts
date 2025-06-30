import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { PlayerDto } from '../models/player.dto';
import { EligiblePromotion } from '../responses/eligible-promotion.response';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse, RollbackResponse } from '../responses/deduct-bonus-item.response';
import { UpdateTotalWinResponse } from '../responses/update-total-win.response';
import { UpdateTotalTurnoverResponse } from '../responses/update-total-turnover.response';
import { CalculateTORequirementResponse } from '../responses/calculate-to-requirement.response';
import { LoggerService } from '../../core/logger/logger.service';
import { CheckTORequirementResponse } from '../responses/check-to-requirement.response';
import * as Responses from '../responses';
import { GetTOProgressResponse } from '../responses/get-to-progress.response';
import { ClaimBonusWinsResponse } from '../responses/claim-bonus-wins.response';

/**
 * Service for managing player promotions
 */
@Injectable()
export class PlayerPromotionService {
  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Get current promotion for a player or create one if available
   * @param playerDto Player information
   * @returns Current player promotion or null if none available
   */
  async claimPromotion(playerDto: PlayerDto): Promise<any> {
    const { operatorId, siteName, playerId, currencyGroup } = playerDto;

    // Step 1: Check if player already has an active promotion
    const existingPromotion = await this.findExistingPromotion(playerId, operatorId, siteName);
    if (existingPromotion) {
      return this.mapToPlayerPromotionResponse(existingPromotion);
    }

    // Step 2: Find available promotions for the player
    const availablePromotions = await this.getAvailablePromotions(playerDto);
    const nonGiftCodePromotions = availablePromotions.filter(promotion => !promotion.isGiftCode);

    if (nonGiftCodePromotions.length === 0) {
      return null;
    }

    // Step 3: Claim the first available promotion
    const firstPromotion = nonGiftCodePromotions[0];
    const playerPromotion = await this.assignPromotionToPlayer(
      playerId,
      firstPromotion._id,
      operatorId,
      siteName,
      currencyGroup,
    );
    return this.mapToPlayerPromotionResponse(playerPromotion);
  }

  /**
   * Check if player has available promotions
   * @param playerDto Player information
   * @returns List of eligible promotions
   */
  async hasAvailablePromotions(playerDto: PlayerDto): Promise<EligiblePromotion[]> {
    return this.getAvailablePromotions(playerDto);
  }

  /**
   * Assign a promotion to a player
   * @param playerId Player ID
   * @param promotionId Promotion ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param currencyGroup Currency group
   * @returns Created player promotion
   */
  async assignPromotionToPlayer(
    playerId: string,
    promotionId: string,
    operatorId: string,
    siteName: string,
    currencyGroup: string,
  ): Promise<PlayerPromotionDocument> {
    const promotion = await this.getPromotionById(promotionId);
    return this.createPlayerPromotion(playerId, promotion._id, operatorId, siteName, currencyGroup);
  }

  /**
   * Map promotion documents to eligible promotions
   * @param promotions Promotion documents
   * @param playerCurrencyGroup Player's currency group
   * @returns List of eligible promotions
   */
  private mapPromotionsToEligible(
    promotions: PromotionDocument[],
    playerCurrencyGroup: string,
  ): EligiblePromotion[] {
    return promotions.map(promotion => {
      return {
        _id: promotion._id,
        betLevels: promotion.betLevels,
        name: promotion.name,
        code: promotion.code,
        bonusItemCount: promotion.bonusItemCount,
        currencyGroup: playerCurrencyGroup,
        isGiftCode: promotion.isGiftCode,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
      };
    });
  }

  /**
   * Find existing promotion for a player
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @returns Existing promotion or null
   */
  private async findExistingPromotion(
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
        remainingBonusItems: { $gt: 0 },
        startDate: { $lte: now },
        endDate: { $gt: now },
      })
      .lean()
      .exec();
  }

  /**
   * Get available promotions for a player
   * @param playerDto Player information
   * @returns List of available promotions
   */
  private async getAvailablePromotions(playerDto: PlayerDto): Promise<EligiblePromotion[]> {
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

    // Filter out promotions that have been claimed before by this player
    const unclaimedPromotions = await this.filterUnclaimedPromotions(
      runningPromotions,
      playerId,
      operatorId,
      siteName,
    );

    return this.mapPromotionsToEligible(unclaimedPromotions, currencyGroup);
  }

  /**
   * Filter out promotions that have been claimed before by the player
   * @param promotions List of running promotions
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @returns List of unclaimed promotions
   */
  private async filterUnclaimedPromotions(
    promotions: PromotionDocument[],
    playerId: string,
    operatorId: string,
    siteName: string,
  ): Promise<PromotionDocument[]> {
    if (promotions.length === 0) {
      return [];
    }

    // Get all promotion IDs that this player has ever claimed
    const claimedPromotions = await this.playerPromotionModel
      .find({
        playerId,
        operatorId,
        siteName,
      })
      .lean()
      .exec();

    // Filter out promotions that have been claimed before
    return promotions.filter(
      promotion =>
        !claimedPromotions?.some(
          claimedPromotion =>
            claimedPromotion.promotionCode.toString() === promotion.code.toString(),
        ),
    );
  }

  /**
   * Get running promotions for a player
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param playerId Player ID
   * @param currencyGroup Currency group
   * @returns List of running promotions
   */
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

  /**
   * Check if player has a current promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @returns Boolean indicating if player has a promotion
   */
  private async hasCurrentPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
  ): Promise<boolean> {
    const existingPromotion = await this.findExistingPromotion(playerId, operatorId, siteName);
    return !!existingPromotion;
  }

  /**
   * Create a player promotion
   * @param playerId Player ID
   * @param promotionId Promotion ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param currencyGroup Currency group
   * @returns Created player promotion
   */
  private async createPlayerPromotion(
    playerId: string,
    promotionId: string,
    operatorId: string,
    siteName: string,
    currencyGroup: string,
  ): Promise<PlayerPromotionDocument> {
    const promotion = await this.getPromotionById(promotionId);

    // Find the bet level for the player's currency group
    const betLevelInfo = promotion.betLevels.find(
      betLevel => betLevel.currencyGroup.toString() === currencyGroup.toString(),
    );

    const playerPromotion = new this.playerPromotionModel({
      playerId,
      operatorId,
      siteName,
      promotionId: promotion._id,
      promotionCode: promotion.code,
      currencyGroup,
      remainingBonusItems: promotion.bonusItemCount,
      initialBonusItem: promotion.bonusItemCount,
      betLevel: betLevelInfo?.betLevel || 0,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      lastUsedDate: null,
      isGiftCode: promotion.isGiftCode,
      totalTurnover: 0,
      totalWinAmount: 0,
      minRequiredTurnover: 0,
      turnoverMultiplier: promotion.minTurnoverMultiplier,
    });

    return playerPromotion.save();
  }

  /**
   * Get promotion by ID
   * @param promotionId Promotion ID
   * @returns Promotion document
   */
  private async getPromotionById(promotionId: string): Promise<PromotionDocument> {
    const promotion = await this.promotionModel.findById(promotionId).lean().exec();
    if (!promotion) {
      throw new Error('Promotion not found');
    }
    return promotion;
  }

  /**
   * Deduct a bonus item from a player's promotion
   * @param operatorId Operator ID
   * @param playerId Player ID
   * @param promotionId Promotion ID
   * @returns Success or failure response with error code
   */
  async deductBonusItem(
    operatorId: string,
    playerId: string,
    promotionId: string,
  ): Promise<DeductBonusItemResponse> {
    const result = await this.playerPromotionModel.findOneAndUpdate(
      {
        operatorId,
        playerId,
        promotionId,
        remainingBonusItems: { $gt: 0 },
      },
      {
        $inc: { remainingBonusItems: -1 },
        $set: { lastUsedDate: new Date() },
      },
      {
        lean: true,
      },
    );

    if (result) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_FAILED,
    };
  }

  /**
   * Rollback a bonus item deduction
   * @param operatorId Operator ID
   * @param playerId Player ID
   * @param promotionId Promotion ID
   * @param rollbackData Previous state data
   * @returns Success or failure response
   */
  async rollbackBonusItemDeduction(
    operatorId: string,
    playerId: string,
    promotionId: string,
    rollbackData: {
      previousLastUsedDate: Date | null;
    },
  ): Promise<RollbackResponse> {
    const result = await this.playerPromotionModel.findOneAndUpdate(
      {
        operatorId,
        playerId,
        promotionId,
      },
      {
        $inc: { remainingBonusItems: 1 },
        $set: {
          lastUsedDate: rollbackData.previousLastUsedDate,
        },
      },
      {
        lean: true,
      },
    );

    if (result) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      ...PLAYER_PROMOTION_ERROR_CODES.ROLLBACK_FAILED,
    };
  }

  /**
   * Map PlayerPromotionDocument to PlayerPromotionResponse
   * @param playerPromotion Player promotion document
   * @returns PlayerPromotionResponse
   */
  private mapToPlayerPromotionResponse(
    playerPromotion: PlayerPromotionDocument,
  ): Responses.PlayerPromotionResponse {
    const promotionData = {
      playerId: playerPromotion.playerId,
      operatorId: playerPromotion.operatorId,
      siteName: playerPromotion.siteName,
      promotionId: playerPromotion.promotionId.toString(),
      promotionCode: playerPromotion.promotionCode,
      currencyGroup: playerPromotion.currencyGroup.toString(),
      remainingBonusItems: playerPromotion.remainingBonusItems,
      initialBonusItem: playerPromotion.initialBonusItem,
      betLevel: playerPromotion.betLevel,
      startDate: playerPromotion.startDate,
      endDate: playerPromotion.endDate,
      lastUsedDate: playerPromotion.lastUsedDate,
      isGiftCode: playerPromotion.isGiftCode,
      totalTurnover: playerPromotion.totalTurnover,
      totalWinAmount: playerPromotion.totalWinAmount,
      minRequiredTurnover: playerPromotion.minRequiredTurnover,
      turnoverMultiplier: playerPromotion.turnoverMultiplier,
    } as any;

    return {
      promotion: promotionData,
    };
  }

  /**
   * Redeem a gift code promotion
   * @param playerDto Player information
   * @param giftCode Gift code to redeem
   * @returns Player promotion response or null if invalid
   */
  async redeemPromotion(
    playerDto: PlayerDto,
    giftCode: string,
  ): Promise<Responses.PlayerPromotionResponse | null> {
    const { operatorId, siteName, playerId, currencyGroup } = playerDto;

    // Step 1: Check if player already has an active promotion
    const existingPromotion = await this.findExistingPromotion(playerId, operatorId, siteName);
    if (existingPromotion) {
      return this.mapToPlayerPromotionResponse(existingPromotion);
    }

    // Step 2: Find promotion by gift code
    const promotion = await this.findPromotionByGiftCode(giftCode, operatorId, currencyGroup);
    if (!promotion) {
      return null;
    }

    // Step 3: Check if player has already claimed this promotion
    const hasClaimed = await this.hasPlayerClaimedPromotion(
      playerId,
      operatorId,
      siteName,
      promotion.code,
    );
    if (hasClaimed) {
      return null;
    }

    // Step 4: Claim the promotion
    const playerPromotion = await this.assignPromotionToPlayer(
      playerId,
      promotion._id,
      operatorId,
      siteName,
      currencyGroup,
    );
    return this.mapToPlayerPromotionResponse(playerPromotion);
  }

  /**
   * Find promotion by gift code
   * @param giftCode Gift code
   * @param operatorId Operator ID
   * @param currencyGroup Currency group
   * @returns Promotion or null
   */
  private async findPromotionByGiftCode(
    giftCode: string,
    operatorId: string,
    currencyGroup: string,
  ): Promise<PromotionDocument | null> {
    const now = new Date();
    return this.promotionModel
      .findOne({
        code: giftCode,
        operatorId,
        isGiftCode: true,
        startDate: { $lte: now },
        endDate: { $gt: now },
        currencyGroups: { $in: [currencyGroup] },
      })
      .lean()
      .exec();
  }

  /**
   * Check if player has already claimed a specific promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionCode Promotion code
   * @returns Boolean indicating if claimed
   */
  private async hasPlayerClaimedPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionCode: string,
  ): Promise<boolean> {
    const claimedPromotion = await this.playerPromotionModel
      .findOne({
        playerId,
        operatorId,
        siteName,
        promotionCode: promotionCode,
      })
      .lean()
      .exec();

    return !!claimedPromotion;
  }
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
          $inc: { totalWinAmount: winAmount },
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
