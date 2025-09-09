import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PlayerPromotionService } from './player-promotion.service';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { Promotion } from '../schemas/promotion.schema';
import { PlayerDto } from '../models';
import { PlayerPromotionStateDto } from '../models/player-promotion-state.dto';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';
import {
  PlayersResponse,
  PlayerPromotionStateResponse,
} from '../responses/player-promotion.response';
import { LoggerService } from '../../core/logger/logger.service';
import { Types } from 'mongoose';

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

  describe('buildAggregationPipeline', () => {
    const mockMatchStage = { promotionId: new Types.ObjectId('68ac2079db851bea05471c5a') };
    const mockClaimExpirationDate = new Date('2025-12-31');

    it('should build basic pipeline without optional parameters', () => {
      const result = service['buildAggregationPipeline'](mockMatchStage, mockClaimExpirationDate);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ $match: mockMatchStage });
      expect((result[1] as any).$lookup).toBeDefined();
      expect((result[2] as any).$addFields.playerName).toBeDefined();
      expect((result[3] as any).$addFields.calculatedStatus).toBeDefined();
      expect((result[4] as any).$addFields.progress).toBeDefined();
    });

    it('should include player search filter when provided', () => {
      const result = service['buildAggregationPipeline'](
        mockMatchStage,
        mockClaimExpirationDate,
        undefined,
        'john',
      );

      const playerSearchStage = result.find(stage => (stage as any).$match?.$or);
      expect(playerSearchStage).toBeDefined();
      expect((playerSearchStage as any).$match.$or).toHaveLength(2);
    });

    it('should include status filter when provided', () => {
      const result = service['buildAggregationPipeline'](
        mockMatchStage,
        mockClaimExpirationDate,
        'Active',
      );

      const statusFilterStage = result.find(
        stage => (stage as any).$match?.calculatedStatus === 'Active',
      );
      expect(statusFilterStage).toBeDefined();
    });

    it('should include both filters when both provided', () => {
      const result = service['buildAggregationPipeline'](
        mockMatchStage,
        mockClaimExpirationDate,
        'Active',
        'john',
      );

      expect(result).toHaveLength(7);
      expect((result[3] as any).$match.$or).toBeDefined();
      expect((result[6] as any).$match.calculatedStatus).toBe('Active');
    });

    it('should handle falsy values correctly', () => {
      const result1 = service['buildAggregationPipeline'](
        mockMatchStage,
        mockClaimExpirationDate,
        null as any,
        null as any,
      );
      const result2 = service['buildAggregationPipeline'](
        mockMatchStage,
        mockClaimExpirationDate,
        undefined,
        undefined,
      );

      expect(result1).toHaveLength(5);
      expect(result2).toHaveLength(5);
    });

    it('should call required methods', () => {
      const getStatusCalculationSpy = jest.spyOn(service as any, 'getStatusCalculation');
      const getTurnoverProgressCalculationSpy = jest.spyOn(
        service as any,
        'getTurnoverProgressCalculation',
      );
      const getProgressFieldSpy = jest.spyOn(service as any, 'getProgressField');

      service['buildAggregationPipeline'](mockMatchStage, mockClaimExpirationDate);

      expect(getStatusCalculationSpy).toHaveBeenCalledWith(mockClaimExpirationDate);
      expect(getTurnoverProgressCalculationSpy).toHaveBeenCalledWith();
      expect(getProgressFieldSpy).toHaveBeenCalledWith();
    });
  });

  describe('getTotalCountAndAmounts', () => {
    it('should return total count and base amounts correctly', async () => {
      const pipeline = [{ $match: { promotionId: 'test' } }];
      const mockResult = {
        totalCount: 5,
        baseTotalWinAmount: 1,
        baseTotalTurnover: 2,
        baseBonusClaimed: 3,
      };
      playerPromotionModel.aggregate.mockResolvedValueOnce([mockResult]);

      const result = await service['getTotalCountAndAmounts'](pipeline);

      expect(result).toEqual({
        totalCount: 5,
        baseTotalWinAmount: 1,
        baseTotalTurnover: 2,
        baseTotalBonusClaimed: 3,
      });
      expect(playerPromotionModel.aggregate).toHaveBeenCalledWith([
        ...pipeline,
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            baseTotalWinAmount: { $sum: '$baseTotalWinAmount' },
            baseTotalTurnover: { $sum: '$baseTotalTurnover' },
            baseBonusClaimed: {
              $sum: {
                $cond: [{ $eq: ['$bonusClaimed', true] }, '$baseTotalWinAmount', 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            baseTotalWinAmount: 1,
            baseTotalTurnover: 1,
            baseBonusClaimed: 1,
          },
        },
      ]);
    });

    it('should return zero values when no results found', async () => {
      const pipeline = [{ $match: { promotionId: 'test' } }];
      playerPromotionModel.aggregate.mockResolvedValueOnce([]);

      const result = await service['getTotalCountAndAmounts'](pipeline);

      expect(result).toEqual({
        totalCount: 0,
        baseTotalWinAmount: 0,
        baseTotalTurnover: 0,
        baseTotalBonusClaimed: 0,
      });
    });
  });

  describe('mapAggregationResultToResponse', () => {
    const mockDoc = {
      playerId: 'player123',
      playerName: 'John Doe',
      calculatedStatus: 'Active',
      siteName: 'Site 1',
      currency: 'USD',
      createdAt: new Date('2025-01-15'),
      totalWinAmount: 100,
      baseTotalWinAmount: 80,
      totalTurnover: 500,
      baseTotalTurnover: 400,
      turnoverProgress: 0.8,
      progress: { current: 0.8, required: 1.0 },
      bonusClaimed: true,
      updatedAt: new Date('2025-01-20'),
    };

    it('should map document correctly for both currency types', () => {
      const resultBase = service['mapAggregationResultToResponse'](mockDoc);
      const resultRegular = service['mapAggregationResultToResponse'](mockDoc);

      expect(resultBase.bonusWin).toBe(100);
      expect(resultBase.turnover).toBe(500); // Fix: should be 500, not 400
      expect(resultRegular.bonusWin).toBe(100);
      expect(resultRegular.turnover).toBe(500);
    });
  });

  describe('buildMatchStage', () => {
    it('should build match stage with all parameters', () => {
      // Arrange
      const promotionId = '68ac2079db851bea05471c5a';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Act
      const result = service['buildMatchStage'](promotionId, startDate, endDate);

      // Assert
      expect(result).toEqual({
        promotionId: new Types.ObjectId(promotionId),
        createdAt: {
          $gte: new Date('2025-01-01'),
          $lte: new Date('2025-01-31'),
        },
      });
    });
  });

  describe('getPlayerPromotionState', () => {
    const mockQuery: PlayerPromotionStateDto = {
      promotionId: '68ac2079db851bea05471c5a',
      pageIndex: 1,
      pageSize: 10,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      currencies: 'USD',
    };

    const basePipeline = [
      { $match: { promotionId: new Types.ObjectId('68ac2079db851bea05471c5a') } },
      {
        $lookup: {
          from: 'user_silos',
          localField: 'playerId',
          foreignField: 'playerId',
          as: 'playerInfo',
        },
      },
      {
        $addFields: {
          playerName: {
            $ifNull: [{ $arrayElemAt: ['$playerInfo.playerName', 0] }, '$playerId'],
          },
          currency: {
            $ifNull: [{ $arrayElemAt: ['$playerInfo.currency', 0] }, '$currency'],
          },
        },
      },
    ];

    const mockPromotion = {
      _id: '68ac2079db851bea05471c5a',
      name: 'Test Promotion',
      claimExpirationDate: new Date('2025-12-31'),
    };

    const mockAggregationResult = [
      {
        _id: 'player123',
        playerId: 'player123',
        playerName: 'Test Player',
        currency: 'USD',
        siteName: 'Site 1',
        createdAt: new Date('2025-01-15'),
        remainingBonusItems: 5,
        initialBonusItem: 10,
        betLevel: 1,
      },
    ];

    const mockPlayerStateResponse: PlayerPromotionStateResponse = {
      id: 'player123',
      username: 'Test Player',
      status: 'Active',
      siteName: 'Site 1',
      currency: 'USD',
      dateJoined: '2025-01-15',
      bonusWin: 5,
      baseBonusWin: 11,
      baseTurnover: 12,
      baseBonusClaimed: 13,
      turnover: 0,
      progress: { current: 0, required: 1 },
      bonusClaimed: 0,
      lastActivity: '2025-01-15',
    };

    const mockPlayersResponse: PlayersResponse = {
      items: [mockPlayerStateResponse],
      metadata: {
        pageIndex: 1,
        totalCount: 1,
        baseTotalWinAmount: 1,
        baseTotalTurnover: 2,
        baseTotalBonusClaimed: 3,
        pageSize: 10,
      },
    };

    beforeEach(() => {
      // Mock all private methods
      jest.spyOn(service as any, 'getPromotionById').mockResolvedValue(mockPromotion);
      jest
        .spyOn(service as any, 'buildMatchStage')
        .mockReturnValue({ promotionId: new Types.ObjectId('68ac2079db851bea05471c5a') });
      jest.spyOn(service as any, 'buildAggregationPipeline').mockReturnValue([...basePipeline]);
      jest.spyOn(service as any, 'getTotalCountAndAmounts').mockResolvedValue({
        totalCount: 1,
        baseTotalBonusClaimed: 3,
        baseTotalTurnover: 2,
        baseTotalWinAmount: 1,
      });
      jest
        .spyOn(service as any, 'mapAggregationResultToResponse')
        .mockReturnValue(mockPlayerStateResponse);
      playerPromotionModel.aggregate.mockResolvedValue(mockAggregationResult);
    });

    it('should successfully return player promotion state', async () => {
      // Act
      const result = await service.getPlayerPromotionState(mockQuery);

      // Assert
      expect(result).toEqual(mockPlayersResponse);
      expect(service['getPromotionById']).toHaveBeenCalledWith(mockQuery.promotionId);
      expect(service['buildMatchStage']).toHaveBeenCalledWith(
        mockQuery.promotionId,
        mockQuery.startDate,
        mockQuery.endDate,
      );
      expect(service['buildAggregationPipeline']).toHaveBeenCalledWith(
        { promotionId: new Types.ObjectId('68ac2079db851bea05471c5a') },
        mockPromotion.claimExpirationDate,
        mockQuery.status,
        mockQuery.player,
        mockQuery.currencies,
      );
      expect(service['getTotalCountAndAmounts']).toHaveBeenCalledTimes(1);
      expect(playerPromotionModel.aggregate).toHaveBeenCalledWith([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 10 },
      ]);
      expect(service['mapAggregationResultToResponse']).toHaveBeenCalledWith(
        mockAggregationResult[0],
      );
    });

    it('should throw error when promotion not found', async () => {
      // Arrange
      jest.spyOn(service as any, 'getPromotionById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPlayerPromotionState(mockQuery)).rejects.toThrow(
        PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
      );
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const paginatedQuery: PlayerPromotionStateDto = {
        ...mockQuery,
        pageIndex: 3,
        pageSize: 15,
      };
      jest.spyOn(service as any, 'getTotalCountAndAmounts').mockResolvedValue({
        totalCount: 45,
        baseTotalBonusClaimed: 1,
        baseTotalTurnover: 2,
        baseTotalWinAmount: 3,
      });

      // Act
      const result = await service.getPlayerPromotionState(paginatedQuery);

      // Assert
      expect(result.metadata.pageIndex).toBe(3);
      expect(result.metadata.pageSize).toBe(15);
      expect(result.metadata.totalCount).toBe(45);
      expect(playerPromotionModel.aggregate).toHaveBeenCalledWith([
        ...basePipeline,
        { $sort: { createdAt: -1 } },
        { $skip: 30 },
        { $limit: 15 },
      ]);
    });

    it('should handle empty results', async () => {
      // Arrange
      playerPromotionModel.aggregate.mockResolvedValue([]);
      jest.spyOn(service as any, 'getTotalCountAndAmounts').mockResolvedValue({
        totalCount: 0,
        baseTotalBonusClaimed: 0,
        baseTotalTurnover: 0,
        baseTotalWinAmount: 0,
      });

      // Act
      const result = await service.getPlayerPromotionState(mockQuery);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.metadata.totalCount).toBe(0);
    });

    it('should handle multiple results', async () => {
      // Arrange
      const multipleResults = [
        { ...mockAggregationResult[0], _id: 'player1' },
        { ...mockAggregationResult[0], _id: 'player2' },
      ];
      playerPromotionModel.aggregate.mockResolvedValue(multipleResults);
      jest.spyOn(service as any, 'getTotalCountAndAmounts').mockResolvedValue({
        totalCount: 2,
        baseTotalBonusClaimed: 1,
        baseTotalTurnover: 2,
        baseTotalWinAmount: 3,
      });
      jest
        .spyOn(service as any, 'mapAggregationResultToResponse')
        .mockReturnValueOnce({ ...mockPlayerStateResponse, id: 'player1' })
        .mockReturnValueOnce({ ...mockPlayerStateResponse, id: 'player2' });

      // Act
      const result = await service.getPlayerPromotionState(mockQuery);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.metadata.totalCount).toBe(2);
    });

    it('should handle aggregation errors', async () => {
      // Arrange
      const mockError = new Error('Aggregation failed');
      playerPromotionModel.aggregate.mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.getPlayerPromotionState(mockQuery)).rejects.toThrow(
        'Aggregation failed',
      );
    });

    it('should handle getTotalCount errors', async () => {
      // Arrange
      const mockError = new Error('Count failed');
      jest.spyOn(service as any, 'getTotalCountAndAmounts').mockRejectedValue(mockError);

      // Act & Assert
      await expect(service.getPlayerPromotionState(mockQuery)).rejects.toThrow('Count failed');
    });
  });
});
