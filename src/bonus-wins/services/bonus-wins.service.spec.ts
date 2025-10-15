import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { LoggerService } from '../../core/logger/logger.service';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { GetTOProgressResponse } from '../../promotion/responses/get-to-progress.response';
import {
  PlayerPromotion,
  PlayerPromotionDocument,
} from '../../promotion/schemas/player-promotion.schema';
import { Promotion, PromotionDocument } from '../../promotion/schemas/promotion.schema';
import { PlayerPromotionService } from '../../promotion/services/player-promotion.service';
import { PromotionTicketService } from '../../promotion-ticket/services/promotion-ticket.service';
import {
  PromotionTicket,
  PromotionTicketDocument,
} from '../../promotion-ticket/schemas/promotion-ticket.schema';
import { BonusWinsService } from './bonus-wins.service';

describe('BonusWinsService', () => {
  let service: BonusWinsService;
  let playerPromotionModel: jest.Mocked<Model<PlayerPromotionDocument>>;
  let promotionModel: jest.Mocked<Model<PromotionDocument>>;
  let promotionTicketModel: jest.Mocked<Model<PromotionTicketDocument>>;
  let playerPromotionService: jest.Mocked<PlayerPromotionService>;
  let promotionTicketService: jest.Mocked<PromotionTicketService>;
  let loggerService: jest.Mocked<LoggerService>;

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
          provide: getModelToken(PromotionTicket.name),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: PlayerPromotionService,
          useValue: {
            findExistingPromotion: jest.fn(),
          },
        },
        {
          provide: PromotionTicketService,
          useValue: {
            calculateTotalWin: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BonusWinsService>(BonusWinsService);
    playerPromotionModel = module.get(getModelToken(PlayerPromotion.name));
    promotionModel = module.get(getModelToken(Promotion.name));
    promotionTicketModel = module.get(getModelToken(PromotionTicket.name));
    playerPromotionService = module.get(PlayerPromotionService);
    promotionTicketService = module.get(PromotionTicketService);
    loggerService = module.get(LoggerService);
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
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
          exec: jest
            .fn()
            .mockResolvedValue({ claimExpirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000) }),
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

  describe('claimBonusWins', () => {
    const playerId = 'PLAYER123';
    const operatorId = 'ONEworksVGCash';
    const siteName = 'casino.com';
    const promotionId = 'PROMO456';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully claim bonus wins and log success', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: true,
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 0,
        progressPercentage: 120,
        errorCode: undefined,
      };

      const mockUpdatedPromotion = {
        playerId,
        operatorId,
        siteName,
        promotionId,
        bonusClaimed: true,
        claimedAt: new Date(),
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion as any);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.claimedAmount).toBe(50);
      expect(result.errorCode).toBeUndefined();
      expect(loggerService.log).toHaveBeenCalledWith(
        'Player attempting to claim bonus wins',
        false,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          request: {
            playerId,
            siteName,
            promotionId,
          },
        }),
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        'Bonus wins claimed successfully',
        false,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            claimedAmount: 50,
            totalTurnover: 1200,
            minRequiredTurnover: 1000,
          }),
        }),
      );
    });

    it('should log error when TO progress check fails', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: false,
        totalTurnover: 0,
        minRequiredTurnover: 0,
        totalWinAmount: 0,
        remainingTO: 0,
        progressPercentage: 0,
        errorCode: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.errorCode).toBe(PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Claim bonus wins failed: TO progress check failed',
        undefined,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            errorCode: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
            errorMessage: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.message,
            errorDescription: PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.description,
          }),
        }),
      );
    });

    it('should log error when TO requirement not met', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: false,
        totalTurnover: 500,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 500,
        progressPercentage: 50,
        errorCode: undefined,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.errorCode).toBe(PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Claim bonus wins failed: TO requirement not met',
        undefined,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            claimedAmount: 0,
            totalTurnover: 500,
            minRequiredTurnover: 1000,
            remainingTO: 500,
            progressPercentage: 50,
            errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code,
            errorMessage: PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.message,
            errorDescription: PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.description,
          }),
        }),
      );
    });

    it('should log error when claim verification fails', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: true,
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 0,
        progressPercentage: 120,
        errorCode: undefined,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(false);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.errorCode).toBe(PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.code);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Claim bonus wins failed: Claim verification failed',
        undefined,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.code,
            errorMessage: PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.message,
            errorDescription: PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.description,
          }),
        }),
      );
    });

    it('should log error when database update fails', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: true,
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 0,
        progressPercentage: 120,
        errorCode: undefined,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.errorCode).toBe(PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.code);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Claim bonus wins failed: Database update failed',
        undefined,
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.code,
            errorMessage: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.message,
            errorDescription: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.description,
          }),
        }),
      );
    });

    it('should log error when unexpected error occurs', async () => {
      // Arrange
      const error = new Error('Database connection timeout');
      jest.spyOn(service, 'getTOProgress').mockRejectedValue(error);

      // Act
      const result = await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(result.errorCode).toBe(PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code);
      expect(loggerService.error).toHaveBeenCalledWith(
        'Claim bonus wins failed: Unexpected error',
        expect.any(String),
        expect.objectContaining({
          operatorId,
          action: 'claim-bonus-win',
          response: expect.objectContaining({
            claimedAmount: 0,
            error: 'Database connection timeout',
            errorCode: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code,
            errorMessage: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.message,
            errorDescription: PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.description,
          }),
        }),
      );
    });

    it('should use LogBuilder with correct structure', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: true,
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 0,
        progressPercentage: 120,
        errorCode: undefined,
      };

      const mockUpdatedPromotion = {
        playerId,
        operatorId,
        siteName,
        promotionId,
        bonusClaimed: true,
        claimedAt: new Date(),
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion as any);

      // Act
      await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Boolean),
        expect.objectContaining({
          operatorId: expect.any(String),
          logTimeStamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          action: 'claim-bonus-win',
          request: expect.objectContaining({
            playerId,
            siteName,
            promotionId,
          }),
        }),
      );
    });

    it('should include all error details in error log', async () => {
      // Arrange
      const mockTOProgress = {
        canClaim: false,
        totalTurnover: 500,
        minRequiredTurnover: 1000,
        totalWinAmount: 50,
        remainingTO: 500,
        progressPercentage: 50,
        errorCode: undefined,
      };

      jest.spyOn(service, 'getTOProgress').mockResolvedValue(mockTOProgress);
      jest.spyOn(service as any, 'isClaimable').mockResolvedValue(true);

      // Act
      await service.claimBonusWins(playerId, operatorId, siteName, promotionId);

      // Assert
      const errorLogCall = loggerService.error.mock.calls[0];
      const logObject = errorLogCall?.[2] as any;

      expect(logObject).toHaveProperty('operatorId', operatorId);
      expect(logObject).toHaveProperty('action', 'claim-bonus-win');
      expect(logObject).toHaveProperty('logTimeStamp');
      expect(logObject?.response).toHaveProperty('errorCode');
      expect(logObject?.response).toHaveProperty('errorMessage');
      expect(logObject?.response).toHaveProperty('errorDescription');
      expect(logObject?.response).toHaveProperty('claimedAmount', 0);
      expect(logObject?.response).toHaveProperty('totalTurnover', 500);
      expect(logObject?.response).toHaveProperty('remainingTO', 500);
    });
  });
});
