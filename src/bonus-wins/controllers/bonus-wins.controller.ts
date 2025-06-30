import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BonusWinsService } from '../services/bonus-wins.service';
import * as Models from '../../promotion/models';
import * as Responses from '../../promotion/responses';

@ApiTags('bonus-wins')
@Controller('bonus-wins')
export class BonusWinsController {
  constructor(private readonly bonusWinsService: BonusWinsService) {}

  @Post('update-total-win')
  @ApiOperation({ summary: 'Update total win amount for a player promotion (Stream Event)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total win amount update result',
    type: Responses.UpdateTotalWinResponse,
  })
  async updateTotalWinAmount(
    @Body() updateDto: Models.UpdateTotalWinDto,
  ): Promise<Responses.UpdateTotalWinResponse> {
    return this.bonusWinsService.updateTotalWinAmount(
      updateDto.playerId,
      updateDto.operatorId,
      updateDto.siteName,
      updateDto.promotionId,
      updateDto.winAmount,
    );
  }

  @Post('update-total-turnover')
  @ApiOperation({ summary: 'Update total turnover for a player promotion (Stream Event)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total turnover update result',
    type: Responses.UpdateTotalTurnoverResponse,
  })
  async updateTotalTurnover(
    @Body() updateDto: Models.UpdateTotalTurnoverDto,
  ): Promise<Responses.UpdateTotalTurnoverResponse> {
    return this.bonusWinsService.updateTotalTurnover(
      updateDto.playerId,
      updateDto.operatorId,
      updateDto.siteName,
      updateDto.promotionId,
      updateDto.betAmount,
    );
  }

  @Post('calculate-to-requirement')
  @ApiOperation({ summary: 'Calculate TO requirement for a player promotion (Stream Event)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'TO requirement calculation result',
    type: Responses.CalculateTORequirementResponse,
  })
  async calculateTORequirement(
    @Body() calculateDto: Models.CalculateTORequirementDto,
  ): Promise<Responses.CalculateTORequirementResponse> {
    return this.bonusWinsService.calculateTORequirement(
      calculateDto.playerId,
      calculateDto.operatorId,
      calculateDto.siteName,
      calculateDto.promotionId,
    );
  }

  @Post('check-to-requirement')
  @ApiOperation({ summary: 'Check if TO requirement is met for bonus claim' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'TO requirement validation result',
    type: Responses.CheckTORequirementResponse,
  })
  async checkTORequirement(
    @Body() checkDto: Models.CheckTORequirementDto,
  ): Promise<Responses.CheckTORequirementResponse> {
    return this.bonusWinsService.checkTORequirement(
      checkDto.playerId,
      checkDto.operatorId,
      checkDto.siteName,
      checkDto.promotionId,
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
}
