import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerPromotionService } from './player-promotion.service';
import { PlayerPromotion, PlayerPromotionDocument } from '../schemas/player-promotion.schema';
import { Promotion } from '../schemas/promotion.schema';
import { PlayerDto } from '../models/player.dto';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';

describe('PlayerPromotionService', () => {
  let service: PlayerPromotionService;
  let playerPromotionModel: any;
  let promotionModel: any;
  let mockPlayerPromotionModel: jest.Mocked<Model<PlayerPromotionDocument>>;

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
      bonusItemCount: 10,
      offeredPlayerIds: [],
      gameConfigType: 2,
      gameIds: [1001],
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
      bonusItemCount: 20,
      offeredPlayerIds: ['player1'],
      gameConfigType: 2,
      gameIds: [1002],
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
    lastUsedDate: null,
    save: saveFn,
    // Add minimal Document properties needed for tests
    $isEmpty: jest.fn(),
    $isDeleted: jest.fn(),
    $isValid: jest.fn(() => true),
    isModified: jest.fn(),
  } as unknown as PlayerPromotionDocument;

  beforeEach(async () => {
    // Simple mock implementations
    playerPromotionModel = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    promotionModel = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

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
      ],
    }).compile();

    service = module.get<PlayerPromotionService>(PlayerPromotionService);
    mockPlayerPromotionModel = module.get(getModelToken(PlayerPromotion.name));

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
      };

      playerPromotionModel.exec.mockResolvedValue(null);
      promotionModel.exec.mockResolvedValue(mockPromotions);

      // Act
      const result = await service.hasAvailablePromotions(playerDto);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]._id).toBe('promo1');
      expect(result[1]._id).toBe('promo2');
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        remainingBonusItems: { $gt: 0 },
      });
      // Use a separate expect for checking query parameters to avoid exact date matching issues
      expect(promotionModel.find).toHaveBeenCalled();
      const findCall = promotionModel.find.mock.calls[0][0];
      expect(findCall.operatorId).toBe('op123');
      expect(findCall.currencyGroups.$in).toContain('currency1');
      expect(findCall.startDate.$lte).toBeInstanceOf(Date);
      expect(findCall.endDate.$gt).toBeInstanceOf(Date);
      expect(findCall.$and[0].$or[0].offeredSiteNames.$size).toBe(0);
      expect(findCall.$and[0].$or[1].offeredSiteNames).toBe('site1');
      expect(findCall.$and[1].$or[0].offeredPlayerIds.$size).toBe(0);
      expect(findCall.$and[1].$or[1].offeredPlayerIds).toBe('player1');
    });

    it('should return empty array when player has an active promotion', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
      };

      playerPromotionModel.exec.mockResolvedValue(mockPlayerPromotion);

      // Act
      const result = await service.hasAvailablePromotions(playerDto);

      // Assert
      expect(result.length).toBe(0);
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        remainingBonusItems: { $gt: 0 },
      });
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
      };

      promotionModel.exec.mockResolvedValue(mockPromotion);

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

      promotionModel.exec.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignPromotionToPlayer(playerId, promotionId, operatorId, siteName, currencyGroup),
      ).rejects.toThrow('Promotion not found');
    });
  });

  describe('getCurrentPromotion', () => {
    it('should return existing promotion if player has one', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
      };

      playerPromotionModel.exec.mockResolvedValue(mockPlayerPromotion);

      // Act
      const result = await service.getCurrentPromotion(playerDto);

      // Assert
      expect(result).toEqual(mockPlayerPromotion);
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        remainingBonusItems: { $gt: 0 },
      });
    });

    it('should create and return new promotion if player has no promotion but has available ones', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
      };

      playerPromotionModel.exec.mockResolvedValue(null);
      promotionModel.exec.mockResolvedValue(mockPromotions);

      // Mock assignPromotionToPlayer instead of createPlayerPromotion
      jest.spyOn(service, 'assignPromotionToPlayer').mockResolvedValue(mockPlayerPromotion);

      // Act
      const result = await service.getCurrentPromotion(playerDto);

      // Assert
      expect(result).toEqual(mockPlayerPromotion);
      expect(service.assignPromotionToPlayer).toHaveBeenCalledWith(
        'player1',
        'promo1',
        'op123',
        'site1',
        'currency1',
      );
    });

    it('should return null if player has no promotion and no available promotions', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        currencyGroup: 'currency1',
      };

      playerPromotionModel.exec.mockResolvedValue(null);
      promotionModel.exec.mockResolvedValue([]);

      // Act
      const result = await service.getCurrentPromotion(playerDto);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('claimPromotion', () => {
    const playerDto: PlayerDto = {
      playerId: 'player1',
      operatorId: 'op123',
      siteName: 'site1',
      currencyGroup: 'currency1',
    };

    it('should return existing promotion if player has one', async () => {
      playerPromotionModel.exec.mockResolvedValue(mockPlayerPromotion);

      const result = await service.claimPromotion(playerDto);

      expect(result).toEqual(mockPlayerPromotion);
      expect(playerPromotionModel.findOne).toHaveBeenCalledWith({
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        remainingBonusItems: { $gt: 0 },
      });
    });

    it('should claim and return new promotion if player has none but has available ones', async () => {
      playerPromotionModel.exec.mockResolvedValueOnce(null);
      promotionModel.exec.mockResolvedValue(mockPromotions);

      jest.spyOn(service, 'assignPromotionToPlayer').mockResolvedValue(mockPlayerPromotion);

      const result = await service.claimPromotion(playerDto);

      expect(result).toEqual(mockPlayerPromotion);
      expect(service.assignPromotionToPlayer).toHaveBeenCalledWith(
        'player1',
        'promo1',
        'op123',
        'site1',
        'currency1',
      );
    });

    it('should return null if player has no promotion and no available promotions', async () => {
      playerPromotionModel.exec.mockResolvedValue(null);
      promotionModel.exec.mockResolvedValue([]);

      const result = await service.claimPromotion(playerDto);

      expect(result).toBeNull();
    });
  });

  describe('deductBonusItem', () => {
    const inputOperatorId = 'operator123';
    const inputPlayerId = 'player456';
    const inputPromotionId = 'promotion789';

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
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_SUCCESS,
      };

      // Act
      const actualResult = await service.deductBonusItem(
        inputOperatorId,
        inputPlayerId,
        inputPromotionId,
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
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
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
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
      );

      // Assert
      expect(mockPlayerPromotionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          operatorId: inputOperatorId,
          playerId: inputPlayerId,
          promotionId: inputPromotionId,
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
      mockPlayerPromotionModel.findOneAndUpdate.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        service.deductBonusItem(inputOperatorId, inputPlayerId, inputPromotionId),
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
      await service.deductBonusItem(inputOperatorId, inputPlayerId, inputPromotionId);

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
