import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PlayerPromotionService } from './player-promotion.service';
import { PlayerPromotion } from '../schemas/player-promotion.schema';
import { Promotion } from '../schemas/promotion.schema';
import { PlayerDto } from '../models/player.dto';

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
  };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerPromotionService,
        {
          provide: getModelToken(PlayerPromotion.name),
          useValue: playerPromotionModel,
        },
        {
          provide: getModelToken(Promotion.name),
          useValue: promotionModel,
        },
      ],
    }).compile();

    service = module.get<PlayerPromotionService>(PlayerPromotionService);

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
      expect(promotionModel.find).toHaveBeenCalledWith({
        operatorId: 'op123',
        startDate: { $lte: expect.any(Date) },
        endDate: { $gt: expect.any(Date) },
        $and: [
          {
            $or: [{ offeredSiteNames: { $size: 0 } }, { offeredSiteNames: 'site1' }],
          },
          {
            $or: [{ offeredPlayerIds: { $size: 0 } }, { offeredPlayerIds: 'player1' }],
          },
        ],
      });
    });

    it('should return empty array when player has an active promotion', async () => {
      // Arrange
      const playerDto: PlayerDto = {
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
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
});
