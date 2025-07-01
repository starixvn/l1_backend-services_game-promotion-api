import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionTicketService } from './promotion-ticket.service';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { CreatePromotionTicketResponse } from '../responses/promotion-ticket.response';
import { LoggerService } from '../../core/logger/logger.service';

describe('PromotionTicketService', () => {
  let service: PromotionTicketService;
  let mockPromotionTicketModel: jest.Mocked<Model<PromotionTicketDocument>>;
  let mockLoggerService: jest.Mocked<LoggerService>;

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
      ],
    }).compile();

    service = module.get<PromotionTicketService>(PromotionTicketService);
    mockPromotionTicketModel = module.get(getModelToken(PromotionTicket.name));

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

      const expectedResult: CreatePromotionTicketResponse = {
        success: true,
        ticket: mockSavedTicket,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
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
      });
      expect(mockLoggerService.captureException).not.toHaveBeenCalled();
    });
  });
});
