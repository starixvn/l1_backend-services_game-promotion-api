import { Test, TestingModule } from '@nestjs/testing';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemDto } from '../models/deduct-bonus-item.dto';
import { PlayerDto } from '../models/player.dto';
import { RedeemPromotionDto } from '../models/redeem-promotion.dto';
import { RollbackBonusItemDto } from '../models/rollback-bonus-item.dto';
import { PlayerPromotionStateDto } from '../models/player-promotion-state.dto';
import { PlayerPromotionStateExportDto } from '../models/player-promotion-state-export.dto';
import { DeductBonusItemResponse, RollbackResponse } from '../responses/deduct-bonus-item.response';
import {
  EligiblePromotion,
  EligiblePromotionsResponse,
} from '../responses/eligible-promotion.response';
import { PlayerPromotionResponse } from '../responses/player-promotion.response';
import {
  PlayersResponse,
  PlayersExportResponse,
  PlayerPromotionStateResponse,
} from '../responses/player-promotion.response';
import { PlayerPromotionService } from '../services/player-promotion.service';
import { PlayerPromotionController } from './player-promotion.controller';

describe('PlayerPromotionController', () => {
  let controller: PlayerPromotionController;
  let mockPlayerPromotionService: jest.Mocked<PlayerPromotionService>;

  beforeEach(async () => {
    const mockServiceValue = {
      claimPromotion: jest.fn(),
      hasAvailablePromotions: jest.fn(),
      assignPromotionToPlayer: jest.fn(),
      deductBonusItem: jest.fn(),
      rollbackBonusItemDeduction: jest.fn(),
      redeemPromotion: jest.fn(),
      getPlayerPromotionState: jest.fn(),
      getPlayerPromotionStateExport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerPromotionController],
      providers: [
        {
          provide: PlayerPromotionService,
          useValue: mockServiceValue,
        },
      ],
    }).compile();

    controller = module.get<PlayerPromotionController>(PlayerPromotionController);
    mockPlayerPromotionService = module.get(PlayerPromotionService);

    jest.clearAllMocks();
  });

  describe('claimPromotion', () => {
    const inputDto: PlayerDto = {
      operatorId: 'operator123',
      siteName: 'site123',
      playerId: 'player456',
      currencyGroup: 'USD',
      gameId: 1,
    };

    it('should successfully claim promotion and return player promotion response', async () => {
      // Arrange
      const expectedResponse: PlayerPromotionResponse = {
        success: true,
        promotion: {
          playerId: 'player456',
          operatorId: 'operator123',
          siteName: 'site123',
          promotionId: 'promotion789' as any,
          promotionCode: 'PROMO123',
          gameId: 1,
          currencyGroup: 'USD' as any,
          remainingBonusItems: 5,
          initialBonusItem: 5,
          betLevel: 1,
          startDate: new Date(),
          endDate: new Date(),
          lastUsedDate: new Date(),
          isGiftCode: false,
          totalTurnover: 0,
          totalWinAmount: 0,
          minRequiredTurnover: 0,
          turnoverMultiplier: 1,
          bonusClaimed: false,
          claimedAt: new Date(),
          isCompleted: false,
          coinValue: 0,
          baseTotalWinAmount: 0,
          baseTotalTurnover: 0,
          baseMinRequiredTurnover: 0,
        },
      };
      mockPlayerPromotionService.claimPromotion.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.claimPromotion(inputDto);

      // Assert
      expect(mockPlayerPromotionService.claimPromotion).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should return null when no promotion is available', async () => {
      // Arrange
      mockPlayerPromotionService.claimPromotion.mockResolvedValue(null);

      // Act
      const actualResult = await controller.claimPromotion(inputDto);

      // Assert
      expect(mockPlayerPromotionService.claimPromotion).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toBeNull();
    });
  });

  describe('checkEligibility', () => {
    const inputDto: PlayerDto = {
      operatorId: 'operator123',
      siteName: 'site123',
      playerId: 'player456',
      currencyGroup: 'USD',
      gameId: 1,
    };

    it('should return eligible promotions', async () => {
      // Arrange
      const mockPromotion: EligiblePromotion = {
        _id: 'promotion1',
        name: 'Test Promotion',
        code: 'TEST123',
        bonusItemCount: 5,
        gameIds: [1],
        currencyGroup: 'USD' as any,
        isGiftCode: false,
        startDate: new Date(),
        endDate: new Date(),
      };
      const expectedResponse: EligiblePromotionsResponse = {
        promotions: [mockPromotion],
      };
      mockPlayerPromotionService.hasAvailablePromotions.mockResolvedValue([mockPromotion]);

      // Act
      const actualResult = await controller.checkEligibility(inputDto);

      // Assert
      expect(mockPlayerPromotionService.hasAvailablePromotions).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should return empty array when no eligible promotions', async () => {
      // Arrange
      mockPlayerPromotionService.hasAvailablePromotions.mockResolvedValue([]);

      // Act
      const actualResult = await controller.checkEligibility(inputDto);

      // Assert
      expect(mockPlayerPromotionService.hasAvailablePromotions).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual({ promotions: [] });
    });
  });

  describe('deductBonusItem', () => {
    const inputDto: DeductBonusItemDto = {
      operatorId: 'operator123',
      playerId: 'player456',
      promotionId: 'promotion789',
      siteName: 'site123',
    };

    it('should successfully deduct bonus item', async () => {
      // Arrange
      const expectedResponse: DeductBonusItemResponse = {
        success: true,
      };
      mockPlayerPromotionService.deductBonusItem.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.deductBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
        inputDto.siteName,
      );
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should return failure response when deduction fails', async () => {
      // Arrange
      const expectedResponse: DeductBonusItemResponse = {
        success: false,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_FAILED,
      };
      mockPlayerPromotionService.deductBonusItem.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.deductBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
        inputDto.siteName,
      );
      expect(actualResult).toEqual(expectedResponse);
    });
  });

  describe('rollbackBonusItem', () => {
    const inputDto: RollbackBonusItemDto = {
      operatorId: 'operator123',
      playerId: 'player456',
      promotionId: 'promotion789',
      previousLastUsedDate: new Date().toISOString(),
    };

    it('should successfully rollback bonus item', async () => {
      // Arrange
      const expectedResponse: RollbackResponse = {
        success: true,
      };
      mockPlayerPromotionService.rollbackBonusItemDeduction.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.rollbackBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.rollbackBonusItemDeduction).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
        {
          previousLastUsedDate: inputDto.previousLastUsedDate
            ? new Date(inputDto.previousLastUsedDate)
            : null,
        },
      );
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should handle null previousLastUsedDate', async () => {
      // Arrange
      const inputDtoWithNull: RollbackBonusItemDto = {
        ...inputDto,
        previousLastUsedDate: null as any,
      };
      const expectedResponse: RollbackResponse = {
        success: true,
      };
      mockPlayerPromotionService.rollbackBonusItemDeduction.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.rollbackBonusItem(inputDtoWithNull);

      // Assert
      expect(mockPlayerPromotionService.rollbackBonusItemDeduction).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
        {
          previousLastUsedDate: null,
        },
      );
      expect(actualResult).toEqual(expectedResponse);
    });
  });

  describe('redeemPromotion', () => {
    const inputDto: RedeemPromotionDto = {
      operatorId: 'operator123',
      siteName: 'site123',
      playerId: 'player456',
      currencyGroup: 'USD',
      gameId: 1,
      giftCode: 'GIFT123',
    };

    it('should successfully redeem promotion', async () => {
      // Arrange
      const expectedResponse: PlayerPromotionResponse = {
        success: true,
        promotion: {
          playerId: 'player456',
          operatorId: 'operator123',
          siteName: 'site123',
          promotionId: 'promotion789' as any,
          promotionCode: 'GIFT123',
          gameId: 1,
          currencyGroup: 'USD' as any,
          remainingBonusItems: 5,
          initialBonusItem: 5,
          betLevel: 1,
          startDate: new Date(),
          endDate: new Date(),
          lastUsedDate: new Date(),
          isGiftCode: true,
          totalTurnover: 0,
          totalWinAmount: 0,
          minRequiredTurnover: 0,
          turnoverMultiplier: 1,
          bonusClaimed: false,
          claimedAt: new Date(),
          isCompleted: false,
          coinValue: 0,
          baseTotalWinAmount: 0,
          baseTotalTurnover: 0,
          baseMinRequiredTurnover: 0,
        },
      };
      mockPlayerPromotionService.redeemPromotion.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.redeemPromotion(inputDto);

      // Assert
      const { giftCode, ...playerDto } = inputDto;
      expect(mockPlayerPromotionService.redeemPromotion).toHaveBeenCalledWith(playerDto, giftCode);
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should return error response when promotion is null', async () => {
      // Arrange
      mockPlayerPromotionService.redeemPromotion.mockResolvedValue(null as any);

      // Act
      const actualResult = await controller.redeemPromotion(inputDto);

      // Assert
      const { giftCode, ...playerDto } = inputDto;
      expect(mockPlayerPromotionService.redeemPromotion).toHaveBeenCalledWith(playerDto, giftCode);
      expect(actualResult).toEqual({
        success: false,
        ...PLAYER_PROMOTION_ERROR_CODES.INVALID_GIFT_CODE,
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
    };

    const mockPlayerStateResponse: PlayerPromotionStateResponse = {
      playerId: 'player123',
      playerPromotionId: 'playerPromotion123',
      currencyGroup: 'USD',
      siteId: 'site123',
      gameId: 1,
      username: 'player123',
      status: 'Active',
      siteName: 'Site 1',
      currency: 'USD',
      dateJoined: '2025-01-15',
      bonusWin: 125.5,
      baseBonusWin: 0,
      baseTurnover: 0,
      baseBonusClaimed: 0,
      turnover: 890.25,
      progress: {
        current: 1.5,
        required: 2.0,
      },
      bonusClaimed: 0.0,
      lastActivity: '2025-01-25',
      initialBonusItem: 20,
      remainingBonusItems: 10,
    };

    const mockPlayersResponse: PlayersResponse = {
      items: [mockPlayerStateResponse],
      metadata: {
        pageIndex: 1,
        totalCount: 1,
        baseTotalWinAmount: 0,
        baseTotalTurnover: 0,
        baseTotalBonusClaimed: 0,
        pageSize: 10,
      },
    };

    it('should successfully return player promotion state', async () => {
      // Arrange
      mockPlayerPromotionService.getPlayerPromotionState.mockResolvedValue(mockPlayersResponse);

      // Act
      const actualResult = await controller.getPlayerPromotionState(mockQuery);

      // Assert
      expect(mockPlayerPromotionService.getPlayerPromotionState).toHaveBeenCalledWith(mockQuery);
      expect(actualResult).toEqual(mockPlayersResponse);
    });

    it('should return empty results when no data found', async () => {
      // Arrange
      const emptyResponse: PlayersResponse = {
        items: [],
        metadata: {
          pageIndex: 1,
          totalCount: 0,
          baseTotalWinAmount: 0,
          baseTotalTurnover: 0,
          baseTotalBonusClaimed: 0,
          pageSize: 10,
        },
      };
      mockPlayerPromotionService.getPlayerPromotionState.mockResolvedValue(emptyResponse);

      // Act
      const actualResult = await controller.getPlayerPromotionState(mockQuery);

      // Assert
      expect(mockPlayerPromotionService.getPlayerPromotionState).toHaveBeenCalledWith(mockQuery);
      expect(actualResult).toEqual(emptyResponse);
      expect(actualResult.items).toHaveLength(0);
    });

    it('should handle error when promotion not found', async () => {
      // Arrange
      const error = new Error('Player promotion not found');
      mockPlayerPromotionService.getPlayerPromotionState.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getPlayerPromotionState(mockQuery)).rejects.toThrow(
        'Player promotion not found',
      );
      expect(mockPlayerPromotionService.getPlayerPromotionState).toHaveBeenCalledWith(mockQuery);
    });
  });

  describe('getPlayerPromotionStateExport', () => {
    const mockExportQuery: PlayerPromotionStateExportDto = {
      promotionId: '68ac2079db851bea05471c5a',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      player: 'player123',
      status: 'Active',
      currencies: 'USD,EUR',
    };

    const mockPlayerStateResponse: PlayerPromotionStateResponse = {
      playerId: 'player123',
      playerPromotionId: 'playerPromotion123',
      currencyGroup: 'USD',
      siteId: 'site123',
      gameId: 1,
      username: 'player123',
      status: 'Active',
      siteName: 'Site 1',
      currency: 'USD',
      dateJoined: '2025-01-15',
      bonusWin: 125.5,
      baseBonusWin: 125.5,
      baseTurnover: 890.25,
      baseBonusClaimed: 0,
      turnover: 890.25,
      progress: {
        current: 1.5,
        required: 2.0,
      },
      bonusClaimed: 0.0,
      lastActivity: '2025-01-25',
      initialBonusItem: 20,
      remainingBonusItems: 10,
    };

    const mockPlayersExportResponse: PlayersExportResponse = {
      items: [mockPlayerStateResponse],
    };

    it('should successfully export player promotion state without pagination', async () => {
      // Arrange
      mockPlayerPromotionService.getPlayerPromotionStateExport.mockResolvedValue(
        mockPlayersExportResponse,
      );

      // Act
      const actualResult = await controller.getPlayerPromotionStateExport(mockExportQuery);

      // Assert
      expect(mockPlayerPromotionService.getPlayerPromotionStateExport).toHaveBeenCalledWith(
        mockExportQuery,
      );
      expect(actualResult).toEqual(mockPlayersExportResponse);
      expect(actualResult.items).toHaveLength(1);
      expect(actualResult.items[0]).toEqual(mockPlayerStateResponse);
    });

    it('should handle error when service throws', async () => {
      // Arrange
      const error = new Error('Service error');
      mockPlayerPromotionService.getPlayerPromotionStateExport.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getPlayerPromotionStateExport(mockExportQuery)).rejects.toThrow(
        'Service error',
      );
    });
  });
});
