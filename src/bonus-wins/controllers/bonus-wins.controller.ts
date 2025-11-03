import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as Models from '../../promotion/models';
import * as Responses from '../../promotion/responses';
import { BonusWinsService } from '../services/bonus-wins.service';

@ApiTags('bonus-wins')
@Controller('bonus-wins')
export class BonusWinsController {
  constructor(private readonly bonusWinsService: BonusWinsService) {}

  @Post('update-total-turnover')
  @ApiOperation({ summary: 'Update total turnover for active bonus win (Stream Event)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total turnover update result',
    type: Responses.GetTOProgressResponse,
  })
  async updateTotalTurnover(
    @Body() updateDto: Models.UpdateTotalTurnoverDto,
  ): Promise<Responses.GetTOProgressResponse> {
    return this.bonusWinsService.updateTotalTurnover(
      updateDto.playerId,
      updateDto.operatorId,
      updateDto.siteName,
      updateDto.betAmount,
      updateDto.gameId,
      updateDto?.baseBetAmount || 0,
    );
  }

  @Post('get-to-progress')
  @ApiOperation({ summary: 'Get TO progress status for a player promotion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'TO progress status',
    type: Responses.GetTOProgressResponse,
  })
  async getTOProgress(
    @Body() progressDto: Models.GetTOProgressDto,
  ): Promise<Responses.GetTOProgressResponse> {
    return this.bonusWinsService.getTOProgress(
      progressDto.playerId,
      progressDto.operatorId,
      progressDto.siteName,
      progressDto.promotionId,
    );
  }

  @Post('claim-bonus-wins')
  @ApiOperation({ summary: 'Claim bonus wins after TO requirement is met' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bonus wins claim result',
    type: Responses.ClaimBonusWinsResponse,
  })
  async claimBonusWins(
    @Body() claimDto: Models.ClaimBonusWinsDto,
  ): Promise<Responses.ClaimBonusWinsResponse> {
    return this.bonusWinsService.claimBonusWins(
      claimDto.playerId,
      claimDto.operatorId,
      claimDto.siteName,
      claimDto.promotionId,
    );
  }

  @Post('complete-promotion')
  @ApiOperation({ summary: 'Complete a promotion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion completed successfully',
    type: Responses.PlayerPromotionResponse,
  })
  async completePromotion(
    @Body() completeDto: Models.CompletePromotionDto,
  ): Promise<Responses.GetTOProgressResponse> {
    return this.bonusWinsService.completePromotion(completeDto);
  }

  @Post('manual-claim-bonus-wins')
  @ApiOperation({
    summary: 'Manually claim bonus wins and award player (Admin Only)',
    description:
      'Admin-triggered bonus claim that performs claim logic and calls AwardAPI to reward player. Includes full audit logging.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Manual claim result with AwardAPI response',
    type: Responses.ManualClaimBonusWinsResponse,
  })
  async manualClaimBonusWins(
    @Body() manualClaimDto: Models.ManualClaimBonusWinsDto,
  ): Promise<Responses.ManualClaimBonusWinsResponse> {
    const result = await this.bonusWinsService.manualClaimBonusWins(
      manualClaimDto.promotionId,
      manualClaimDto.playerId,
      manualClaimDto.operatorId,
      manualClaimDto.siteId,
      manualClaimDto.siteName,
      manualClaimDto.currency,
      manualClaimDto.adminUserId,
      manualClaimDto.gameTypeId,
    );

    return result;
  }
}
