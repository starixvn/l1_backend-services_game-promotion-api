import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PromotionController } from '../../../src/promotion/controllers/promotion.controller';
import { PromotionService } from '../../../src/promotion/services/promotion.service';
import { CancelPromotionDto } from '../../../src/promotion/models/cancel-promotion.dto';
import { PROMOTION_ERROR_CODES } from '../../../src/constants/error-codes';
import { PROMOTION_CANCELLED } from '../../../src/constants/api-messages';
import { PromotionDocument } from 'src/promotion/schemas/promotion.schema';

describe('PromotionController - cancelPromotion', () => {
  let controller: PromotionController;
  let service: PromotionService;

  const mockPromotionId = '507f1f77bcf86cd799439011';
  const mockAdminUserId = 'admin123';
  const mockNow = new Date('2025-10-28T14:30:00.000Z');

  const mockCancelledPromotion = {
    _id: mockPromotionId,
    code: 'summer-promo-2025',
    name: 'Summer Promotion',
    operatorId: 'op123',
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: mockNow,
    claimExpirationDate: mockNow,
    bonusItemCount: 50,
    offeredSiteNames: ['site1'],
    currencyGroups: [],
    offeredPlayerIds: [],
    gameConfigType: 2,
    gameIds: [1001],
    betLevels: [],
    coinValues: [],
    isGiftCode: false,
    minTurnoverMultiplier: 2,
  };

  beforeEach(async () => {
    const mockPromotionService = {
      cancelPromotion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: mockPromotionService,
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
    service = module.get<PromotionService>(PromotionService);
  });

  describe('cancelPromotion - service call', () => {
    it('should call service with correct parameters', async () => {
      // Arrange
      const cancelDto: CancelPromotionDto = { adminUserId: mockAdminUserId };
      jest
        .spyOn(service, 'cancelPromotion')
        .mockResolvedValue(mockCancelledPromotion as unknown as PromotionDocument);

      // Act
      await controller.cancelPromotion(mockPromotionId, cancelDto);

      // Assert
      expect(service.cancelPromotion).toHaveBeenCalledWith(mockPromotionId, mockAdminUserId);
    });
  });

  describe('cancelPromotion - response format', () => {
    it('should return formatted CancelPromotionResponse', async () => {
      // Arrange
      const cancelDto: CancelPromotionDto = { adminUserId: mockAdminUserId };
      jest
        .spyOn(service, 'cancelPromotion')
        .mockResolvedValue(mockCancelledPromotion as unknown as PromotionDocument);

      // Act
      const result = await controller.cancelPromotion(mockPromotionId, cancelDto);

      // Assert
      expect(result).toEqual({
        success: true,
        code: PROMOTION_ERROR_CODES.CANCELLATION_SUCCESS.code,
        message: PROMOTION_CANCELLED,
        data: expect.objectContaining({
          promotionId: mockPromotionId,
          promotionCode: 'summer-promo-2025',
        }),
      });
    });
  });

  describe('cancelPromotion - error handling', () => {
    it('should handle NotFoundException correctly', async () => {
      // Arrange
      const cancelDto: CancelPromotionDto = { adminUserId: mockAdminUserId };
      jest.spyOn(service, 'cancelPromotion').mockRejectedValue(new NotFoundException());

      // Act & Assert
      await expect(controller.cancelPromotion(mockPromotionId, cancelDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
