import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { PlayerPromotionService } from './player-promotion.service';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { Promotion } from '../schemas/promotion.schema';
import { PlayerDto } from '../models';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';
import { LoggerService } from '../../core/logger/logger.service';
import { PROMOTION_STATUS } from '../../constants/player-promotion';

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

describe('PlayerPromotionService', () => {
  let service: PlayerPromotionService;
  let playerPromotionModel: any;
  let promotionModel: any;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const mockPromotions = [
    {
      _id: 'promo1',
      name: 'Test Promotion 1',
      code: 'test-promo-1',
      operatorId: 'op123',
      offeredSiteNames: ['site1'],
      currencyGroups: ['currency1'],
      startDate: yesterday,
      endDate: tomorrow,
      claimExpirationDate: tomorrow,
      bonusItemCount: 10,
      offeredPlayerIds: [],
      gameConfigType: 2,
      gameIds: [1001],
      betLevels: [
        {
          currencyGroup: 'currency1',
          betLevel: 1,
        },
      ],
    },
    {
      _id: 'promo2',
      name: 'Test Promotion 2',
      code: 'test-promo-2',
      operatorId: 'op123',
      offeredSiteNames: [],
      currencyGroups: ['currency1'],
      startDate: yesterday,
      endDate: tomorrow,
      claimExpirationDate: tomorrow,
      bonusItemCount: 20,
      offeredPlayerIds: ['player1'],
      gameConfigType: 2,
      gameIds: [1002],
      betLevels: [
        {
          currencyGroup: 'currency1',
          betLevel: 2,
        },
      ],
    },
  ];

  // Fix circular reference by defining the function separately
  const saveFn = jest.fn().mockReturnValue({
    _id: 'player-promo1',
    playerId: 'player1',
    operatorId: 'op123',
    siteName: 'site1',
    promotionId: 'promo1',
    promotionCode: 'test-promo-1',
    currencyGroup: 'currency1',
    remainingBonusItems: 10,
    lastUsedDate: null,
  });

  // Instead of using a circular reference, define a mock that's suitable for the PlayerPromotionDocument type
  const mockPlayerPromotion = {
    _id: 'player-promo1',
    playerId: 'player1',
    operatorId: 'op123',
    siteName: 'site1',
    promotionId: 'promo1',
    promotionCode: 'test-promo-1',
    currencyGroup: 'currency1',
    remainingBonusItems: 10,
    initialBonusItem: 10,
    betLevel: 1,
    startDate: yesterday,
    endDate: tomorrow,
    lastUsedDate: null,
    isCompleted: false,
    save: saveFn,
    // Add minimal Document properties needed for tests
    $isEmpty: jest.fn(),
    $isDeleted: jest.fn(),
    $isValid: jest.fn(() => true),
    isModified: jest.fn(),
  } as unknown as PlayerPromotionDocument;

  beforeEach(async () => {
    const mockPlayerPromotionModelValue = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      aggregate: jest.fn(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const mockPromotionModelValue = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerPromotionService,
        {
          provide: getModelToken(PlayerPromotion.name),
          useValue: mockPlayerPromotionModelValue,
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
    playerPromotionModel = module.get(getModelToken(PlayerPromotion.name));
    promotionModel = module.get(getModelToken(Promotion.name));

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('hasAvailablePromotions', () => {
    it('should return eligible promotions when player has no active promotion', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
        gameId: 1001,
      };

      // Mock findExistingPromotion to return null (no existing promotion)
      playerPromotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock getRunningPromotions
      promotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotions),
        }),
      });

      // Act
      const result = await service.hasAvailablePromotions(playerDto);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]._id).toBe('promo1');
      expect(result[1]._id).toBe('promo2');
      expect(playerPromotionModel.find).toHaveBeenCalled();
      expect(promotionModel.find).toHaveBeenCalled();
    });

    it('should return empty array when player has an active promotion', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
        gameId: 1001,
      };

      // Mock findExistingPromotion to return an existing promotion
      playerPromotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockPlayerPromotion]),
        }),
      });

      // Act
      const result = await service.hasAvailablePromotions(playerDto);

      // Assert
      expect(result.length).toBe(0);
      expect(playerPromotionModel.find).toHaveBeenCalled();
    });
  });

  describe('assignPromotionToPlayer', () => {
    it('should create a player promotion', async () => {
      // Arrange
      const playerId = 'player1';
      const promotionId = 'promo1';
      const operatorId = 'op123';
      const siteName = 'site1';
      const currencyGroup = 'currency1';

      const mockPromotion = {
        _id: promotionId,
        name: 'Test Promotion',
        code: 'test-promo',
        bonusItemCount: 10,
        startDate: yesterday,
        endDate: tomorrow,
        betLevels: [
          {
            currencyGroup: 'currency1',
            betLevel: 1,
          },
        ],
      };

      // Mock the findById chain properly
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotion),
        }),
      });

      // Instead of mocking the constructor, directly mock the createPlayerPromotion method
      jest.spyOn(service as any, 'createPlayerPromotion').mockResolvedValue(mockPlayerPromotion);

      // Act
      const result = await service.assignPromotionToPlayer(
        playerId,
        promotionId,
        operatorId,
        siteName,
        currencyGroup,
      );

      // Assert
      expect(promotionModel.findById).toHaveBeenCalledWith(promotionId);
      expect(result).toEqual(mockPlayerPromotion);
    });

    it('should throw an error if promotion is not found', async () => {
      // Arrange
      const playerId = 'player1';
      const promotionId = 'nonexistent';
      const operatorId = 'op123';
      const siteName = 'site1';
      const currencyGroup = 'currency1';

      // Mock the findById chain to return null
      promotionModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act & Assert
      await expect(
        service.assignPromotionToPlayer(playerId, promotionId, operatorId, siteName, currencyGroup),
      ).rejects.toThrow('Promotion not found');
    });
  });

  describe('claimPromotion', () => {
    const playerDto: PlayerDto = {
      playerId: 'player1',
      operatorId: 'op123',
      siteName: 'site1',
      currencyGroup: 'currency1',
      gameId: 1001,
    };

    it('should return existing promotion if player has one', async () => {
      // Mock findExistingPromotion to return existing promotion
      playerPromotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockPlayerPromotion]),
        }),
      });

      // Mock promotionModel.find for findExistingPromotion
      promotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotions),
        }),
      });

      const result = await service.claimPromotion(playerDto);

      // Assert - Should return object without _id and __v
      expect(result).toEqual(
        expect.objectContaining({
          promotion: expect.objectContaining({
            playerId: 'player1',
            operatorId: 'op123',
            siteName: 'site1',
            promotionId: 'promo1',
            promotionCode: 'test-promo-1',
            currencyGroup: 'currency1',
            remainingBonusItems: 10,
          }),
        }),
      );
      expect(result?.promotion).not.toHaveProperty('_id');
      expect(result?.promotion).not.toHaveProperty('__v');
      expect(playerPromotionModel.find).toHaveBeenCalled();
    });

    it('should claim and return new promotion if player has none but has available ones', async () => {
      // Mock findExistingPromotion to return null
      playerPromotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock getRunningPromotions
      promotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotions),
        }),
      });

      jest.spyOn(service, 'assignPromotionToPlayer').mockResolvedValue({
        ...mockPlayerPromotion,
        toObject: () => ({ ...mockPlayerPromotion, _id: 'player-promo1', __v: 0 }),
      } as any);

      const result = await service.claimPromotion(playerDto);

      // Assert - Should return object without _id and __v
      expect(result).toEqual(
        expect.objectContaining({
          promotion: expect.objectContaining({
            playerId: 'player1',
            operatorId: 'op123',
            promotionCode: 'test-promo-1',
            currencyGroup: 'currency1',
            remainingBonusItems: 10,
          }),
        }),
      );
      expect(result?.promotion).not.toHaveProperty('_id');
      expect(result?.promotion).not.toHaveProperty('__v');
      expect(service.assignPromotionToPlayer).toHaveBeenCalledWith(
        'player1',
        'promo1',
        'op123',
        'site1',
        'currency1',
      );
    });

    it('should return null if player has no promotion and no available promotions', async () => {
      // Mock findExistingPromotion to return null
      playerPromotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock getRunningPromotions to return empty array
      promotionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.claimPromotion(playerDto);

      expect(result).toBeNull();
    });
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
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion);

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
      expect(playerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
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
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(null);

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
      expect(playerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
          siteName: { $regex: /^site123$/i },
          remainingBonusItems: { $gt: 0 },
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
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(null);

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
      expect(playerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
          siteName: { $regex: /^site123$/i },
          remainingBonusItems: { $gt: 0 },
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
      playerPromotionModel.findOneAndUpdate.mockRejectedValue(mockError);

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
      playerPromotionModel.findOneAndUpdate.mockResolvedValue(mockUpdatedPromotion);

      // Act
      await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
        inputSiteName,
      );

      // Assert
      expect(playerPromotionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(playerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
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

  describe('getPlayerPromotionState', () => {
    const playerId = 'player1';
    const operatorId = 'op123';
    const siteName = 'site1';
    const promotionId = 'promo1';

    it('should return player promotion status when promotion exists', async () => {
      // Arrange
      const mockPlayerPromotion = {
        _id: 'player-promo1',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
        remainingBonusItems: 5,
        totalWinAmount: 1500,
        totalTurnover: 3000,
        minRequiredTurnover: 5000,
        isCompleted: false,
        baseTotalWinAmount: 6,
        baseTotalTurnover: 300,
        baseMinRequiredTurnover: 12,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      });

      // Act
      const result = await service.getPlayerPromotionState(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      // Assert
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId,
        operatorId,
        siteName,
        promotionId,
      });
      expect(result).toEqual({
        remainingBonusItems: 5,
        totalWinAmount: 6,
        totalTurnover: 300,
        minRequiredTurnover: 12,
        remainingTO: 0,
        promotionStatus: PROMOTION_STATUS.READY_TO_CLAIM,
      });
    });

    it('should return ready to claim status when turnover is completed', async () => {
      // Arrange
      const mockPlayerPromotion = {
        _id: 'player-promo1',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
        remainingBonusItems: 5,
        totalWinAmount: 2000,
        totalTurnover: 5000,
        minRequiredTurnover: 5000,
        isCompleted: false,
        baseTotalWinAmount: 2000,
        baseTotalTurnover: 5000,
        baseMinRequiredTurnover: 5000,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      });

      // Act
      const result = await service.getPlayerPromotionState(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      // Assert
      expect(result).toEqual({
        remainingBonusItems: 5,
        totalWinAmount: 2000,
        totalTurnover: 5000,
        minRequiredTurnover: 5000,
        remainingTO: 0, // 5000 - 5000
        promotionStatus: PROMOTION_STATUS.READY_TO_CLAIM, // remainingTO = 0
      });
    });

    it('should return 0 remainingTO when promotion is completed', async () => {
      // Arrange
      const mockPlayerPromotion = {
        _id: 'player-promo1',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
        remainingBonusItems: 0,
        totalWinAmount: 2000,
        totalTurnover: 3000,
        minRequiredTurnover: 5000,
        isCompleted: true,
        baseTotalWinAmount: 2000,
        baseTotalTurnover: 6000,
        baseMinRequiredTurnover: 5000,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      });

      // Act
      const result = await service.getPlayerPromotionState(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      // Assert
      expect(result).toEqual({
        remainingBonusItems: 0,
        totalWinAmount: 2000,
        totalTurnover: 6000,
        minRequiredTurnover: 5000,
        remainingTO: 0,
        promotionStatus: PROMOTION_STATUS.READY_TO_CLAIM,
      });
    });

    it('should handle negative remainingTO correctly', async () => {
      // Arrange
      const mockPlayerPromotion = {
        _id: 'player-promo1',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
        remainingBonusItems: 5,
        totalWinAmount: 2000,
        totalTurnover: 6000, // More than required
        minRequiredTurnover: 5000,
        isCompleted: false,
        baseTotalWinAmount: 2000,
        baseTotalTurnover: 6000,
        baseMinRequiredTurnover: 5000,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      });

      // Act
      const result = await service.getPlayerPromotionState(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );

      // Assert
      expect(result).toEqual({
        remainingBonusItems: 5,
        totalWinAmount: 2000,
        totalTurnover: 6000,
        minRequiredTurnover: 5000,
        remainingTO: 0,
        promotionStatus: PROMOTION_STATUS.READY_TO_CLAIM,
      });
    });

    it('should throw NotFoundException when player promotion does not exist', async () => {
      // Arrange
      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Act & Assert
      await expect(
        service.getPlayerPromotionState(playerId, operatorId, siteName, promotionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(mockError),
        }),
      });

      // Act & Assert
      await expect(
        service.getPlayerPromotionState(playerId, operatorId, siteName, promotionId),
      ).rejects.toThrow('Database connection failed');
    });

    it('should call database with correct query parameters', async () => {
      // Arrange
      const mockPlayerPromotion = {
        _id: 'player-promo1',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
        remainingBonusItems: 5,
        totalWinAmount: 1500,
        totalTurnover: 3000,
        minRequiredTurnover: 5000,
        isCompleted: false,
      };

      playerPromotionModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlayerPromotion),
        }),
      });

      // Act
      await service.getPlayerPromotionState(playerId, operatorId, siteName, promotionId);

      // Assert
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'promo1',
      });
      expect(playerPromotionModel.findOne().lean).toHaveBeenCalled();
      expect(playerPromotionModel.findOne().lean().exec).toHaveBeenCalled();
    });
  });
});
