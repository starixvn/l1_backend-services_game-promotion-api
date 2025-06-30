import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayerPromotionService } from '../services/player-promotion.service';
import { PlayerDto } from '../models/player.dto';
import { EligiblePromotionsResponse } from '../responses/eligible-promotion.response';
import { AssignPromotionDto } from '../models/assign-promotion.dto';
import { AssignmentResponse } from '../responses/assignment-response';
import { PlayerPromotionResponse } from '../responses/player-promotion.response';
import { DeductBonusItemDto } from '../models/deduct-bonus-item.dto';
import { RollbackBonusItemDto } from '../models/rollback-bonus-item.dto';
import { DeductBonusItemResponse, RollbackResponse } from '../responses/deduct-bonus-item.response';
import { RedeemGiftCodeDto } from '../models/redeem-gift-code.dto';
import { GIFT_CODE_ERROR_CODES } from '../../constants/error-codes';

@ApiTags('player-promotions')
@Controller('player-promotions')
export class PlayerPromotionController {
  constructor(private readonly playerPromotionService: PlayerPromotionService) {}

  @Post('claim-promotion')
  @ApiOperation({ summary: 'Get existing or claim new promotion for a player' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player promotion details',
    type: PlayerPromotionResponse,
  })
  async claimPromotion(@Body() playerDto: PlayerDto): Promise<PlayerPromotionResponse> {
    const promotion = await this.playerPromotionService.claimPromotion(playerDto);
    return { promotion, success: true };
  }

  @Post('has-promotion')
  @ApiOperation({ summary: 'Check which promotions are eligible for a player' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of eligible promotions',
    type: EligiblePromotionsResponse,
  })
  async checkEligibility(@Body() playerDto: PlayerDto): Promise<EligiblePromotionsResponse> {
    const promotions = await this.playerPromotionService.hasAvailablePromotions(playerDto);
    return { promotions };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a promotion to a player' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion assigned successfully',
    type: AssignmentResponse,
  })
  async assignPromotion(@Body() assignDto: AssignPromotionDto): Promise<AssignmentResponse> {
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
    type: DeductBonusItemResponse,
  })
  async deductBonusItem(@Body() deductDto: DeductBonusItemDto): Promise<DeductBonusItemResponse> {
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
    type: RollbackResponse,
  })
  async rollbackBonusItem(@Body() rollbackDto: RollbackBonusItemDto): Promise<RollbackResponse> {
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
    type: PlayerPromotionResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid gift code or already claimed',
  })
  async redeemPromotion(@Body() redeemDto: RedeemGiftCodeDto): Promise<PlayerPromotionResponse> {
    const { giftCode, ...playerDto } = redeemDto;
    const promotion = await this.playerPromotionService.redeemPromotion(playerDto, giftCode);

    if (!promotion) {
      return {
        success: false,
        ...GIFT_CODE_ERROR_CODES.INVALID_GIFT_CODE,
      };
    }

    return { promotion, success: true };
  }
}
