// Mock LogBuilder before imports
jest.mock('../../core/action-log/utils/log-builder', () => ({
  LogBuilder: {
    create: jest.fn().mockReturnValue({
      withRequest: jest.fn().mockReturnThis(),
      withResponse: jest.fn().mockReturnThis(),
      withError: jest.fn().mockReturnThis(),
      send: jest.fn().mockResolvedValue({}),
      sendToSentry: jest.fn().mockResolvedValue({}),
      sendToMongoDB: jest.fn().mockResolvedValue({}),
    }),
  },
}));

import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../../core/logger/logger.service';
import { ActionLogService } from '../../core/action-log/services/action-log.service';
import { LogBuilder } from '../../core/action-log/utils/log-builder';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import {
  PlayerFinishedPromotion,
  PlayerFinishedPromotionDocument,
} from '../../promotion/schemas/player-finished-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';
import { PromotionTicketService } from '../../promotion-ticket/services/promotion-ticket.service';
import {
  PromotionTicket,
  PromotionTicketDocument,
} from '../../promotion-ticket/schemas/promotion-ticket.schema';
import { BonusWinsService } from './bonus-wins.service';
import { AwardAPIService } from './award-api.service';

describe('BonusWinsService', () => {
  let service: BonusWinsService;
  let playerPromotionModel: jest.Mocked<Model<PlayerPromotionDocument>>;
  let playerFinishedPromotionModel: jest.Mocked<Model<PlayerFinishedPromotionDocument>>;
  let promotionModel: jest.Mocked<Model<PromotionDocument>>;
  let promotionTicketModel: jest.Mocked<Model<PromotionTicketDocument>>;
  let playerPromotionService: jest.Mocked<PlayerPromotionService>;
  let promotionTicketService: jest.Mocked<PromotionTicketService>;
  let awardAPIService: jest.Mocked<AwardAPIService>;

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
            deleteOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(PlayerFinishedPromotion.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Promotion.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(PromotionTicket.name),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: AwardAPIService,
          useValue: {
            awardPlayer: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            captureMessage: jest.fn(),
          },
        },
        {
          provide: ActionLogService,
          useValue: {
            saveLog: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PlayerPromotionService,
          useValue: {
            findExistingPromotion: jest.fn(),
            findPlayerPromotion: jest.fn(),
            findUniquePlayerPromotion: jest.fn(),
          },
        },
        {
          provide: PromotionTicketService,
          useValue: {
            calculateTotalWin: jest.fn(),
            markTicketAsClaimed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BonusWinsService>(BonusWinsService);
    playerPromotionModel = module.get(getModelToken(PlayerPromotion.name));
    playerFinishedPromotionModel = module.get(getModelToken(PlayerFinishedPromotion.name));
    promotionModel = module.get(getModelToken(Promotion.name));
    promotionTicketModel = module.get(getModelToken(PromotionTicket.name));
    playerPromotionService = module.get(PlayerPromotionService);
    promotionTicketService = module.get(PromotionTicketService);
    awardAPIService = module.get(AwardAPIService);
  });

  describe('getTOProgress', () => {
    it('should return progress percentage rounded to 2 decimal places', async () => {
      const mockPlayerPromotion = {
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ minTurnoverMultiplier: 2 }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 25,
        baseTotalWinAmount: 100,
      });

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
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 25,
        baseTotalWinAmount: 25,
      });

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
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 15,
        baseTotalWinAmount: 15,
      });

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
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 20,
        baseTotalWinAmount: 20,
      });

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
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 30,
        baseTotalWinAmount: 30,
      });

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
        _id: new Types.ObjectId(),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
        }),
      } as any);
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 50,
        baseTotalWinAmount: 50,
      });

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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
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

      const result: GetTOProgressResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
        1001,
        100,
      );

      expect(result.canClaim).toBe(false);
      expect(playerPromotionService.findExistingPromotion).toHaveBeenCalledWith(
        'player1',
        'op1',
        'site1',
        1001,
      );
    });

    it('should return error when no active bonus win exists', async () => {
      playerPromotionService.findExistingPromotion.mockResolvedValue(null);

      const result: GetTOProgressResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
        1001,
        100,
      );

      expect(result.progressPercentage).toBe(0);
      expect(result.canClaim).toBe(false);
      expect(result.totalWinAmount).toBe(0);
      expect(result.errorCode).toBe('SB3022');
      expect(playerPromotionService.findExistingPromotion).toHaveBeenCalledWith(
        'player1',
        'op1',
        'site1',
        1001,
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

      const result: GetTOProgressResponse = await service.updateTotalTurnover(
        'player1',
        'op1',
        'site1',
        25,
        1001,
        100,
      );

      expect(result.progressPercentage).toBe(0);
      expect(result.canClaim).toBe(false);
      expect(result.totalWinAmount).toBe(0);
      expect(result.errorCode).toBe('SB3022');
    });
  });

  describe('Floating Point Precision Tests', () => {
    describe('claimBonusWins - floating point edge cases', () => {
      it('should handle floating point precision issue with .99999993 in turnover calculation', async () => {
        // Scenario: totalTurnover is 99.99999993 which rounds to 100.0 (4 decimals)
        // roundToFourDecimals(99.99999993) = 100.0, so canClaim will be true
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp1',
          operatorId: 'op_fp1',
          siteName: 'site_fp1',
          promotionId: 'promo_fp1',
          totalTurnover: 99.99999993,
          minRequiredTurnover: 100,
          totalWinAmount: 50,
          bonusClaimed: false,
          claimedAt: null,
        };

        const mockPromotion = {
          _id: 'promo_fp1',
          minTurnoverMultiplier: 2,
          claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPromotion),
          }),
        } as any);

        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        // Mock the isClaimable method
        jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

        // Mock the processBonusClaim method
        jest.spyOn(service, 'processBonusClaim').mockResolvedValue({
          playerFinishedPromotion: {
            _id: new Types.ObjectId(),
            totalWinAmount: 50,
            totalTurnover: 99.99999993,
            minRequiredTurnover: 100,
          } as any,
          errorCode: undefined,
        });

        const result = await service.claimBonusWins(
          'player_fp1',
          'op_fp1',
          'site_fp1',
          'promo_fp1',
        );

        // roundToFourDecimals(99.99999993) = 100.0, so canClaim will be true
        // The claim should succeed (no error code expected)
        expect(result.errorCode).toBeUndefined();
        expect(result.claimedAmount).toBe(50);
      });

      it('should handle floating point precision with exact match after rounding', async () => {
        // Scenario: minRequiredTurnover calculated from 50 * 2.0000001 = 100.00000005
        // Should be rounded to 100.0000 (4 decimals) and match totalTurnover of 100
        // Mock the getTOProgress method
        jest.spyOn(service, 'getTOProgress').mockResolvedValue({
          totalTurnover: 100,
          minRequiredTurnover: 100,
          remainingTO: 0,
          progressPercentage: 100,
          canClaim: true,
          totalWinAmount: 50,
          errorCode: undefined,
        });

        // Mock the isClaimable method
        jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

        // Mock the processBonusClaim method
        jest.spyOn(service, 'processBonusClaim').mockResolvedValue({
          playerFinishedPromotion: {
            totalWinAmount: 50,
            totalTurnover: 100,
            minRequiredTurnover: 100,
          } as any,
          errorCode: undefined,
        });
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp2',
          operatorId: 'op_fp2',
          siteName: 'site_fp2',
          promotionId: 'promo_fp2',
          totalTurnover: 100,
          minRequiredTurnover: 100,
          totalWinAmount: 50,
          bonusClaimed: false,
          claimedAt: null,
        };

        const mockPromotion = {
          _id: 'promo_fp2',
          minTurnoverMultiplier: 2.0000001, // This creates floating point issue
          claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPromotion),
          }),
        } as any);

        // When calculating: 50 * 2.0000001 = 100.00000005
        // After rounding to 4 decimals: 100.0000
        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        playerFinishedPromotionModel.create.mockResolvedValue({
          ...mockPlayerPromotion,
          bonusClaimed: true,
          claimedAt: new Date(),
          totalWinAmount: 50,
        } as any);

        playerPromotionModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

        // Mock the getMaxRedemptionCount method
        playerFinishedPromotionModel.findOne.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ redemptionCount: 0 }),
              }),
            }),
          }),
        } as any);

        const result = await service.claimBonusWins(
          'player_fp2',
          'op_fp2',
          'site_fp2',
          'promo_fp2',
        );

        // Should be claimable because after rounding: 100 >= 100.0000
        expect(result.claimedAmount).toBe(50);
      });

      it('should handle very small floating point number .000000000003', async () => {
        // Scenario: Very tiny turnover amount
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp3',
          operatorId: 'op_fp3',
          siteName: 'site_fp3',
          promotionId: 'promo_fp3',
          totalTurnover: 0.000000000003,
          minRequiredTurnover: 100,
          totalWinAmount: 50,
          bonusClaimed: false,
          claimedAt: null,
        };

        const mockPromotion = {
          _id: 'promo_fp3',
          minTurnoverMultiplier: 2,
          claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPromotion),
          }),
        } as any);

        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        const result = await service.claimBonusWins(
          'player_fp3',
          'op_fp3',
          'site_fp3',
          'promo_fp3',
        );

        // Should not be claimable due to insufficient turnover
        expect(result.errorCode).toBe('SB3024'); // CLAIM_TO_REQUIREMENT_NOT_MET
        expect(result.claimedAmount).toBe(0);
      });

      it('should handle win amount with floating point .99999993', async () => {
        // Scenario: Win amount is 49.99999993, multiplier is 2
        // minRequiredTurnover = 49.99999993 * 2 = 99.99999986 -> rounds to 100.0000
        // Mock the getTOProgress method
        jest.spyOn(service, 'getTOProgress').mockResolvedValue({
          totalTurnover: 100,
          minRequiredTurnover: 100,
          remainingTO: 0,
          progressPercentage: 100,
          canClaim: true,
          totalWinAmount: 50,
          errorCode: undefined,
        });

        // Mock the isClaimable method
        jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

        // Mock the processBonusClaim method
        jest.spyOn(service, 'processBonusClaim').mockResolvedValue({
          playerFinishedPromotion: {
            totalWinAmount: 49.99999993,
            totalTurnover: 100,
            minRequiredTurnover: 100,
          } as any,
          errorCode: undefined,
        });
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp4',
          operatorId: 'op_fp4',
          siteName: 'site_fp4',
          promotionId: 'promo_fp4',
          totalTurnover: 100,
          minRequiredTurnover: 100,
          totalWinAmount: 49.99999993,
          bonusClaimed: false,
          claimedAt: null,
        };

        const mockPromotion = {
          _id: 'promo_fp4',
          minTurnoverMultiplier: 2,
          claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPromotion),
          }),
        } as any);

        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 49.99999993,
          baseTotalWinAmount: 49.99999993,
        });

        playerFinishedPromotionModel.create.mockResolvedValue({
          ...mockPlayerPromotion,
          bonusClaimed: true,
          claimedAt: new Date(),
          totalWinAmount: 49.99999993,
        } as any);

        playerPromotionModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

        // Mock the getMaxRedemptionCount method
        playerFinishedPromotionModel.findOne.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ redemptionCount: 0 }),
              }),
            }),
          }),
        } as any);

        const result = await service.claimBonusWins(
          'player_fp4',
          'op_fp4',
          'site_fp4',
          'promo_fp4',
        );

        // After rounding to 4 decimals: 50.0000 (win) * 2.0 = 100.0000
        // totalTurnover 100 >= 100.0000, should be claimable
        expect(result.claimedAmount).toBe(49.99999993);
      });

      it('should handle complex multiplication resulting in floating point precision error', async () => {
        // Scenario: 33.33333333 * 3 = 99.99999999 which should round to 100.0000
        // Mock the getTOProgress method
        jest.spyOn(service, 'getTOProgress').mockResolvedValue({
          totalTurnover: 100,
          minRequiredTurnover: 100,
          remainingTO: 0,
          progressPercentage: 100,
          canClaim: true,
          totalWinAmount: 50,
          errorCode: undefined,
        });

        // Mock the isClaimable method
        jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

        // Mock the processBonusClaim method
        jest.spyOn(service, 'processBonusClaim').mockResolvedValue({
          playerFinishedPromotion: {
            totalWinAmount: 33.33333333,
            totalTurnover: 100,
            minRequiredTurnover: 100,
          } as any,
          errorCode: undefined,
        });
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp5',
          operatorId: 'op_fp5',
          siteName: 'site_fp5',
          promotionId: 'promo_fp5',
          totalTurnover: 100.00001, // Slightly over
          minRequiredTurnover: 100,
          totalWinAmount: 33.33333333,
          bonusClaimed: false,
          claimedAt: null,
        };

        const mockPromotion = {
          _id: 'promo_fp5',
          minTurnoverMultiplier: 3,
          claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPromotion),
          }),
        } as any);

        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 33.33333333,
          baseTotalWinAmount: 33.33333333,
        });

        playerFinishedPromotionModel.create.mockResolvedValue({
          ...mockPlayerPromotion,
          bonusClaimed: true,
          claimedAt: new Date(),
          totalWinAmount: 33.33333333,
        } as any);

        playerPromotionModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

        // Mock the getMaxRedemptionCount method
        playerFinishedPromotionModel.findOne.mockReturnValue({
          sort: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ redemptionCount: 0 }),
              }),
            }),
          }),
        } as any);

        const result = await service.claimBonusWins(
          'player_fp5',
          'op_fp5',
          'site_fp5',
          'promo_fp5',
        );

        // 33.33333333 * 3 = 99.99999999 -> rounds to 100.0000
        // totalTurnover 100.00001 >= 100.0000, should be claimable
        expect(result.claimedAmount).toBe(33.33333333);
      });
    });

    describe('getTOProgress - floating point edge cases', () => {
      it('should handle remainingTO calculation with floating point precision', async () => {
        // minRequiredTurnover = 100.00000005, totalTurnover = 50
        // remainingTO = 100.00000005 - 50 = 50.00000005 (should not round automatically)
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp6',
          operatorId: 'op_fp6',
          siteName: 'site_fp6',
          promotionId: 'promo_fp6',
          totalTurnover: 50,
          minRequiredTurnover: 100.00000005,
          totalWinAmount: 50,
          bonusClaimed: false,
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            }),
          }),
        } as any);
        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        const result = await service.getTOProgress('player_fp6', 'op_fp6', 'site_fp6', 'promo_fp6');

        // remainingTO should preserve floating point (not rounded in getTOProgress)
        expect(result.remainingTO).toBe(50.00000005);
        expect(result.canClaim).toBe(false);
      });

      it('should calculate progress percentage correctly with floating point numbers', async () => {
        // totalTurnover = 99.99999993, minRequiredTurnover = 100
        // Progress = (99.99999993 / 100) * 100 = 99.99999993% -> rounds to 100.00%
        // roundToFourDecimals(99.99999993) = 100.0, so canClaim will be true
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp7',
          operatorId: 'op_fp7',
          siteName: 'site_fp7',
          promotionId: 'promo_fp7',
          totalTurnover: 99.99999993,
          minRequiredTurnover: 100,
          totalWinAmount: 50,
          bonusClaimed: false,
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            }),
          }),
        } as any);
        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        const result = await service.getTOProgress('player_fp7', 'op_fp7', 'site_fp7', 'promo_fp7');

        // Progress percentage rounds to 2 decimals: 100.00%
        expect(result.progressPercentage).toBe(100);
        // roundToFourDecimals(99.99999993) = 100.0, so canClaim will be true
        expect(result.canClaim).toBe(true);
        expect(result.remainingTO).toBeCloseTo(0.00000007, 8);
      });

      it('should handle very small remainingTO with floating point', async () => {
        // minRequiredTurnover = 100, totalTurnover = 99.99999999
        // remainingTO = 0.00000001 (very small number)
        // roundToFourDecimals(99.99999999) = 100.0, so canClaim will be true
        const mockPlayerPromotion = {
          _id: new Types.ObjectId(),
          playerId: 'player_fp8',
          operatorId: 'op_fp8',
          siteName: 'site_fp8',
          promotionId: 'promo_fp8',
          totalTurnover: 99.99999999,
          minRequiredTurnover: 100,
          totalWinAmount: 50,
          bonusClaimed: false,
        };

        playerPromotionModel.findOne.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
          }),
        } as any);

        promotionModel.findById.mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            }),
          }),
        } as any);
        promotionTicketService.calculateTotalWin.mockResolvedValue({
          totalWinAmount: 50,
          baseTotalWinAmount: 50,
        });

        const result = await service.getTOProgress('player_fp8', 'op_fp8', 'site_fp8', 'promo_fp8');

        // remainingTO should be very small but positive
        expect(result.remainingTO).toBeGreaterThan(0);
        expect(result.remainingTO).toBeLessThan(0.01);
        // roundToFourDecimals(99.99999999) = 100.0, so canClaim will be true
        expect(result.canClaim).toBe(true);
      });
    });

    describe('manualClaimBonusWins', () => {
      const mockPromotionId = 'promo123';
      const mockPlayerId = 'player123';
      const mockOperatorId = 'op123';
      const mockSiteId = 'site123';
      const mockSiteName = 'siteName123';
      const mockCurrency = 'USD';
      const mockAdminUserId = 'admin123';
      const mockGameTypeId = 9999;

      const mockClaimResult = {
        claimedAmount: 25.99,
        totalTurnover: 100,
        minRequiredTurnover: 100,
        totalWinAmount: 25.99,
      };

      const mockAwardResult = {
        success: true,
        message: 'Award processed successfully',
        transactionId: 'TXN123456',
        errorCode: 0,
      };

      beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock successful claim
        (service as any).claimBonusWins = jest.fn().mockResolvedValue(mockClaimResult);

        // Mock successful award
        awardAPIService.awardPlayer.mockResolvedValue(mockAwardResult);

        // Mock logger
        (service as any).loggerService.captureMessage = jest.fn();
      });

      it('should successfully process manual claim with AwardAPI call', async () => {
        const result = await service.manualClaimBonusWins(
          mockPromotionId,
          mockPlayerId,
          mockOperatorId,
          mockSiteId,
          mockSiteName,
          mockCurrency,
          mockAdminUserId,
          mockGameTypeId,
        );

        // Verify claim was called
        expect((service as any).claimBonusWins).toHaveBeenCalledWith(
          mockPlayerId,
          mockOperatorId,
          mockSiteName,
          mockPromotionId,
          true,
        );

        // Verify AwardAPI was called with correct parameters
        expect(awardAPIService.awardPlayer).toHaveBeenCalledWith({
          playerId: mockPlayerId,
          amount: mockClaimResult.claimedAmount,
          promotionId: mockPromotionId,
          currency: mockCurrency,
          siteId: mockSiteId,
          gameTypeId: mockGameTypeId,
          operatorId: mockOperatorId,
        });

        // Verify logging was called
        expect((service as any).loggerService.captureMessage).toHaveBeenCalledWith(
          'manual-claim-bonus-wins',
          'fatal',
          expect.objectContaining({
            action: 'manual-claim-bonus-wins',
            adminUserId: mockAdminUserId,
            playerId: mockPlayerId,
            operatorId: mockOperatorId,
            siteName: mockSiteName,
            promotionId: mockPromotionId,
            currency: mockCurrency,
            claimedAmount: mockClaimResult.claimedAmount,
            gameTypeId: mockGameTypeId,
            awardAPISuccess: mockAwardResult.success,
            awardAPIErrorCode: mockAwardResult.errorCode,
          }),
        );

        // Verify response structure (simplified - only success, claimedAmount, errorCode, errorMessage)
        expect(result).toEqual({
          success: true,
          claimedAmount: mockClaimResult.claimedAmount,
          errorCode: undefined,
          errorMessage: undefined,
        });
      });

      it('should return error when claim fails and not call AwardAPI', async () => {
        const claimError = { errorCode: 'SB3005', errorMessage: 'TO requirement not met' };
        (service as any).claimBonusWins = jest.fn().mockResolvedValue(claimError);

        const result = await service.manualClaimBonusWins(
          mockPromotionId,
          mockPlayerId,
          mockOperatorId,
          mockSiteId,
          mockSiteName,
          mockCurrency,
          mockAdminUserId,
          mockGameTypeId,
        );

        // Verify claim was called but AwardAPI was not
        expect((service as any).claimBonusWins).toHaveBeenCalled();
        expect(awardAPIService.awardPlayer).not.toHaveBeenCalled();
        expect((service as any).loggerService.captureMessage).not.toHaveBeenCalled();

        // Verify error response (simplified response)
        expect(result).toEqual({
          success: false,
          claimedAmount: 0,
          errorCode: claimError.errorCode,
          errorMessage: claimError.errorMessage,
        });
      });

      it('should handle AwardAPI failure with proper error code', async () => {
        const failedAwardResult = {
          success: false,
          message: 'AwardAPI error',
          transactionId: undefined,
          errorCode: 1001,
        };
        awardAPIService.awardPlayer.mockResolvedValue(failedAwardResult);

        const result = await service.manualClaimBonusWins(
          mockPromotionId,
          mockPlayerId,
          mockOperatorId,
          mockSiteId,
          mockSiteName,
          mockCurrency,
          mockAdminUserId,
          mockGameTypeId,
        );

        // Verify response indicates AwardAPI failure (simplified response)
        // Claim succeeded but AwardAPI failed, so claimedAmount is from claimResult
        expect(result).toEqual({
          success: false,
          claimedAmount: mockClaimResult.claimedAmount,
          errorCode: 'SB3033', // MANUAL_CLAIM_AWARD_API_FAILED
          errorMessage: 'AwardAPI error',
        });
      });

      it('should handle unexpected errors with proper error handling', async () => {
        const error = new Error('Unexpected error');
        (service as any).claimBonusWins = jest.fn().mockRejectedValue(error);

        // Mock error logging
        (service as any).loggerService.error = jest.fn();

        const result = await service.manualClaimBonusWins(
          mockPromotionId,
          mockPlayerId,
          mockOperatorId,
          mockSiteId,
          mockSiteName,
          mockCurrency,
          mockAdminUserId,
          mockGameTypeId,
        );

        // Verify error logging
        expect((service as any).loggerService.error).toHaveBeenCalledWith(
          'Error in manualClaimBonusWins',
          error.stack,
          expect.any(Object),
        );

        // Verify error response (simplified response)
        expect(result).toEqual({
          success: false,
          claimedAmount: 0,
          errorCode: 'SB3032', // MANUAL_CLAIM_FAILED
          errorMessage: expect.stringContaining('Unexpected error'),
        });
      });
    });
  });

  describe('claimBonusWins', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully claim bonus and log success', async () => {
      const mockPlayerPromotion = {
        playerId: 'player1',
        operatorId: 'op1',
        siteName: 'site1',
        promotionId: 'promo1',
        totalTurnover: 100,
        minRequiredTurnover: 100,
        totalWinAmount: 50,
        bonusClaimed: false,
        claimedAt: null,
      };

      const mockPromotion = {
        _id: 'promo1',
        minTurnoverMultiplier: 2,
        claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // Mock getTOProgress
      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);

      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotion),
        }),
      } as any);

      // Mock isClaimable
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 50,
        baseTotalWinAmount: 100,
      });

      // Mock successful update (return with proper structure for lean+exec)
      const updatedPromotion = {
        ...mockPlayerPromotion,
        bonusClaimed: true,
        claimedAt: new Date(),
      };

      playerPromotionModel.findOneAndUpdate.mockReturnValueOnce(updatedPromotion as any);

      const result = await service.claimBonusWins('player1', 'op1', 'site1', 'promo1');

      // Verify success response
      expect(result.claimedAmount).toBe(50);
      expect(result.totalTurnover).toBe(100);
      expect(result.totalWinAmount).toBe(50);
      expect(result.errorCode).toBeUndefined();

      // Verify LogBuilder was called for success
      expect(LogBuilder.create).toHaveBeenCalledWith(
        'op1',
        'claim-bonus-win',
        expect.anything(),
        expect.anything(),
      );
      const mockBuilderInstance = (LogBuilder.create as jest.Mock).mock.results[0].value;
      expect(mockBuilderInstance.withRequest).toHaveBeenCalledWith({
        playerId: 'player1',
        siteName: 'site1',
        promotionId: 'promo1',
      });
      expect(mockBuilderInstance.withResponse).toHaveBeenCalled();
      expect(mockBuilderInstance.send).toHaveBeenCalled();
    });

    it('should log error when TO requirement not met', async () => {
      const mockPlayerPromotion = {
        playerId: 'player2',
        operatorId: 'op2',
        siteName: 'site2',
        promotionId: 'promo2',
        totalTurnover: 50,
        minRequiredTurnover: 100,
        totalWinAmount: 50,
        bonusClaimed: false,
        claimedAt: null,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);

      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }),
        }),
      } as any);

      const result = await service.claimBonusWins('player2', 'op2', 'site2', 'promo2');

      // Verify error response - should return error
      expect(result.claimedAmount).toBe(0);
      expect(result.errorCode).toBeDefined();

      // Verify LogBuilder was called
      expect(LogBuilder.create).toHaveBeenCalled();
      expect(LogBuilder.create).toHaveBeenCalledWith(
        'op2',
        'claim-bonus-win',
        expect.anything(),
        expect.anything(),
      );
    });

    it('should log error when player promotion not found', async () => {
      // Mock getTOProgress to return error
      jest.spyOn(service, 'getTOProgress').mockResolvedValueOnce({
        totalTurnover: 0,
        minRequiredTurnover: 0,
        remainingTO: 0,
        progressPercentage: 0,
        canClaim: false,
        totalWinAmount: 0,
        errorCode: 'SB3000',
      });

      const result = await service.claimBonusWins('player3', 'op3', 'site3', 'promo3');

      // Verify error response - should be the errorCode from getTOProgress
      expect(result.errorCode).toBe('SB3000'); // PLAYER_PROMOTION_NOT_FOUND
      expect(result.claimedAmount).toBe(0);

      // Verify LogBuilder was called with error
      expect(LogBuilder.create).toHaveBeenCalled();
      const mockBuilderInstance = (LogBuilder.create as jest.Mock).mock.results[
        (LogBuilder.create as jest.Mock).mock.calls.length - 1
      ].value;
      expect(mockBuilderInstance.withError).toHaveBeenCalledWith(
        'SB3000',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should log error when claim update fails', async () => {
      const toProgressResult = {
        totalTurnover: 100,
        minRequiredTurnover: 100,
        remainingTO: 0,
        progressPercentage: 100,
        canClaim: true,
        totalWinAmount: 50,
      };

      // Mock getTOProgress to return success
      jest.spyOn(service, 'getTOProgress').mockResolvedValueOnce(toProgressResult);

      // Mock isClaimable
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            minTurnoverMultiplier: 2,
          }),
        }),
      } as any);

      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 50,
        baseTotalWinAmount: 100,
      });

      // Mock update failure (already claimed by another request)
      playerPromotionModel.findOneAndUpdate.mockReturnValueOnce(null as any);

      const result = await service.claimBonusWins('player4', 'op4', 'site4', 'promo4');

      // Verify error response
      expect(result.errorCode).toBe('SB3026'); // CLAIM_UPDATE_FAILED
      expect(result.claimedAmount).toBe(0);

      // Verify LogBuilder was called with error
      const mockBuilderInstance = (LogBuilder.create as jest.Mock).mock.results[
        (LogBuilder.create as jest.Mock).mock.calls.length - 1
      ].value;
      expect(mockBuilderInstance.withError).toHaveBeenCalledWith(
        'SB3026',
        'Claim update failed',
        'Failed to update promotion as claimed (promotion not found or already claimed)',
        expect.any(Object),
      );
    });

    it('should log error when verification fails', async () => {
      const mockPlayerPromotion = {
        playerId: 'player5',
        operatorId: 'op5',
        siteName: 'site5',
        promotionId: 'promo5',
        totalTurnover: 100,
        minRequiredTurnover: 100,
        totalWinAmount: 50,
        bonusClaimed: false,
        claimedAt: null,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      } as any);

      // Mock promotion with minTurnoverMultiplier
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'promo5',
            minTurnoverMultiplier: 2,
            claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }),
        }),
      } as any);

      // Mock verification failure (actual win amount doesn't match)
      promotionTicketService.calculateTotalWin.mockResolvedValue({
        totalWinAmount: 30, // Different from stored amount (50)
        baseTotalWinAmount: 60,
      });

      const result = await service.claimBonusWins('player5', 'op5', 'site5', 'promo5');

      // Verify error response - should return error
      expect(result.claimedAmount).toBe(0);
      expect(result.errorCode).toBeDefined();

      // Verify LogBuilder was called
      expect(LogBuilder.create).toHaveBeenCalled();
      expect(LogBuilder.create).toHaveBeenCalledWith(
        'op5',
        'claim-bonus-win',
        expect.anything(),
        expect.anything(),
      );
    });

    it('should log unexpected error when exception occurs', async () => {
      // Mock getTOProgress to throw exception
      jest
        .spyOn(service, 'getTOProgress')
        .mockRejectedValueOnce(new Error('Database connection lost'));

      const result = await service.claimBonusWins('player6', 'op6', 'site6', 'promo6');

      // Verify error response
      expect(result.errorCode).toBe('SB3029'); // CLAIM_UNEXPECTED_ERROR
      expect(result.claimedAmount).toBe(0);

      // Verify LogBuilder was called with error
      expect(LogBuilder.create).toHaveBeenCalled();
      const mockBuilderInstance = (LogBuilder.create as jest.Mock).mock.results[
        (LogBuilder.create as jest.Mock).mock.calls.length - 1
      ].value;
      expect(mockBuilderInstance.withError).toHaveBeenCalledWith(
        'SB3029',
        'Unexpected error during claim',
        expect.stringContaining('Database connection lost'),
      );
    });
  });
});
