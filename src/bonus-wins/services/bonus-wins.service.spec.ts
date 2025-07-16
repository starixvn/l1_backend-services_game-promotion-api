import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BonusWinsService } from './bonus-wins.service';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { LoggerService } from '../../core/logger/logger.service';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import { UpdateTotalTurnoverResponse } from '../../promotion/responses/update-total-turnover.response';

describe('BonusWinsService', () => {
  let service: BonusWinsService;
  let playerPromotionModel: jest.Mocked<Model<PlayerPromotionDocument>>;
  let promotionModel: jest.Mocked<Model<PromotionDocument>>;
  let playerPromotionService: jest.Mocked<PlayerPromotionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonusWinsService,
        {
          provide: getModelToken(PlayerPromotion.name),
          useValue: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getModelToken(Promotion.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
          },
        },
        {
          provide: PlayerPromotionService,
          useValue: {
            findExistingPromotion: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BonusWinsService>(BonusWinsService);
    playerPromotionModel = module.get(getModelToken(PlayerPromotion.name));
    promotionModel = module.get(getModelToken(Promotion.name));
    playerPromotionService = module.get(PlayerPromotionService);
  });

  describe('getTOProgress', () => {
    it('should return progress percentage rounded to 2 decimal places', async () => {
      const mockPlayerPromotion = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
        totalTurnover: 66.6666666,
        minRequiredTurnover: 100,
        totalWinAmount: 25,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player1',
        'op1',
        'site1',
        'promo1',
      );

      expect(result.progressPercentage).toBe(66.67); // Should be rounded to 2 decimal places
      expect(result.totalTurnover).toBe(66.6666666);
      expect(result.minRequiredTurnover).toBe(100);
      expect(result.remainingTO).toBe(33.3333334); // Math.max(0, 100 - 66.6666666)
    });

    it('should return 100% progress when minRequiredTurnover is 0', async () => {
      const mockPlayerPromotion = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
        totalTurnover: 50,
        minRequiredTurnover: 0,
        totalWinAmount: 25,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player2',
        'op2',
        'site2',
        'promo2',
      );

      expect(result.progressPercentage).toBe(100); // Should be 100 when no TO required
      expect(result.canClaim).toBe(false); // canClaim is false when minRequiredTurnover = 0 (security measure)
      expect(result.remainingTO).toBe(0);
    });

    it('should handle complex decimal rounding correctly', async () => {
      const mockPlayerPromotion = {
        playerId: 'player3',
        operatorId: 'op3',
        siteName: 'site3',
        promotionId: 'promo3',
        totalTurnover: 33.333333,
        minRequiredTurnover: 150,
        totalWinAmount: 15,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player3',
        'op3',
        'site3',
        'promo3',
      );

      // 33.333333 / 150 * 100 = 22.222222 -> rounded to 22.22
      expect(result.progressPercentage).toBe(22.22);
      expect(result.totalTurnover).toBe(33.333333);
      expect(result.minRequiredTurnover).toBe(150);
    });

    it('should return exactly 100% when turnover meets requirement', async () => {
      const mockPlayerPromotion = {
        playerId: 'player4',
        operatorId: 'op4',
        siteName: 'site4',
        promotionId: 'promo4',
        totalTurnover: 100,
        minRequiredTurnover: 100,
        totalWinAmount: 20,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player4',
        'op4',
        'site4',
        'promo4',
      );

      expect(result.progressPercentage).toBe(100);
      expect(result.canClaim).toBe(true);
      expect(result.remainingTO).toBe(0);
    });

    it('should cap progress at 100% when turnover exceeds requirement', async () => {
      const mockPlayerPromotion = {
        playerId: 'player5',
        operatorId: 'op5',
        siteName: 'site5',
        promotionId: 'promo5',
        totalTurnover: 150,
        minRequiredTurnover: 100,
        totalWinAmount: 30,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player5',
        'op5',
        'site5',
        'promo5',
      );

      expect(result.progressPercentage).toBe(100); // Should be capped at 100%
      expect(result.canClaim).toBe(true);
      expect(result.remainingTO).toBe(0);
    });

    it('should handle edge case with very small percentages', async () => {
      const mockPlayerPromotion = {
        playerId: 'player6',
        operatorId: 'op6',
        siteName: 'site6',
        promotionId: 'promo6',
        totalTurnover: 0.01,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'player6',
        'op6',
        'site6',
        'promo6',
      );

      // 0.01 / 1000 * 100 = 0.001 -> rounded to 0.00
      expect(result.progressPercentage).toBe(0);
      expect(result.canClaim).toBe(false);
    });

    it('should return error when player promotion not found', async () => {
      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ claimExpirationDate: new Date() }),
        }),
      } as any);

      const result: GetTOProgressResponse = await service.getTOProgress(
        'nonexistent',
        'op1',
        'site1',
        'promo1',
      );

      expect(result.progressPercentage).toBe(0);
      expect(result.errorCode).toBe('SB3000');
      expect(result.errorMessage).toBe('Player promotion not found');
    });
  });

  describe('updateTotalTurnover', () => {
    it('should update total turnover when active bonus win exists', async () => {
      const mockActiveBonusWin = {
        _id: 'promo123',
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
        totalTurnover: 50,
        minRequiredTurnover: 100,
        totalWinAmount: 25,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      const mockUpdatedPromotion = {
        ...mockActiveBonusWin,
        totalTurnover: 75, // 50 + 25
      };

      playerPromotionService.findExistingPromotion.mockResolvedValue(mockActiveBonusWin as any);
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion as any);

      const result: UpdateTotalTurnoverResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
      );

      expect(result.success).toBe(true);
      expect(result.totalTurnover).toBe(75);
      expect(result.remainingTO).toBe(25); // 100 - 75
      expect(playerPromotionService.findExistingPromotion).toHaveBeenCalledWith(
        'player1',
        'op1',
        'site1',
      );
    });

    it('should return error when no active bonus win exists', async () => {
      playerPromotionService.findExistingPromotion.mockResolvedValue(null);

      const result: UpdateTotalTurnoverResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
      );

      expect(result.success).toBe(false);
      expect(result.totalTurnover).toBe(0);
      expect(result.remainingTO).toBe(0);
      expect(result.code).toBe('SB3022');
      expect(result.message).toBe('No active bonus win found for turnover tracking');
      expect(playerPromotionService.findExistingPromotion).toHaveBeenCalledWith(
        'player1',
        'op1',
        'site1',
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockActiveBonusWin = {
        _id: 'promo123',
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
        totalTurnover: 50,
        minRequiredTurnover: 100,
        totalWinAmount: 25,
        bonusClaimed: false,
        remainingBonusItems: 0,
      };

      playerPromotionService.findExistingPromotion.mockResolvedValue(mockActiveBonusWin as any);
      playerPromotionModel.findOneAndUpdate.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result: UpdateTotalTurnoverResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
      );

      expect(result.success).toBe(false);
      expect(result.totalTurnover).toBe(0);
      expect(result.remainingTO).toBe(0);
      expect(result.code).toBe('SB3014');
      expect(result.message).toBe('Failed to update total turnover');
    });
  });
});
