import { Test, TestingModule } from '@nestjs/testing';
import { ClaimBonusWinsDto, GetTOProgressDto } from '../../promotion/models';
import { ClaimBonusWinsResponse } from '../../promotion/responses/claim-bonus-wins.response';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { BonusWinsService } from '../services/bonus-wins.service';
import { BonusWinsController } from './bonus-wins.controller';

const mockBonusWinsService = {
  updateTotalTurnover: jest.fn(),
  getTOProgress: jest.fn(),
  claimBonusWins: jest.fn(),
};

describe('BonusWinsController', () => {
  let controller: BonusWinsController;
  let service: typeof mockBonusWinsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BonusWinsController],
      providers: [
        {
          provide: BonusWinsService,
          useValue: mockBonusWinsService,
        },
      ],
    }).compile();

    controller = module.get<BonusWinsController>(BonusWinsController);
    service = module.get(BonusWinsService);
    jest.clearAllMocks();
  });

  describe('updateTotalTurnover', () => {
    it('should update total turnover successfully', async () => {
      const dto = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        betAmount: 100.0,
      };
      const response = {
        success: true,
        totalTurnover: 500.0,
        remainingTO: 200.0,
      };
      service.updateTotalTurnover.mockResolvedValue(response);
      await expect(controller.updateTotalTurnover(dto)).resolves.toEqual(response);
      expect(service.updateTotalTurnover).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.betAmount,
      );
    });

    it('should return error when update fails', async () => {
      const dto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        betAmount: 50.0,
      };
      const response = {
        success: false,
        totalTurnover: 0,
        remainingTO: 0,
        code: 'SB3014',
        message: 'Failed to update total turnover',
      };
      service.updateTotalTurnover.mockResolvedValue(response);
      await expect(controller.updateTotalTurnover(dto)).resolves.toEqual(response);
    });

    it('should return error when no active bonus win found', async () => {
      const dto = {
        playerId: 'player3',
        operatorId: 'op3',
        siteName: 'site3',
        betAmount: 25.0,
      };
      const response = {
        success: false,
        totalTurnover: 0,
        remainingTO: 0,
        code: 'SB3022',
        message: 'No active bonus win found for turnover tracking',
      };
      service.updateTotalTurnover.mockResolvedValue(response);
      await expect(controller.updateTotalTurnover(dto)).resolves.toEqual(response);
      expect(service.updateTotalTurnover).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.betAmount,
      );
    });
  });

  describe('getTOProgress', () => {
    it('should return progress and canClaim', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
      };
      const response: GetTOProgressResponse = {
        totalTurnover: 80,
        minRequiredTurnover: 100,
        remainingTO: 20,
        progressPercentage: 80,
        canClaim: false,
        totalWinAmount: 30,
      };
      service.getTOProgress.mockResolvedValue(response);
      await expect(controller.getTOProgress(dto)).resolves.toEqual(response);
      expect(service.getTOProgress).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.promotionId,
      );
    });

    it('should return progress percentage rounded to 2 decimal places', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
      };
      const response: GetTOProgressResponse = {
        totalTurnover: 66.67,
        minRequiredTurnover: 100,
        remainingTO: 33.33,
        progressPercentage: 66.67, // Should be rounded to 2 decimal places
        canClaim: false,
        totalWinAmount: 25,
      };
      service.getTOProgress.mockResolvedValue(response);
      await expect(controller.getTOProgress(dto)).resolves.toEqual(response);
    });

    it('should return 100% progress when minRequiredTurnover is 0', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player3',
        operatorId: 'op3',
        siteName: 'site3',
        promotionId: 'promo3',
      };
      const response: GetTOProgressResponse = {
        totalTurnover: 50,
        minRequiredTurnover: 0,
        remainingTO: 0,
        progressPercentage: 100, // Should be 100 when no TO required
        canClaim: true,
        totalWinAmount: 25,
      };
      service.getTOProgress.mockResolvedValue(response);
      await expect(controller.getTOProgress(dto)).resolves.toEqual(response);
    });

    it('should return progress percentage with proper rounding for complex decimals', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player4',
        operatorId: 'op4',
        siteName: 'site4',
        promotionId: 'promo4',
      };
      const response: GetTOProgressResponse = {
        totalTurnover: 33.33,
        minRequiredTurnover: 150,
        remainingTO: 116.67,
        progressPercentage: 22.22, // 33.33/150 * 100 = 22.22%
        canClaim: false,
        totalWinAmount: 15,
      };
      service.getTOProgress.mockResolvedValue(response);
      await expect(controller.getTOProgress(dto)).resolves.toEqual(response);
    });

    it('should return error when player promotion not found', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player5',
        operatorId: 'op5',
        siteName: 'site5',
        promotionId: 'promo5',
      };
      const response: GetTOProgressResponse = {
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        progressPercentage: 0,
        canClaim: false,
        totalWinAmount: 0,
        errorCode: 'SB3000',
        errorMessage: 'Player promotion not found',
      };
      service.getTOProgress.mockResolvedValue(response);
      await expect(controller.getTOProgress(dto)).resolves.toEqual(response);
    });
  });

  describe('claimBonusWins', () => {
    it('should return success response when claim bonus wins is successful', async () => {
      const dto: ClaimBonusWinsDto = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
      };
      const response: ClaimBonusWinsResponse = {
        claimedAmount: 25.0,
        totalTurnover: 100.0,
        minRequiredTurnover: 100.0,
        totalWinAmount: 25.0,
      };
      service.claimBonusWins.mockResolvedValue(response);
      await expect(controller.claimBonusWins(dto)).resolves.toEqual(response);
      expect(service.claimBonusWins).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.promotionId,
      );
    });

    it('should return error when claim bonus wins fails', async () => {
      const dto: ClaimBonusWinsDto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
      };
      const response: ClaimBonusWinsResponse = {
        claimedAmount: 0,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        totalWinAmount: 0,
        errorCode: 'SB3017',
        errorMessage: 'Failed to claim bonus wins',
      };
      service.claimBonusWins.mockResolvedValue(response);
      await expect(controller.claimBonusWins(dto)).resolves.toEqual(response);
    });

    it('should allow claim when minRequiredTurnover is 0', async () => {
      const dto: ClaimBonusWinsDto = {
        playerId: 'player3',
        operatorId: 'op3',
        siteName: 'site3',
        promotionId: 'promo3',
      };
      const response: ClaimBonusWinsResponse = {
        claimedAmount: 0,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        totalWinAmount: 0,
        errorCode: 'SB3017',
        errorMessage: 'Failed to claim bonus wins',
      };
      service.claimBonusWins.mockResolvedValue(response);
      await expect(controller.claimBonusWins(dto)).resolves.toEqual(response);
      expect(service.claimBonusWins).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.promotionId,
      );
    });
  });
});
