import { Test, TestingModule } from '@nestjs/testing';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { AssignPromotionDto } from '../models/assign-promotion.dto';
import { DeductBonusItemDto } from '../models/deduct-bonus-item.dto';
import { PlayerDto } from '../models/player.dto';
import { RedeemPromotionDto } from '../models/redeem-promotion.dto';
import { RollbackBonusItemDto } from '../models/rollback-bonus-item.dto';
import { AssignmentResponse } from '../responses/assignment-response';
import { DeductBonusItemResponse, RollbackResponse } from '../responses/deduct-bonus-item.response';
import { EligiblePromotionsResponse } from '../responses/eligible-promotion.response';
import { PlayerPromotionResponse } from '../responses/player-promotion.response';
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
      const expectedResponse: EligiblePromotionsResponse = {
        promotions: [
          {
            _id: 'promotion1',
            name: 'Test Promotion',
            code: 'TEST123',
            bonusItemCount: 5,
            currencyGroup: 'USD' as any,
            isGiftCode: false,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
      };
      mockPlayerPromotionService.hasAvailablePromotions.mockResolvedValue(
        expectedResponse.promotions,
      );

      // Act
      const actualResult = await controller.checkEligibility(inputDto);

      // Assert
      expect(mockPlayerPromotionService.hasAvailablePromotions).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual(expectedResponse);
    });

    it('should return empty promotions array when no eligible promotions', async () => {
      // Arrange
      mockPlayerPromotionService.hasAvailablePromotions.mockResolvedValue([]);

      // Act
      const actualResult = await controller.checkEligibility(inputDto);

      // Assert
      expect(mockPlayerPromotionService.hasAvailablePromotions).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual({ promotions: [] });
    });
  });

  describe('assignPromotion', () => {
    const inputDto: AssignPromotionDto = {
      playerId: 'player456',
      promotionId: 'promotion789',
      operatorId: 'operator123',
      siteName: 'site123',
      currencyGroup: 'USD',
    };

    it('should successfully assign promotion to player', async () => {
      // Arrange
      const expectedResponse: AssignmentResponse = {
        message: 'Promotion assigned successfully',
      };
      mockPlayerPromotionService.assignPromotionToPlayer.mockResolvedValue({} as any);

      // Act
      const actualResult = await controller.assignPromotion(inputDto);

      // Assert
      expect(mockPlayerPromotionService.assignPromotionToPlayer).toHaveBeenCalledWith(
        inputDto.playerId,
        inputDto.promotionId,
        inputDto.operatorId,
        inputDto.siteName,
        inputDto.currencyGroup,
      );
      expect(actualResult).toEqual(expectedResponse);
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
});
