import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import {
  PromotionService,
  CANCEL_PROMOTION_ACTION,
} from '../../../src/promotion/services/promotion.service';
import { Promotion } from '../../../src/promotion/schemas/promotion.schema';
import { PromotionTicket } from '../../../src/promotion-ticket/schemas/promotion-ticket.schema';
import { PlayerPromotion } from '../../../src/promotion/schemas/player-promotion.schema';
import { LoggerService } from '../../../src/core/logger/logger.service';
import { ActionLogService } from '../../../src/core/action-log/services/action-log.service';
import { PROMOTION_ERROR_CODES } from '../../../src/constants/error-codes';
import { PROMOTION_CANCELLED } from '../../../src/constants/api-messages';

describe('PromotionService - cancelPromotion', () => {
  let service: PromotionService;
  let promotionModel: any;
  let loggerService: any;
  let actionLogService: any;

  // Mock data
  const mockPromotionId = '507f1f77bcf86cd799439011';
  const mockAdminUserId = 'admin123';
  const mockNow = new Date('2025-10-28T14:30:00.000Z');
  const mockOriginalEndDate = new Date('2025-12-31T23:59:59.000Z');

  const mockPromotionDocument = {
    _id: new Types.ObjectId(mockPromotionId),
    code: 'summer-promo-2025',
    name: 'Summer Promotion',
    operatorId: 'op123',
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: mockOriginalEndDate,
    claimExpirationDate: mockOriginalEndDate,
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
    toBeforeString: jest.fn(),
    format: jest.fn(),
    toBeDefined: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Promotion Model
    promotionModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    // Mock Logger Service
    loggerService = {
      captureMessage: jest.fn(),
      error: jest.fn(),
    };

    // Mock ActionLog Service
    actionLogService = {
      saveLog: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: getModelToken(Promotion.name),
          useValue: promotionModel,
        },
        {
          provide: getModelToken(PromotionTicket.name),
          useValue: {},
        },
        {
          provide: getModelToken(PlayerPromotion.name),
          useValue: {},
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
        {
          provide: ActionLogService,
          useValue: actionLogService,
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);

    // Mock Date.now() to return consistent timestamp
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cancelPromotion - updateEndDate', () => {
    it('should update endDate to current timestamp', async () => {
      // Arrange
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });

      // Act
      const result = await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(result.endDate).toEqual(mockNow);
    });
  });

  describe('cancelPromotion - updateClaimExpirationDate', () => {
    it('should update claimExpirationDate to current timestamp', async () => {
      // Arrange
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });

      // Act
      const result = await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(result.claimExpirationDate).toEqual(mockNow);
    });
  });

  describe('cancelPromotion - findByIdAndUpdate parameters', () => {
    it('should call findByIdAndUpdate with correct parameters', async () => {
      // Arrange
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(promotionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPromotionId,
        {
          $set: {
            endDate: expect.any(Date),
            claimExpirationDate: expect.any(Date),
          },
        },
        { new: true, runValidators: false },
      );
    });
  });

  describe('cancelPromotion - audit logging', () => {
    it('should call LoggerService.captureMessage for audit', async () => {
      // Arrange
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(loggerService.captureMessage).toHaveBeenCalled();
    });
  });

  describe('cancelPromotion - not found error', () => {
    it('should throw NotFoundException when promotion not found', async () => {
      // Arrange
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.cancelPromotion(mockPromotionId, mockAdminUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelPromotion - return value', () => {
    it('should return updated promotion document', async () => {
      // Arrange
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });

      // Act
      const result = await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(result).toEqual(updatedPromotion);
    });
  });

  // MongoDB Audit Logging Tests (NEW)
  describe('cancelPromotion - MongoDB audit logging', () => {
    beforeEach(() => {
      const updatedPromotion = {
        ...mockPromotionDocument,
        endDate: mockNow,
        claimExpirationDate: mockNow,
      };
      promotionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPromotionDocument),
      });
      promotionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPromotion),
      });
    });

    it('should call ActionLogService.saveLog with correct audit data (T077)', async () => {
      // Arrange
      const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(saveLogSpy).toHaveBeenCalledWith({
        action: CANCEL_PROMOTION_ACTION,
        operatorId: 'op123',
        logTimeStamp: mockNow.toISOString(),
        request: {
          playerId: '',
          siteName: '',
          operatorId: 'op123',
          promotionId: mockPromotionId,
          promotionCode: 'summer-promo-2025',
          adminUserId: mockAdminUserId,
          originalEndDate: mockOriginalEndDate.toISOString(),
          newEndDate: mockNow.toISOString(),
        },
        response: {
          success: true,
          code: PROMOTION_ERROR_CODES.CANCELLATION_SUCCESS.code,
          message: PROMOTION_CANCELLED,
        },
      });
    });

    it('should call ActionLogService.saveLog with action=cancel-promotion (T078)', async () => {
      // Arrange
      const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(saveLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: CANCEL_PROMOTION_ACTION,
        }),
      );
    });

    it('should call ActionLogService.saveLog with operatorId from promotion (T079)', async () => {
      // Arrange
      const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(saveLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'op123',
        }),
      );
    });

    it('should call ActionLogService.saveLog with request object containing all required fields (T080)', async () => {
      // Arrange
      const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(saveLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            promotionId: mockPromotionId,
            promotionCode: 'summer-promo-2025',
            adminUserId: mockAdminUserId,
            originalEndDate: mockOriginalEndDate.toISOString(),
            newEndDate: mockNow.toISOString(),
          }),
        }),
      );
    });

    it('should call ActionLogService.saveLog with response object containing success, code, and message (T081)', async () => {
      // Arrange
      const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

      // Act
      await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(saveLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          response: {
            success: true,
            code: PROMOTION_ERROR_CODES.CANCELLATION_SUCCESS.code,
            message: PROMOTION_CANCELLED,
          },
        }),
      );
    });

    it('should succeed even if ActionLogService.saveLog returns null (fail-safe behavior) (T082)', async () => {
      // Arrange
      actionLogService.saveLog.mockResolvedValue(null); // Simulate MongoDB failure

      // Act
      const result = await service.cancelPromotion(mockPromotionId, mockAdminUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.endDate).toEqual(mockNow);
    });
  });
});
