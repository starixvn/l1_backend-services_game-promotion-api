import { Test, TestingModule } from '@nestjs/testing';
import { PromotionTicketController } from './promotion-ticket.controller';
import { PromotionTicketService } from '../services/promotion-ticket.service';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { CreatePromotionTicketResponse } from '../responses/promotion-ticket.response';

describe('PromotionTicketController', () => {
  let controller: PromotionTicketController;
  let mockPromotionTicketService: jest.Mocked<PromotionTicketService>;

  beforeEach(async () => {
    const mockServiceValue = {
      createTicket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionTicketController],
      providers: [
        {
          provide: PromotionTicketService,
          useValue: mockServiceValue,
        },
      ],
    }).compile();

    controller = module.get<PromotionTicketController>(PromotionTicketController);
    mockPromotionTicketService = module.get(PromotionTicketService);

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

    it('should successfully create a promotion ticket and return success response', async () => {
      // Arrange
      const expectedServiceResponse: CreatePromotionTicketResponse = {
        success: true,
        ticket: {
          _id: 'ticket-id-123',
          ...inputDto,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      };
      mockPromotionTicketService.createTicket.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketService.createTicket).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual(expectedServiceResponse);
    });

    it('should return failure response when ticket creation fails', async () => {
      // Arrange
      const expectedServiceResponse: CreatePromotionTicketResponse = {
        success: false,
        ...PROMOTION_TICKET_ERROR_CODES.CREATION_FAILED,
      };
      mockPromotionTicketService.createTicket.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketService.createTicket).toHaveBeenCalledWith(inputDto);
      expect(actualResult).toEqual(expectedServiceResponse);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockPromotionTicketService.createTicket.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.createTicket(inputDto)).rejects.toThrow('Service error');
      expect(mockPromotionTicketService.createTicket).toHaveBeenCalledWith(inputDto);
    });

    it('should call service with correct parameters', async () => {
      // Arrange
      const expectedServiceResponse: CreatePromotionTicketResponse = {
        success: true,
      };
      mockPromotionTicketService.createTicket.mockResolvedValue(expectedServiceResponse);

      // Act
      await controller.createTicket(inputDto);

      // Assert
      expect(mockPromotionTicketService.createTicket).toHaveBeenCalledTimes(1);
      expect(mockPromotionTicketService.createTicket).toHaveBeenCalledWith({
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
    });
  });
});
