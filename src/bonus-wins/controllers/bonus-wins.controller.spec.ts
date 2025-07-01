import { Test, TestingModule } from '@nestjs/testing';
import { BonusWinsController } from './bonus-wins.controller';
import { BonusWinsService } from '../services/bonus-wins.service';
import { CheckTORequirementDto, GetTOProgressDto, ClaimBonusWinsDto } from '../../promotion/models';
import { CheckTORequirementResponse } from '../../promotion/responses/check-to-requirement.response';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { ClaimBonusWinsResponse } from '../../promotion/responses/claim-bonus-wins.response';

const mockBonusWinsService = {
  updateTotalTurnover: jest.fn(),
  checkTORequirement: jest.fn(),
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
        promotionId: 'promo1',
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
        dto.promotionId,
        dto.betAmount,
      );
    });

    it('should return error when update fails', async () => {
      const dto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
        betAmount: 50.0,
      };
      const response = {
        success: false,
        totalTurnover: 0,
        remainingTO: 0,
        code: 'SB3011',
        message: 'Failed to update total turnover',
      };
      service.updateTotalTurnover.mockResolvedValue(response);
      await expect(controller.updateTotalTurnover(dto)).resolves.toEqual(response);
    });
  });

  describe('checkTORequirement', () => {
    it('should return canClaim true when TO requirement is met', async () => {
      const dto: CheckTORequirementDto = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
      };
      const response: CheckTORequirementResponse = {
        success: true,
        canClaim: true,
        totalTurnover: 100,
        minRequiredTurnover: 100,
        remainingTO: 0,
        totalWinAmount: 50,
      };
      service.checkTORequirement.mockResolvedValue(response);
      await expect(controller.checkTORequirement(dto)).resolves.toEqual(response);
      expect(service.checkTORequirement).toHaveBeenCalledWith(
        dto.playerId,
        dto.operatorId,
        dto.siteName,
        dto.promotionId,
      );
    });

    it('should return canClaim false when TO requirement is not met', async () => {
      const dto: CheckTORequirementDto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
      };
      const response: CheckTORequirementResponse = {
        success: true,
        canClaim: false,
        totalTurnover: 40,
        minRequiredTurnover: 100,
        remainingTO: 60,
        totalWinAmount: 20,
      };
      service.checkTORequirement.mockResolvedValue(response);
      await expect(controller.checkTORequirement(dto)).resolves.toEqual(response);
    });

    it('should return error when player promotion not found', async () => {
      const dto: CheckTORequirementDto = {
        playerId: 'player3',
        operatorId: 'op3',
        siteName: 'site3',
        promotionId: 'promo3',
      };
      const response: CheckTORequirementResponse = {
        success: false,
        canClaim: false,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        totalWinAmount: 0,
        errorCode: 'SB3000',
        errorMessage: 'Player promotion not found',
      };
      service.checkTORequirement.mockResolvedValue(response);
      await expect(controller.checkTORequirement(dto)).resolves.toEqual(response);
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
        success: true,
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

    it('should return error when player promotion not found', async () => {
      const dto: GetTOProgressDto = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
      };
      const response: GetTOProgressResponse = {
        success: false,
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
        success: true,
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
        success: false,
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
        success: false,
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
