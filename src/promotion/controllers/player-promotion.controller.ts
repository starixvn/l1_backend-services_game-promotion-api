import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayerPromotionService } from '../services/player-promotion.service';
import * as Models from '../models';
import * as Responses from '../responses';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';

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
    return await this.playerPromotionService.claimPromotion(playerDto);
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

  @Post('assign')
  @ApiOperation({ summary: 'Assign a promotion to a player' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion assigned successfully',
    type: Responses.AssignmentResponse,
  })
  async assignPromotion(
    @Body() assignDto: Models.AssignPromotionDto,
  ): Promise<Responses.AssignmentResponse> {
    const { playerId, promotionId, operatorId, siteName, currencyGroup } = assignDto;

    await this.playerPromotionService.assignPromotionToPlayer(
      playerId,
      promotionId,
      operatorId,
      siteName,
      currencyGroup,
    );

    return { message: 'Promotion assigned successfully' };
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
}
