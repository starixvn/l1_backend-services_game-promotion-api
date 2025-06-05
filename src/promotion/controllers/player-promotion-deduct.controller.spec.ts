import { Test, TestingModule } from '@nestjs/testing';
import { PlayerPromotionController } from './player-promotion.controller';
import { PlayerPromotionService } from '../services/player-promotion.service';
import { DeductBonusItemDto } from '../models/deduct-bonus-item.dto';
import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { DeductBonusItemResponse } from '../responses/deduct-bonus-item.response';

describe('PlayerPromotionController - deductBonusItem', () => {
  let controller: PlayerPromotionController;
  let mockPlayerPromotionService: jest.Mocked<PlayerPromotionService>;

  beforeEach(async () => {
    const mockServiceValue = {
      deductBonusItem: jest.fn(),
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

  describe('deductBonusItem', () => {
    const inputDto: DeductBonusItemDto = {
      operatorId: 'operator123',
      playerId: 'player456',
      promotionId: 'promotion789',
    };

    it('should successfully deduct bonus item and return success response', async () => {
      // Arrange
      const expectedServiceResponse: DeductBonusItemResponse = {
        success: true,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_SUCCESS,
      };
      mockPlayerPromotionService.deductBonusItem.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.deductBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
      );
      expect(actualResult).toEqual(expectedServiceResponse);
    });

    it('should return failure response when deduction fails', async () => {
      // Arrange
      const expectedServiceResponse: DeductBonusItemResponse = {
        success: false,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_FAILED,
      };
      mockPlayerPromotionService.deductBonusItem.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.deductBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
      );
      expect(actualResult).toEqual(expectedServiceResponse);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockPlayerPromotionService.deductBonusItem.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.deductBonusItem(inputDto)).rejects.toThrow('Service error');
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        inputDto.operatorId,
        inputDto.playerId,
        inputDto.promotionId,
      );
    });

    it('should call service with correct parameters', async () => {
      // Arrange
      const expectedServiceResponse: DeductBonusItemResponse = {
        success: true,
        ...PLAYER_PROMOTION_ERROR_CODES.DEDUCTION_SUCCESS,
      };
      mockPlayerPromotionService.deductBonusItem.mockResolvedValue(expectedServiceResponse);

      // Act
      await controller.deductBonusItem(inputDto);

      // Assert
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledTimes(1);
      expect(mockPlayerPromotionService.deductBonusItem).toHaveBeenCalledWith(
        'operator123',
        'player456',
        'promotion789',
      );
    });
  });
});
