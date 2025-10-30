import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerPromotionService } from './player-promotion.service';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { PlayerFinishedPromotion } from '../schemas/player-finished-promotion.schema';
import { Promotion } from '../schemas/promotion.schema';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';
import { LoggerService } from '../../core/logger/logger.service';

// Mock LoggerService
const mockLoggerService = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  setContext: jest.fn(),
  flush: jest.fn(),
};

describe('PlayerPromotionService - deductBonusItem', () => {
  let service: PlayerPromotionService;
  let mockPlayerPromotionModel: jest.Mocked<Model<PlayerPromotionDocument>>;

  beforeEach(async () => {
    const mockPlayerPromotionModelValue = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    const mockPromotionModelValue = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    const mockPlayerFinishedPromotionModelValue = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerPromotionService,
        {
          provide: getModelToken(PlayerPromotion.name),
          useValue: mockPlayerPromotionModelValue,
        },
        {
          provide: getModelToken(PlayerFinishedPromotion.name),
          useValue: mockPlayerFinishedPromotionModelValue,
        },
        {
          provide: getModelToken(Promotion.name),
          useValue: mockPromotionModelValue,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<PlayerPromotionService>(PlayerPromotionService);
    mockPlayerPromotionModel = module.get(getModelToken(PlayerPromotion.name));

    jest.clearAllMocks();
  });

  describe('deductBonusItem', () => {
    const inputOperatorId = 'operator123';
    const inputPlayerId = 'player456';
    const inputPromotionId = 'promotion789';
    const inputSiteName = 'site123';

    it('should successfully deduct bonus item when promotion exists with remaining items', async () => {
      // Arrange
      const mockUpdatedPromotion = {
        _id: 'promotion-doc-id',
        playerId: inputPlayerId,
        operatorId: inputOperatorId,
        promotionId: inputPromotionId,
        remainingBonusItems: 4,
        lastUsedDate: new Date(),
      };
      mockPlayerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion);

      const expectedResult: DeductBonusItemResponse = {
        success: true,
      };

      // Act
      const actualResult = await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
        inputSiteName,
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
          remainingBonusItems: { $gt: 0 },
          siteName: { $regex: new RegExp(`^${inputSiteName}$`, 'i') },
        },
        {
          $inc: { remainingBonusItems: -1 },
          $set: { lastUsedDate: expect.any(Date) },
        },
        {
          lean: true,
        },
      );
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return deduction failed when promotion does not exist', async () => {
      // Arrange
      mockPlayerPromotionModel.findOneAndUpdate.mockResolvedValue(null);

      const expectedResult: DeductBonusItemResponse = {
        success: false,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_FAILED,
      };

      // Act
      const actualResult = await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
        inputSiteName,
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
          remainingBonusItems: { $gt: 0 },
          siteName: { $regex: new RegExp(`^${inputSiteName}$`, 'i') },
        },
        {
          $inc: { remainingBonusItems: -1 },
          $set: { lastUsedDate: expect.any(Date) },
        },
        {
          lean: true,
        },
      );
      expect(actualResult).toEqual(expectedResult);
    });

    it('should return deduction failed when no bonus items remaining', async () => {
      // Arrange
      mockPlayerPromotionModel.findOneAndUpdate.mockResolvedValue(null);

      const expectedResult: DeductBonusItemResponse = {
        success: false,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_FAILED,
      };

      // Act
      const actualResult = await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
        inputSiteName,
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
          remainingBonusItems: { $gt: 0 },
          siteName: { $regex: new RegExp(`^${inputSiteName}$`, 'i') },
        },
        {
          $inc: { remainingBonusItems: -1 },
          $set: { lastUsedDate: expect.any(Date) },
        },
        {
          lean: true,
        },
      );
      expect(actualResult).toEqual(expectedResult);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      mockPlayerPromotionModel.findOneAndUpdate.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        service.deductBonusItem(inputOperatorId, inputPlayerId, inputPromotionId, inputSiteName),
      ).rejects.toThrow('Database connection failed');
    });

    it('should call findOneAndUpdate with correct atomic operations', async () => {
      // Arrange
      const mockUpdatedPromotion = {
        _id: 'promotion-doc-id',
        remainingBonusItems: 2,
      };
      mockPlayerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion);

      // Act
      await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
        inputSiteName,
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          remainingBonusItems: { $gt: 0 },
        }),
        expect.objectContaining({
          $inc: { remainingBonusItems: -1 },
          $set: { lastUsedDate: expect.any(Date) },
        }),
        expect.objectContaining({
          lean: true,
        }),
      );
    });
  });
});
