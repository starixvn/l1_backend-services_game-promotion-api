import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlayerPromotionService } from '../services/player-promotion.service';
import { PlayerDto } from '../models/player.dto';
import { EligiblePromotionsResponse } from '../responses/eligible-promotion.response';
import { AssignPromotionDto } from '../models/assign-promotion.dto';
import { AssignmentResponse } from '../responses/assignment-response';
import { PlayerPromotionResponse } from '../responses/player-promotion.response';
import { DeductBonusItemDto } from '../models/deduct-bonus-item.dto';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';

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
    return { promotion };
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
  async deductBonusItem(
    @Body() deductBonusItemDto: DeductBonusItemDto,
  ): Promise<DeductBonusItemResponse> {
    return this.playerPromotionService.deductBonusItem(
      deductBonusItemDto.operatorId,
      deductBonusItemDto.playerId,
      deductBonusItemDto.promotionId,
    );
  }
}
