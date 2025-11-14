import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { Model, Types, PipelineStage } from 'mongoose';
import { LoggerService } from '../../core/logger/logger.service';
import { PlayerDto } from '../models/player.dto';
import * as Responses from '../responses';
import { DeductBonusItemResponse, RollbackResponse } from '../responses/deduct-bonus-item.response';
import { EligiblePromotion } from '../responses/eligible-promotion.response';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { PROMOTION_STATUS } from '../../constants/player-promotion';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { PlayerPromotionStateDto } from '../models/player-promotion-state.dto';
import { PlayerPromotionStateResponse } from '../responses';
import { PlayerPromotionStateExportDto } from '../models/player-promotion-state-export.dto';
import {
  PlayerFinishedPromotion,
  PlayerFinishedPromotionDocument,
} from '../schemas/player-finished-promotion.schema';
import { UpdatePlayerFinishedPromotionDto } from '../models/update-player-finished-promotion.dto';
interface AggregationResult {
  totalCount: number;
  baseTotalWinAmount: number;
  baseTotalTurnover: number;
  baseTotalBonusClaimed: number;
}

interface AggregationDocument {
  _id: string;
  playerId: string;
  playerPromotionId: string;
  currencyGroup: string;
  siteId: string;
  gameId: number;
  playerName: string;
  currency: string;
  calculatedStatus: string;
  progress: {
    current: number;
    required: number;
  };
  minRequiredTurnover: number;
  turnoverMultiplier: number;
  siteName: string;
  createdAt: Date;
  updatedAt: Date;
  totalWinAmount: number;
  baseTotalWinAmount: number;
  totalTurnover: number;
  baseTotalTurnover: number;
  bonusClaimed: boolean;
  remainingBonusItems: number;
  initialBonusItem: number;
}
/**
 * Service for managing player promotions
 */
