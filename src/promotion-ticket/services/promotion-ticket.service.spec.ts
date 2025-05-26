import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionTicketService } from './promotion-ticket.service';
import { PromotionTicket, PromotionTicketDocument } from '../schemas/promotion-ticket.schema';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { CreatePromotionTicketResponse } from '../responses/promotion-ticket.response';

describe('PromotionTicketService', () => {
  let service: PromotionTicketService;
  let mockPromotionTicketModel: jest.Mocked<Model<PromotionTicketDocument>>;

  beforeEach(async () => {
    const mockModelValue = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionTicketService,
        {
          provide: getModelToken(PromotionTicket.name),
          useValue: jest.fn().mockImplementation(() => mockModelValue),
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
        ...PROMOTION_TICKET_ERROR_CODES.CREATION_SUCCESS,
      };

      // Act
      const actualResult = await service.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketModel).toHaveBeenCalledWith(inputDto);
      expect(mockTicketInstance.save).toHaveBeenCalledTimes(1);
      expect(actualResult).toEqual(expectedResult);
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
        gameId: 1001,
        gameRoundId: 789,
        appType: 1,
        betAmount: 10.5,
        winAmount: 25.0,
      });
    });
  });
});
