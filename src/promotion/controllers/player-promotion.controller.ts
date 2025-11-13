import { Controller, Post, Body, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayerPromotionService } from '../services/player-promotion.service';
import * as Models from '../models';
import * as Responses from '../responses';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { PlayerPromotionStateDto } from '../models/player-promotion-state.dto';
import { PlayerPromotionStateExportDto } from '../models/player-promotion-state-export.dto';
import { UpdatePlayerFinishedPromotionDto } from '../models/update-player-finished-promotion.dto';

@ApiTags('player-promotions')
@Controller('player-promotions')
export class PlayerPromotionController {
  constructor(private readonly playerPromotionService: PlayerPromotionService) {}

  @Post('claim-promotion')
  @ApiOperation({ summary: 'Get existing or claim new promotion for a player' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player promotion details',
    type: Responses.PlayerPromotionResponse,
  })
  async claimPromotion(
    @Body() playerDto: Models.PlayerDto,
  ): Promise<Responses.PlayerPromotionResponse | null> {
    return this.playerPromotionService.claimPromotion(playerDto);
  }

  @Post('has-promotion')
  @ApiOperation({ summary: 'Check which promotions are eligible for a player' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of eligible promotions',
    type: Responses.EligiblePromotionsResponse,
  })
  async checkEligibility(
    @Body() playerDto: Models.PlayerDto,
  ): Promise<Responses.EligiblePromotionsResponse> {
    const promotions = await this.playerPromotionService.hasAvailablePromotions(playerDto);
    return { promotions };
  }

  @Post('deduct-bonus-item')
  @ApiOperation({ summary: 'Deduct a bonus item from player promotion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bonus item deduction result',
    type: Responses.DeductBonusItemResponse,
  })
  async deductBonusItem(
    @Body() deductDto: Models.DeductBonusItemDto,
  ): Promise<Responses.DeductBonusItemResponse> {
    return this.playerPromotionService.deductBonusItem(
      deductDto.operatorId,
      deductDto.playerId,
      deductDto.promotionId,
      deductDto.siteName,
    );
  }

  @Post('rollback-bonus-item')
  @ApiOperation({ summary: 'Rollback a bonus item deduction' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bonus item rollback result',
    type: Responses.RollbackResponse,
  })
  async rollbackBonusItem(
    @Body() rollbackDto: Models.RollbackBonusItemDto,
  ): Promise<Responses.RollbackResponse> {
    const rollbackData = {
      previousLastUsedDate: rollbackDto.previousLastUsedDate
        ? new Date(rollbackDto.previousLastUsedDate)
        : null,
    };

    return this.playerPromotionService.rollbackBonusItemDeduction(
      rollbackDto.operatorId,
      rollbackDto.playerId,
      rollbackDto.promotionId,
      rollbackData,
    );
  }

  /**
   * Get player promotion status
   * @param query - Player promotion status query parameters
   * @returns Player promotion status information
   */
  @Get('state')
  @ApiOperation({ summary: 'Get player promotion state with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns player promotion status information with pagination',
    type: Responses.PlayersResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing required parameters' })
  @ApiResponse({ status: 404, description: 'Player promotion or promotion not found' })
  async getPlayerPromotionState(
    @Query() query: PlayerPromotionStateDto,
  ): Promise<Responses.PlayersResponse> {
    return this.playerPromotionService.getPlayerPromotionState(query);
  }

  /**
   * Export player promotion status (all data without pagination)
   * @param query - Player promotion status export query parameters
   * @returns All player promotion status information
   */
  @Get('state/export')
  @ApiOperation({ summary: 'Export player promotion state without pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns all player promotion status information without pagination',
    type: Responses.PlayersExportResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing required parameters' })
  @ApiResponse({ status: 404, description: 'Player promotion or promotion not found' })
  async getPlayerPromotionStateExport(
    @Query() query: PlayerPromotionStateExportDto,
  ): Promise<Responses.PlayersExportResponse> {
    return this.playerPromotionService.getPlayerPromotionStateExport(query);
  }

  @Post('query-players-incomplete-promotions')
  @ApiOperation({ summary: 'Query incomplete promotions by player and promotion ID pairs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of incomplete player promotions',
    type: [Object],
  })
  async queryPlayersIncompletePromotions(
    @Body() queryDto: Models.QueryIncompletePromotionsDto,
  ): Promise<any[]> {
    return this.playerPromotionService.findIncompletePromotionsByPlayerList(
      queryDto.playerPromotionPairs,
    );
  }

  @Post('redeem-promotion')
  @ApiOperation({ summary: 'Redeem a promotion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gift code redeemed successfully',
    type: Responses.PlayerPromotionResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid gift code or already claimed',
  })
  async redeemPromotion(
    @Body() redeemDto: Models.RedeemPromotionDto,
  ): Promise<Responses.PlayerPromotionResponse> {
    const { giftCode, ...playerDto } = redeemDto;
    const promotion = await this.playerPromotionService.redeemPromotion(playerDto, giftCode);

    if (!promotion) {
      return { success: false, ...PLAYER_PROMOTION_ERROR_CODES.INVALID_GIFT_CODE };
    }

    return promotion;
  }

  @Post('update-player-finished-promotion')
  @ApiOperation({ summary: 'Update a player finished promotion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player finished promotion updated successfully',
  })
  async updatePlayerFinishedPromotion(
    @Body() updateDto: UpdatePlayerFinishedPromotionDto,
  ): Promise<void> {
    return this.playerPromotionService.updatePlayerFinishedPromotion(updateDto);
  }
}