@Injectable()
export class PlayerPromotionService {
  constructor(
    @InjectModel(PlayerPromotion.name)
    private readonly playerPromotionModel: Model<PlayerPromotionDocument>,
    @InjectModel(PlayerFinishedPromotion.name)
    private readonly playerFinishedPromotionModel: Model<PlayerFinishedPromotionDocument>,
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Query player promotions by list of player and promotion IDs where isCompleted = false
   * @param playerPromotionPairs Array of {playerId, promotionId} pairs
   * @returns Array of incomplete player promotions
   */
  async findIncompletePromotionsByPlayerList(
    playerPromotionPairs: Array<{ playerId: string; promotionId: string }>,
  ): Promise<any[]> {
    // Build $or condition for matching player-promotion pairs
    const orConditions = playerPromotionPairs.map(pair => ({
      playerId: pair.playerId,
      promotionId: new Types.ObjectId(pair.promotionId),
    }));

    const query = {
      $or: orConditions,
      isCompleted: false,
    };

    try {
      const incompletePromotions = await this.playerPromotionModel.find(query).exec();

      return incompletePromotions.map(promotion => ({
        playerId: promotion.playerId,
        operatorId: promotion.operatorId,
        siteName: promotion.siteName,
        promotionId: promotion.promotionId.toString(),
        currencyGroup: promotion.currencyGroup,
        remainingBonusItems: promotion.remainingBonusItems,
        initialBonusItem: promotion.initialBonusItem,
        betLevel: promotion.betLevel,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        lastUsedDate: promotion.lastUsedDate,
        isGiftCode: promotion.isGiftCode,
        totalTurnover: promotion.totalTurnover,
        totalWinAmount: promotion.totalWinAmount,
        minRequiredTurnover: promotion.minRequiredTurnover,
        turnoverMultiplier: promotion.turnoverMultiplier,
        bonusClaimed: promotion.bonusClaimed,
        claimedAt: promotion.claimedAt,
        isCompleted: promotion.isCompleted,
        coinValue: promotion.coinValue,
        baseTotalWinAmount: promotion.baseTotalWinAmount,
        baseTotalTurnover: promotion.baseTotalTurnover,
      }));
    } catch (error) {
      this.loggerService.captureException(
        `Error querying incomplete promotions: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get current promotion for a player or create one if available
   * @param playerDto Player information
   * @returns Current player promotion or null if none available
   */
  async claimPromotion(playerDto: PlayerDto): Promise<Responses.PlayerPromotionResponse | null> {
    const { operatorId, siteName, playerId, currencyGroup, gameId } = playerDto;

    // Step 1: Check if player already has an active promotion
    const existingPromotion = await this.findExistingPromotion(
      playerId,
      operatorId,
      siteName,
      gameId,
    );

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
      gameId,
    );
    return this.mapToPlayerPromotionResponse(playerPromotion);
  }

  /**
   * Check if player has available promotions
   * @param playerDto Player information
   * @returns List of eligible promotions
   */
  async hasAvailablePromotions(playerDto: PlayerDto): Promise<EligiblePromotion | null> {
    const availablePromotions = await this.getAvailablePromotions(playerDto);
    if (!availablePromotions) {
      return null;
    }
    return (
      availablePromotions.find(promotion => promotion.gameIds.includes(playerDto.gameId)) || null
    );
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
    gameId: number,
  ): Promise<PlayerPromotionDocument> {
    const promotion = await this.getPromotionById(promotionId);
    return this.createPlayerPromotion(
      playerId,
      promotion._id,
      operatorId,
      siteName,
      currencyGroup,
      gameId,
    );
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
        gameIds: promotion.gameIds,
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
   * @param giftCode Optional gift code to filter by
   * @returns Existing promotion or null
   */
  async findExistingPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    gameId?: number,
    giftCode?: string,
  ): Promise<PlayerPromotionDocument | null> {
    const playerPromotions = await this.findPlayerPromotion(
      playerId,
      operatorId,
      siteName,
      giftCode,
      gameId,
    );

    const promotions = await this.promotionModel
      .find({
        _id: { $in: playerPromotions.map(playerPromotion => playerPromotion.promotionId) },
      })
      .lean()
      .exec();

    for (const playerPromotion of playerPromotions) {
      const promotion = promotions?.find(
        promotion => promotion._id.toString() === playerPromotion.promotionId.toString(),
      );

      if (
        this.isPromotionActive(playerPromotion, promotion || null) &&
        (promotion?.gameIds.length === 0 || (gameId && promotion?.gameIds.includes(gameId)))
      ) {
        return playerPromotion;
      }
    }
    return null;
  }

  /**
   * Find player promotion by basic criteria
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param giftCode Optional gift code
   * @returns Player promotion or null
   */
  private async findPlayerPromotion(
    playerId: string,
    operatorId: string,
    siteName: string,
    giftCode?: string,
    gameId?: number,
  ): Promise<PlayerPromotionDocument[]> {
    const query: any = {
      playerId,
      operatorId,
      siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
      bonusClaimed: false,
    };

    if (giftCode) {
      query.promotionCode = giftCode;
    }
    if (gameId) {
      query.$or = [{ gameId: null }, { gameId }];
    }
    return this.playerPromotionModel.find(query).lean().exec();
  }

  /**
   * Check if promotion is active based on completion status and time conditions
   * @param playerPromotion Player promotion document
   * @param promotion Promotion document
   * @returns True if promotion is active
   */
  private isPromotionActive(
    playerPromotion: PlayerPromotionDocument,
    promotion: PromotionDocument | null,
  ): boolean {
    const now = new Date();

    if (!promotion || (playerPromotion.isCompleted && playerPromotion.totalWinAmount === 0)) {
      return false;
    }

    return (
      (playerPromotion.isCompleted && now <= promotion.claimExpirationDate) ||
      (now >= playerPromotion.startDate && now <= playerPromotion.endDate)
    );
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
    if (!promotions || promotions.length === 0) {
      return [];
    }

    // Get all promotion IDs that this player has ever claimed
    const claimedPromotions = await this.playerPromotionModel
      .find({
        playerId,
        operatorId,
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
      })
      .lean()
      .exec();

    // Filter out promotions that have been claimed before
    const unclaimedPromotions = promotions.filter(
      promotion =>
        !claimedPromotions?.some(
          claimedPromotion =>
            claimedPromotion.promotionCode.toString() === promotion.code.toString(),
        ),
    );

    const eligiblePromotions: PromotionDocument[] = [];

    for (const promotion of unclaimedPromotions) {
      promotion.maxRedemptionTimes = promotion.maxRedemptionTimes ?? 1;
      const redeemedCount = await this.getPromotionRedeemedCount(
        playerId,
        operatorId,
        siteName,
        promotion._id.toString(),
      );
      if (redeemedCount < promotion.maxRedemptionTimes || promotion.maxRedemptionTimes === -1) {
        eligiblePromotions.push(promotion);
      }
    }
    return eligiblePromotions;
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
            $or: [
              { offeredSiteNames: { $size: 0 } },
              { offeredSiteNames: { $regex: new RegExp(`^${siteName}$`, 'i') } },
            ],
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
    gameId: number,
  ): Promise<PlayerPromotionDocument> {
    const promotion = await this.getPromotionById(promotionId);

    // Find the bet level for the player's currency group
    const betLevelInfo = promotion.betLevels.find(
      betLevel => betLevel.currencyGroup.toString() === currencyGroup.toString(),
    );

    const coinValueInfo = promotion.coinValues.find(
      coinValue => coinValue.currencyGroup.toString() === currencyGroup.toString(),
    );

    const playerPromotion = new this.playerPromotionModel({
      playerId,
      operatorId,
      siteName,
      promotionId: promotion._id,
      promotionCode: promotion.code,
      gameId,
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
      isCompleted: false,
      coinValue: coinValueInfo?.coinValue || 0,
      baseTotalWinAmount: 0,
      baseTotalTurnover: 0,
      baseMinRequiredTurnover: 0,
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
    siteName: string,
  ): Promise<DeductBonusItemResponse> {
    const result = await this.playerPromotionModel.findOneAndUpdate(
      {
        operatorId,
        playerId,
        promotionId,
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
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
   * Get promotion status for a specific promotion with pagination
   * @param promotionId Promotion ID
   * @param player Optional player ID filter
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param status Optional status filter
   * @param pageIndex Page index (starts from 1)
   * @param pageSize Number of items per page
   * @returns List of player promotion status information
   */
  async getPlayerPromotionState(
    query: PlayerPromotionStateDto,
  ): Promise<Responses.PlayersResponse> {
    const {
      promotionId,
      player,
      startDate,
      endDate,
      status,
      pageIndex,
      pageSize,
      currencies,
      gameIds,
    } = query;
    const promotion = await this.getPromotionById(promotionId);
    if (!promotion) {
      throw new Error(PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code);
    }

    const commonParams = {
      promotionId,
      claimExpirationDate: promotion.claimExpirationDate,
      startDate,
      endDate,
      status,
      playerSearch: player,
      currencies,
      gameIds,
    };
    const countTotalPipeline = this.buildCompleteAggregationPipeline(commonParams);
    const totals = await this.getTotalCountAndAmounts(countTotalPipeline);
    const dataPipeline = this.buildCompleteAggregationPipeline({
      ...commonParams,
      pageIndex,
      pageSize,
    });
    const results = await this.playerPromotionModel.aggregate(dataPipeline);
    const items = results.map(doc => this.mapAggregationResultToResponse(doc));

    return {
      items,
      metadata: {
        pageIndex,
        totalCount: totals.totalCount,
        baseTotalWinAmount: totals.baseTotalWinAmount,
        baseTotalTurnover: totals.baseTotalTurnover,
        baseTotalBonusClaimed: totals.baseTotalBonusClaimed,
        pageSize,
      },
    };
  }

  /**
   * Get promotion status for a specific promotion without pagination (export all data)
   * @param query Export query parameters
   * @returns List of all player promotion status information
   */
  async getPlayerPromotionStateExport(
    query: PlayerPromotionStateExportDto,
  ): Promise<Responses.PlayersExportResponse> {
    const { promotionId, player, startDate, endDate, status, currencies, gameIds } = query;
    const promotion = await this.getPromotionById(promotionId);
    if (!promotion) {
      throw new Error(PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code);
    }

    // Build complete pipeline with sorting only (no pagination)
    const pipeline = this.buildCompleteAggregationPipeline({
      promotionId,
      claimExpirationDate: promotion.claimExpirationDate,
      startDate,
      endDate,
      status,
      playerSearch: player,
      currencies,
      gameIds,
    });

    // Execute aggregation
    const results = await this.playerPromotionModel.aggregate(pipeline);

    // Map to response format
    const items = results.map(doc => this.mapAggregationResultToResponse(doc));

    return {
      items,
    };
  }

  /**
   * Build complete aggregation pipeline with all stages
   */
  private buildCompleteAggregationPipeline(options: {
    promotionId: string;
    claimExpirationDate: Date;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    playerSearch?: string;
    currencies?: string;
    gameIds?: string;
    pageIndex?: number;
    pageSize?: number;
  }): PipelineStage[] {
    const {
      promotionId,
      claimExpirationDate,
      startDate,
      endDate,
      status,
      playerSearch,
      currencies,
      gameIds,
      pageIndex,
      pageSize,
    } = options;
    const currenciesArray = currencies?.split(',');
    const gameIdsArray = gameIds?.split(',').map(Number);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          promotionId: new Types.ObjectId(promotionId),
          ...(startDate &&
            endDate && {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }),
        },
      },
      {
        $unionWith: {
          coll: 'game_player_finished_promotions',
          pipeline: [
            {
              $match: {
                promotionId: new Types.ObjectId(promotionId),
                ...(startDate &&
                  endDate && {
                    createdAt: {
                      $gte: new Date(startDate),
                      $lte: new Date(endDate),
                    },
                  }),
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'user_silos',
          localField: 'playerId',
          foreignField: 'playerId',
          as: 'playerInfo',
        },
      },
      {
        $addFields: {
          playerName: {
            $ifNull: [{ $arrayElemAt: ['$playerInfo.playerName', 0] }, ''],
          },
          currency: {
            $ifNull: [{ $arrayElemAt: ['$playerInfo.currency', 0] }, ''],
          },
          siteId: {
            $ifNull: [{ $arrayElemAt: ['$playerInfo.siteId', 0] }, ''],
          },
        },
      },
      ...(playerSearch
        ? [
            {
              $match: {
                $or: [
                  { playerName: { $regex: playerSearch, $options: 'i' } },
                  { playerId: { $regex: playerSearch, $options: 'i' } },
                ],
              },
            },
          ]
        : []),
      ...(currencies
        ? [
            {
              $match: {
                currency: { $in: currenciesArray },
              },
            },
          ]
        : []),
      ...(gameIds && gameIds.length > 0
        ? [
            {
              $match: {
                $or: [{ gameId: { $in: gameIdsArray } }, { gameId: null }],
              },
            },
          ]
        : []),
      {
        $addFields: {
          calculatedStatus: {
            $cond: [
              '$bonusClaimed',
              PROMOTION_STATUS.BONUS_CLAIMED,
              {
                $cond: [
                  { $gt: [new Date(), claimExpirationDate] },
                  PROMOTION_STATUS.EXPIRED,
                  {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$totalTurnover', '$minRequiredTurnover'] },
                          { $gt: ['$minRequiredTurnover', 0] },
                        ],
                      },
                      PROMOTION_STATUS.TURN_OVER_MET,
                      PROMOTION_STATUS.ACTIVE,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    if (status) {
      pipeline.push({ $match: { calculatedStatus: status } });
    }

    if (pageIndex && pageSize) {
      pipeline.push({ $skip: (pageIndex - 1) * pageSize }, { $limit: pageSize });
    }

    return pipeline;
  }

  /**
   * Get total count and base amounts for pagination metadata
   */
  private async getTotalCountAndAmounts(pipeline: PipelineStage[]): Promise<AggregationResult> {
    const countPipeline: PipelineStage[] = [
      ...pipeline,
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          baseTotalWinAmount: { $sum: '$baseTotalWinAmount' },
          baseTotalTurnover: { $sum: '$baseTotalTurnover' },
          baseBonusClaimed: {
            $sum: {
              $cond: [{ $eq: ['$bonusClaimed', true] }, '$baseTotalWinAmount', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCount: 1,
          baseTotalWinAmount: 1,
          baseTotalTurnover: 1,
          baseBonusClaimed: 1,
        },
      },
    ];

    const result = await this.playerPromotionModel.aggregate(countPipeline);
    const data = result[0] || {};
    return {
      totalCount: data.totalCount || 0,
      baseTotalWinAmount: data.baseTotalWinAmount || 0,
      baseTotalTurnover: data.baseTotalTurnover || 0,
      baseTotalBonusClaimed: data.baseBonusClaimed || 0,
    };
  }

  /**
   * Map aggregation result to response format
   */
  private mapAggregationResultToResponse(doc: AggregationDocument): PlayerPromotionStateResponse {
    return {
      playerId: doc.playerId,
      playerPromotionId: doc.playerPromotionId || doc._id,
      currencyGroup: doc.currencyGroup,
      siteId: doc.siteId,
      gameId: doc.gameId,
      username: doc.playerName,
      status: doc.calculatedStatus,
      siteName: doc.siteName,
      currency: doc.currency,
      dateJoined: doc.createdAt.toISOString(),
      bonusWin: doc.totalWinAmount,
      baseBonusWin: doc.baseTotalWinAmount || 0,
      turnover: doc.totalTurnover,
      baseTurnover: doc.baseTotalTurnover || 0,
      progress: {
        current: Math.min(doc.totalTurnover / doc.totalWinAmount, doc.turnoverMultiplier),
        required: doc.turnoverMultiplier,
      },
      bonusClaimed: doc.bonusClaimed ? doc.totalWinAmount : 0,
      baseBonusClaimed: doc.bonusClaimed ? doc.baseTotalWinAmount || 0 : 0,
      lastActivity: doc.updatedAt.toISOString(),
      remainingBonusItems: doc.remainingBonusItems,
      initialBonusItem: doc.initialBonusItem,
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
      promotionId: playerPromotion.promotionId,
      promotionCode: playerPromotion.promotionCode,
      gameId: playerPromotion.gameId,
      currencyGroup: playerPromotion.currencyGroup,
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
      bonusClaimed: playerPromotion.bonusClaimed,
      claimedAt: playerPromotion.claimedAt,
      isCompleted: playerPromotion.isCompleted,
      coinValue: playerPromotion.coinValue,
      baseTotalWinAmount: playerPromotion.baseTotalWinAmount,
      baseTotalTurnover: playerPromotion.baseTotalTurnover,
      baseMinRequiredTurnover: playerPromotion.baseMinRequiredTurnover,
    };

    return {
      success: true,
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
  ): Promise<Responses.PlayerPromotionResponse> {
    try {
      const validationResult = this.validateGiftCodeInput(giftCode);
      if (!validationResult.isValid) {
        return this.createErrorResponse(validationResult.errorCode);
      }

      const { operatorId, siteName, playerId, currencyGroup, gameId } = playerDto;

      // Check if player already has an active promotion (with gift code filter)
      const existingPromotion = await this.hasPlayerClaimedPromotion(
        playerId,
        operatorId,
        siteName,
        giftCode,
      );
      if (existingPromotion) {
        return this.createErrorResponse(PLAYER_PROMOTION_ERROR_CODES.INVALID_GIFT_CODE);
      }

      // Find and validate promotion by gift code
      const promotion = await this.findPromotionByGiftCode(giftCode, playerDto, gameId);
      if (!promotion) {
        return this.createErrorResponse(PLAYER_PROMOTION_ERROR_CODES.INVALID_GIFT_CODE);
      }

      const redeemedCount = await this.getPromotionRedeemedCount(
        playerId,
        operatorId,
        siteName,
        promotion._id,
      );

      if (redeemedCount >= promotion.maxRedemptionTimes && promotion.maxRedemptionTimes !== -1) {
        return this.createErrorResponse(PLAYER_PROMOTION_ERROR_CODES.INVALID_GIFT_CODE);
      }

      // Claim the promotion
      const playerPromotion = await this.assignPromotionToPlayer(
        playerId,
        promotion._id,
        operatorId,
        siteName,
        currencyGroup,
        gameId,
      );
      return this.mapToPlayerPromotionResponse(playerPromotion);
    } catch (error) {
      this.loggerService.error(error);
      return this.createErrorResponse(PLAYER_PROMOTION_ERROR_CODES.UNEXPECTED_GIFT_CODE_ERROR);
    }
  }

  /**
   * Validate gift code input
   * @param giftCode Gift code to validate
   * @returns Validation result with error code if invalid
   */
  private validateGiftCodeInput(giftCode: string): { isValid: boolean; errorCode?: any } {
    if (!giftCode) {
      return {
        isValid: false,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.GIFT_CODE_REQUIRED,
      };
    }
    return { isValid: true };
  }

  /**
   * Create error response with consistent structure
   * @param errorCode Error code object
   * @returns Error response
   */
  private createErrorResponse(errorCode: any): Responses.PlayerPromotionResponse {
    return {
      success: false,
      ...errorCode,
    };
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
    playerDto: PlayerDto,
    gameId: number,
  ): Promise<PromotionDocument | null> {
    const now = new Date();
    return this.promotionModel
      .findOne({
        code: giftCode,
        operatorId: playerDto.operatorId,
        isGiftCode: true,
        gameIds: { $in: [gameId] },
        startDate: { $lte: now },
        endDate: { $gt: now },
        currencyGroups: { $in: [playerDto.currencyGroup] },
        $or: [
          { offeredSiteNames: { $size: 0 } }, // Offer all sites if siteName is empty
          { offeredSiteNames: { $regex: new RegExp(`^${playerDto.siteName}$`, 'i') } }, // Check if player's site is in the list
        ],
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
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
        promotionCode: promotionCode,
      })
      .lean()
      .exec();

    return !!claimedPromotion;
  }

  /**
   * Get maximum redemption count for a specific player promotion
   * @param playerId Player ID
   * @param operatorId Operator ID
   * @param siteName Site name
   * @param promotionId Promotion ID
   * @returns Maximum redemption count
   */
  async getPromotionRedeemedCount(
    playerId: string,
    operatorId: string,
    siteName: string,
    promotionId: string,
  ): Promise<number> {
    const result = await this.playerFinishedPromotionModel
      .findOne({
        playerId,
        operatorId,
        siteName: { $regex: new RegExp(`^${siteName}$`, 'i') },
        promotionId,
      })
      .sort({ redemptionCount: -1 })
      .select('redemptionCount')
      .lean()
      .exec();

    return result?.redemptionCount ?? 0;
  }

  /**
   * Update a player finished promotion
   * @param playerFinishedPromotionId Player finished promotion ID
   * @param updateData Update data
   * @returns void
   */
  async updatePlayerFinishedPromotion(updateData: UpdatePlayerFinishedPromotionDto): Promise<void> {
    try {
      const { playerFinishedPromotionId, seq } = updateData;
      await this.playerFinishedPromotionModel
        .updateOne({ _id: playerFinishedPromotionId }, { $set: { seq } })
        .exec();
    } catch (error) {
      this.loggerService.error('Error in updatePlayerFinishedPromotion', error.stack, {
        updateData,
        error: error.message,
      });
    }
  }
}
