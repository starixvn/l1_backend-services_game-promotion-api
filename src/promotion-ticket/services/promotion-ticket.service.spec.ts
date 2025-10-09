import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { LoggerService } from '../../core/logger/logger.service';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { UpdatePromotionTicketDto } from '../models/update-promotion-ticket.dto';
import { GetPromotionTicketsDto } from '../models/get-promotion-tickets.dto';
import {
  CreatePromotionTicketResponse,
  UpdatePromotionTicketResponse,
  PromotionTicketsPlayerResponse,
} from '../responses/promotion-ticket.response';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { PromotionTicketService } from './promotion-ticket.service';
import { BonusWinsService } from '../../bonus-wins/services/bonus-wins.service';

describe('PromotionTicketService', () => {
  let service: PromotionTicketService;
  let mockPromotionTicketModel: jest.Mocked<Model<PromotionTicketDocument>>;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockBonusWinsService: jest.Mocked<BonusWinsService>;

  beforeEach(async () => {
    const mockModelValue = {
      save: jest.fn(),
    };

    // Create mock for LoggerService
    mockLoggerService = {
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      addBreadcrumb: jest.fn(),
      setUser: jest.fn(),
      setTags: jest.fn(),
      setContext: jest.fn(),
      flush: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    // Create comprehensive mock for BonusWinsService
    mockBonusWinsService = {
      updateTotalWinAmount: jest.fn(),
      calculateTORequirement: jest.fn(),
      updateTotalTurnover: jest.fn(),
      getTOProgress: jest.fn(),
      claimBonusWins: jest.fn(),
      findByPromotion: jest.fn(),
      completePromotion: jest.fn(),
      calculateTotalWin: jest.fn(),
    } as unknown as jest.Mocked<BonusWinsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionTicketService,
        {
          provide: getModelToken(PromotionTicket.name),
          useValue: jest.fn().mockImplementation(() => mockModelValue),
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: BonusWinsService,
          useFactory: () => ({
            updateTotalWinAmount: jest.fn(),
            calculateTORequirement: jest.fn(),
            updateTotalTurnover: jest.fn(),
            getTOProgress: jest.fn(),
            claimBonusWins: jest.fn(),
            findByPromotion: jest.fn(),
            completePromotion: jest.fn(),
            calculateTotalWin: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<PromotionTicketService>(PromotionTicketService);
    mockPromotionTicketModel = module.get(getModelToken(PromotionTicket.name));
    mockBonusWinsService = module.get(BonusWinsService);

    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    const inputDto: CreatePromotionTicketDto = {
      playerId: 'player123',
      operatorId: 'operator456',
      siteName: 'site1',
      promotionId: 'promo789',
      gameId: 1001,
      gameRoundId: 789,
      appType: 1,
      betAmount: 10.5,
      winAmount: 25.0,
      baseBetAmount: 25.0,
      baseWinAmount: 15.0,
    };

    it('should successfully create a promotion ticket', async () => {
      // Arrange
      const mockSavedTicket = {
        _id: 'ticket-id-123',
        ...inputDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PromotionTicketDocument;

      const mockTicketInstance = {
        save: jest.fn().mockResolvedValue(mockSavedTicket),
      };

      (mockPromotionTicketModel as any).mockReturnValue(mockTicketInstance);

      // Mock calculateTotalWin method
      const mockCalculateTotalWin = jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 25.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 25.0,
        remainingBonusItems: 2,
      });
      mockBonusWinsService.calculateTORequirement.mockResolvedValue({
        success: true,
        minRequiredTurnover: 50.0,
        totalWinAmount: 25.0,
        turnoverMultiplier: 2.0,
      });

      const expectedResult: CreatePromotionTicketResponse = {
        success: true,
        ticket: mockSavedTicket,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
      expect(mockCalculateTotalWin).toHaveBeenCalledWith({
        playerId: inputDto.playerId,
        operatorId: inputDto.operatorId,
        siteName: inputDto.siteName,
        promotionId: inputDto.promotionId,
        gameId: inputDto.gameId,
        gameRoundId: inputDto.gameRoundId,
        appType: inputDto.appType,
        betAmount: inputDto.betAmount,
        winAmount: inputDto.winAmount,
        baseBetAmount: inputDto.baseBetAmount,
        baseWinAmount: inputDto.baseWinAmount,
      });
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        inputDto.playerId,
        inputDto.operatorId,
        inputDto.siteName,
        inputDto.promotionId,
        25.0,
        100,
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.captureException).not.toHaveBeenCalled();
    });

    it('should return failure response when ticket creation fails', async () => {
      // Arrange
      const mockError = new Error('Database error');
      const mockTicketInstance = {
        save: jest.fn().mockRejectedValue(mockError),
      };

      (mockPromotionTicketModel as any).mockReturnValue(mockTicketInstance);

      const expectedResult: CreatePromotionTicketResponse = {
        success: false,
        ...PROMOTION_TICKET_ERROR_CODES.CREATION_FAILED,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.captureException).toHaveBeenCalledWith(mockError, {
        method: 'createTicket',
        service: 'PromotionTicketService',
        dto: inputDto,
      });
    });

    it('should create ticket with correct data structure', async () => {
      // Arrange
      const mockSavedTicket = {
        _id: 'ticket-id-123',
        ...inputDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTicketInstance = {
        save: jest.fn().mockResolvedValue(mockSavedTicket),
      };

      (mockPromotionTicketModel as any).mockReturnValue(mockTicketInstance);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 25.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 25.0,
        remainingBonusItems: 2,
      });

      // Act
      await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith({
        playerId: 'player123',
        operatorId: 'operator456',
        siteName: 'site1',
        promotionId: 'promo789',
        gameId: 1001,
        gameRoundId: 789,
        appType: 1,
        betAmount: 10.5,
        winAmount: 25.0,
        baseBetAmount: 25.0,
        baseWinAmount: 15.0,
      });
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        'player123',
        'operator456',
        'site1',
        'promo789',
        25.0,
        100,
      );
      expect(mockLoggerService.captureException).not.toHaveBeenCalled();
    });

    it('should trigger TO calculation when remainingBonusItems is 0', async () => {
      // Arrange
      const mockSavedTicket = {
        _id: 'ticket-id-123',
        ...inputDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PromotionTicketDocument;

      const mockTicketInstance = {
        save: jest.fn().mockResolvedValue(mockSavedTicket),
      };

      (mockPromotionTicketModel as any).mockReturnValue(mockTicketInstance);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 25.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods - remainingBonusItems = 0 should trigger TO calculation
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 25.0,
        remainingBonusItems: 0,
      });
      mockBonusWinsService.calculateTORequirement.mockResolvedValue({
        success: true,
        minRequiredTurnover: 50.0,
        totalWinAmount: 25.0,
        turnoverMultiplier: 2.0,
      });

      const expectedResult: CreatePromotionTicketResponse = {
        success: true,
        ticket: mockSavedTicket,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        inputDto.playerId,
        inputDto.operatorId,
        inputDto.siteName,
        inputDto.promotionId,
        25.0,
        100,
      );
      expect(mockBonusWinsService.calculateTORequirement).toHaveBeenCalledWith(
        inputDto.playerId,
        inputDto.operatorId,
        inputDto.siteName,
        inputDto.promotionId,
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.captureException).not.toHaveBeenCalled();
    });

    it('should handle BonusWinsService errors gracefully', async () => {
      // Arrange
      const mockSavedTicket = {
        _id: 'ticket-id-123',
        ...inputDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as PromotionTicketDocument;

      const mockTicketInstance = {
        save: jest.fn().mockResolvedValue(mockSavedTicket),
      };

      (mockPromotionTicketModel as any).mockReturnValue(mockTicketInstance);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 25.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService error
      const updateError = new Error('Update total win failed');
      mockBonusWinsService.updateTotalWinAmount.mockRejectedValue(updateError);

      const expectedResult: CreatePromotionTicketResponse = {
        success: true,
        ticket: mockSavedTicket,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        inputDto.playerId,
        inputDto.operatorId,
        inputDto.siteName,
        inputDto.promotionId,
        25.0,
        100,
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to update total win amount or calculate TO requirement after ticket change',
        updateError.stack,
        {
          method: 'updateBonusWinsAfterTicketChange',
          service: 'PromotionTicketService',
          context: inputDto,
          error: updateError.message,
        },
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.captureException).not.toHaveBeenCalled();
    });
  });

  describe('updateTicket', () => {
    const updateTicketDto: UpdatePromotionTicketDto = {
      playerId: 'player123',
      operatorId: 'operator456',
      siteName: 'site1',
      promotionId: 'promo789',
      gameId: 1001,
      gameRoundId: 789,
      appType: 1,
      betAmount: 10.5,
      winAmount: 30.0,
      baseWinAmount: 15.0,
    };

    it('should successfully update a promotion ticket', async () => {
      // Arrange
      const mockUpdatedTicket = {
        _id: 'ticket-id-123',
        ...updateTicketDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedTicket);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 30.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 30.0,
        remainingBonusItems: 2,
      });

      const expectedResult: UpdatePromotionTicketResponse = {
        success: true,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_SUCCESS,
      };

      // Act
      const actualResult = await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: updateTicketDto.playerId,
          operatorId: updateTicketDto.operatorId,
          siteName: updateTicketDto.siteName,
          promotionId: updateTicketDto.promotionId,
          gameId: updateTicketDto.gameId,
          gameRoundId: updateTicketDto.gameRoundId,
        },
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto.baseWinAmount,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        updateTicketDto.playerId,
        updateTicketDto.operatorId,
        updateTicketDto.siteName,
        updateTicketDto.promotionId,
        30.0,
        100,
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });

    it('should return failure response when ticket update fails', async () => {
      // Arrange
      const mockError = new Error('Database update error');
      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockRejectedValue(mockError);

      const expectedResult: UpdatePromotionTicketResponse = {
        success: false,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_FAILED,
      };

      // Act
      const actualResult = await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: updateTicketDto.playerId,
          operatorId: updateTicketDto.operatorId,
          siteName: updateTicketDto.siteName,
          promotionId: updateTicketDto.promotionId,
          gameId: updateTicketDto.gameId,
          gameRoundId: updateTicketDto.gameRoundId,
        },
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto.baseWinAmount,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error in updateTicket',
        mockError.stack,
        {
          method: 'updateTicket',
          service: 'PromotionTicketService',
          dto: updateTicketDto,
          error: mockError.message,
        },
      );
    });

    it('should trigger TO calculation when remainingBonusItems is 0', async () => {
      // Arrange
      const mockUpdatedTicket = {
        _id: 'ticket-id-123',
        ...updateTicketDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedTicket);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 30.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods - remainingBonusItems = 0 should trigger TO calculation
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 30.0,
        remainingBonusItems: 0,
      });
      mockBonusWinsService.calculateTORequirement.mockResolvedValue({
        success: true,
        minRequiredTurnover: 60.0,
        totalWinAmount: 30.0,
        turnoverMultiplier: 2.0,
      });

      const expectedResult: UpdatePromotionTicketResponse = {
        success: true,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_SUCCESS,
      };

      // Act
      const actualResult = await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: updateTicketDto.playerId,
          operatorId: updateTicketDto.operatorId,
          siteName: updateTicketDto.siteName,
          promotionId: updateTicketDto.promotionId,
          gameId: updateTicketDto.gameId,
          gameRoundId: updateTicketDto.gameRoundId,
        },
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto.baseWinAmount,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        updateTicketDto.playerId,
        updateTicketDto.operatorId,
        updateTicketDto.siteName,
        updateTicketDto.promotionId,
        30.0,
        100,
      );
      expect(mockBonusWinsService.calculateTORequirement).toHaveBeenCalledWith(
        updateTicketDto.playerId,
        updateTicketDto.operatorId,
        updateTicketDto.siteName,
        updateTicketDto.promotionId,
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });

    it('should handle BonusWinsService errors gracefully', async () => {
      // Arrange
      const mockUpdatedTicket = {
        _id: 'ticket-id-123',
        ...updateTicketDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedTicket);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 30.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService error
      const updateError = new Error('Update total win failed');
      mockBonusWinsService.updateTotalWinAmount.mockRejectedValue(updateError);

      const expectedResult: UpdatePromotionTicketResponse = {
        success: true,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_SUCCESS,
      };

      // Act
      const actualResult = await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: updateTicketDto.playerId,
          operatorId: updateTicketDto.operatorId,
          siteName: updateTicketDto.siteName,
          promotionId: updateTicketDto.promotionId,
          gameId: updateTicketDto.gameId,
          gameRoundId: updateTicketDto.gameRoundId,
        },
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto.baseWinAmount,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        updateTicketDto.playerId,
        updateTicketDto.operatorId,
        updateTicketDto.siteName,
        updateTicketDto.promotionId,
        30.0,
        100,
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to update total win amount or calculate TO requirement after ticket change',
        updateError.stack,
        {
          method: 'updateBonusWinsAfterTicketChange',
          service: 'PromotionTicketService',
          context: updateTicketDto,
          error: updateError.message,
        },
      );
      expect(actualResult).toEqual(expectedResult);
    });

    it('should update ticket with correct data structure', async () => {
      // Arrange
      const mockUpdatedTicket = {
        _id: 'ticket-id-123',
        ...updateTicketDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockResolvedValue(mockUpdatedTicket);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 30.0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 30.0,
        remainingBonusItems: 2,
      });

      // Act
      await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: 'player123',
          operatorId: 'operator456',
          siteName: 'site1',
          promotionId: 'promo789',
          gameId: 1001,
          gameRoundId: 789,
        },
        {
          $set: {
            winAmount: 30.0,
            baseWinAmount: 15.0,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        'player123',
        'operator456',
        'site1',
        'promo789',
        30.0,
        100,
      );
      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });

    it('should handle case when ticket is not found', async () => {
      // Arrange
      mockPromotionTicketModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      // Mock calculateTotalWin method
      jest
        .spyOn(service, 'calculateTotalWin')
        .mockResolvedValue({ totalWinAmount: 0, baseTotalWinAmount: 100 });

      // Mock BonusWinsService methods
      mockBonusWinsService.updateTotalWinAmount.mockResolvedValue({
        success: true,
        totalWinAmount: 0,
        remainingBonusItems: 2,
      });

      const expectedResult: UpdatePromotionTicketResponse = {
        success: true,
        ...PROMOTION_TICKET_ERROR_CODES.UPDATE_SUCCESS,
      };

      // Act
      const actualResult = await service.updateTicket(updateTicketDto);

      // Assert
      expect(mockPromotionTicketModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          playerId: updateTicketDto.playerId,
          operatorId: updateTicketDto.operatorId,
          siteName: updateTicketDto.siteName,
          promotionId: updateTicketDto.promotionId,
          gameId: updateTicketDto.gameId,
          gameRoundId: updateTicketDto.gameRoundId,
        },
        {
          $set: {
            winAmount: updateTicketDto.winAmount,
            baseWinAmount: updateTicketDto.baseWinAmount,
          },
        },
        {
          new: true,
          lean: true,
        },
      );
      expect(mockBonusWinsService.updateTotalWinAmount).toHaveBeenCalledWith(
        updateTicketDto.playerId,
        updateTicketDto.operatorId,
        updateTicketDto.siteName,
        updateTicketDto.promotionId,
        0,
        100,
      );
      expect(actualResult).toEqual(expectedResult);
      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });
  });

  describe('getPromotionTickets', () => {
    const getPromotionTicketsDto: GetPromotionTicketsDto = {
      playerId: 'player123',
      promotionId: 'promo789',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      pageIndex: 1,
      pageSize: 10,
    };

    it('should successfully get promotion tickets with pagination and totals calculation', async () => {
      // Arrange
      const mockAllTickets = [
        {
          _id: 'ticket-id-1',
          gameId: 1001,
          betAmount: 10.0,
          winAmount: 25.0,
          baseBetAmount: 10.0,
          baseWinAmount: 25.0,
        },
        {
          _id: 'ticket-id-2',
          gameId: 1002,
          betAmount: 15.0,
          winAmount: 30.0,
          baseBetAmount: 15.0,
          baseWinAmount: 30.0,
        },
      ];

      const mockPaginatedTickets = [mockAllTickets[0]];

      // Mock queries
      const mockFindForTotals = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAllTickets),
        }),
      });

      const mockFindForPagination = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockPaginatedTickets),
              }),
            }),
          }),
        }),
      });

      mockPromotionTicketModel.find = jest
        .fn()
        .mockImplementationOnce(mockFindForTotals)
        .mockImplementationOnce(mockFindForPagination);

      // Act
      const result = await service.getPromotionTickets(getPromotionTicketsDto);

      // Assert
      expect(result.tickets).toHaveLength(1);
      expect(result.totalPages).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.metaData?.totalCount).toBe(2);
      expect(result.metaData?.totalBaseBetAmount).toBe(25.0);
      expect(result.metaData?.totalBaseWinAmount).toBe(55.0);
    });
  });

  describe('exportPromotionTickets', () => {
    const exportDto: GetPromotionTicketsDto = {
      playerId: 'player123',
      promotionId: 'promo789',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      pageIndex: 1,
      pageSize: 10,
    };

    it('should successfully export promotion tickets', async () => {
      // Arrange
      const mockTickets = [
        {
          _id: 'ticket-id-1',
          playerId: 'player123',
          promotionId: 'promo789',
          gameId: 1001,
          winAmount: 25.0,
          createdAt: new Date(),
        },
      ];

      mockPromotionTicketModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTickets),
          }),
        }),
      });

      // Act
      const result: PromotionTicketsPlayerResponse =
        await service.exportPromotionTickets(exportDto);

      // Assert
      expect(result.tickets).toHaveLength(1);
    });

    it('should handle errors and return empty tickets', async () => {
      // Arrange
      const mockError = new Error('Database error');
      mockPromotionTicketModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(mockError),
          }),
        }),
      });

      // Act
      const result = await service.exportPromotionTickets(exportDto);

      // Assert
      expect(result).toEqual({ tickets: [] });
      expect(mockLoggerService.captureException).toHaveBeenCalledWith(mockError, {
        method: 'exportPromotionTickets',
        service: 'PromotionTicketService',
        params: exportDto,
      });
    });
  });

  describe('calculateTotalWin', () => {
    const totalWinDto = {
      playerId: 'player123',
      operatorId: 'operator456',
      siteName: 'site1',
      promotionId: 'promo789',
      gameId: 1001,
      gameRoundId: 789,
      appType: 1,
      betAmount: 10.5,
      winAmount: 25.0,
      baseBetAmount: 25.0,
      baseWinAmount: 15.0,
    };

    it('should calculate total win amounts correctly', async () => {
      // Arrange
      const mockTickets = [
        { winAmount: 25.0, baseWinAmount: 15.0 },
        { winAmount: 30.0, baseWinAmount: 20.0 },
      ];

      mockPromotionTicketModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTickets),
        }),
      });

      // Act
      const result = await service.calculateTotalWin(totalWinDto);

      // Assert
      expect(result.totalWinAmount).toBe(55.0);
      expect(result.baseTotalWinAmount).toBe(35.0);
      expect(mockPromotionTicketModel.find).toHaveBeenCalledWith({
        promotionId: 'promo789',
        playerId: 'player123',
        operatorId: 'operator456',
        siteName: 'site1',
      });
    });

    it('should handle empty tickets array', async () => {
      // Arrange
      mockPromotionTicketModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      // Act
      const result = await service.calculateTotalWin(totalWinDto);

      // Assert
      expect(result.totalWinAmount).toBe(0);
      expect(result.baseTotalWinAmount).toBe(0);
    });

    it('should handle tickets with null/undefined amounts', async () => {
      // Arrange
      const mockTickets = [
        { winAmount: null, baseWinAmount: undefined },
        { winAmount: 25.0, baseWinAmount: 15.0 },
      ];

      mockPromotionTicketModel.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTickets),
        }),
      });

      // Act
      const result = await service.calculateTotalWin(totalWinDto);

      // Assert
      expect(result.totalWinAmount).toBe(25.0);
      expect(result.baseTotalWinAmount).toBe(15.0);
    });
  });
});
