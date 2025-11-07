import { Test, TestingModule } from '@nestjs/testing';
import { PROMOTION_TICKET_ERROR_CODES } from '../../constants/error-codes';
import { CreatePromotionTicketDto } from '../models/create-promotion-ticket.dto';
import { GetPromotionTicketsDto } from '../models/get-promotion-tickets.dto';
import {
  CreatePromotionTicketResponse,
  GetPromotionTicketsPlayerResponse,
  PromotionTicketsPlayerResponse,
} from '../responses/promotion-ticket.response';
import { PromotionTicketService } from '../services/promotion-ticket.service';
import { PromotionTicketController } from './promotion-ticket.controller';

describe('PromotionTicketController', () => {
  let controller: PromotionTicketController;
  let mockPromotionTicketService: jest.Mocked<PromotionTicketService>;

  beforeEach(async () => {
    const mockServiceValue = {
      createTicket: jest.fn(),
      getPromotionTickets: jest.fn(),
      exportPromotionTickets: jest.fn(),
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
      baseBetAmount: 25.0,
      baseWinAmount: 15.0,
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
        baseBetAmount: 25.0,
        baseWinAmount: 15.0,
      });
    });
  });

  describe('getPromotionTickets', () => {
    const queryDto: GetPromotionTicketsDto = {
      playerId: 'player123',
      promotionId: 'promo789',
      playerPromotionId: 'player-promotion-id-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      pageIndex: 1,
      pageSize: 10,
    };

    it('should successfully get promotion tickets and return paginated response', async () => {
      // Arrange
      const expectedServiceResponse: GetPromotionTicketsPlayerResponse = {
        tickets: [
          {
            _id: 'ticket-id-1',
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1001,
            winAmount: 25.0,
            displayName: 'Game 1',
          } as any,
          {
            _id: 'ticket-id-2',
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1002,
            winAmount: 30.0,
          } as any,
        ],
        totalPages: 1,
        pageSize: 10,
        metaData: {
          totalCount: 2,
          totalBaseBetAmount: 50.0,
          totalBaseWinAmount: 55.0,
          totalWinAmount: 55.0,
          totalBetAmount: 50.0,
        },
      };
      mockPromotionTicketService.getPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.getPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledWith(queryDto);
      expect(actualResult).toEqual(expectedServiceResponse);
      expect(actualResult.tickets).toHaveLength(2);
      expect(actualResult.metaData?.totalCount).toBe(2);
      expect(actualResult.totalPages).toBe(1);
      expect(actualResult.pageSize).toBe(10);
      expect(actualResult.metaData?.totalBaseBetAmount).toBe(50.0);
      expect(actualResult.metaData?.totalBaseWinAmount).toBe(55.0);
    });

    it('should handle empty results', async () => {
      // Arrange
      const expectedServiceResponse: GetPromotionTicketsPlayerResponse = {
        tickets: [],
        totalPages: 0,
        pageSize: 10,
        metaData: {
          totalCount: 0,
          totalBaseBetAmount: 0,
          totalBaseWinAmount: 0,
          totalWinAmount: 0,
          totalBetAmount: 0,
        },
      };
      mockPromotionTicketService.getPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.getPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledWith(queryDto);
      expect(actualResult).toEqual(expectedServiceResponse);
      expect(actualResult.tickets).toHaveLength(0);
      expect(actualResult.metaData?.totalCount).toBe(0);
      expect(actualResult.metaData?.totalBaseBetAmount).toBe(0);
      expect(actualResult.metaData?.totalBaseWinAmount).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockPromotionTicketService.getPromotionTickets.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.getPromotionTickets(queryDto)).rejects.toThrow('Service error');
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledWith(queryDto);
    });

    it('should call service with correct query parameters', async () => {
      // Arrange
      const expectedServiceResponse: GetPromotionTicketsPlayerResponse = {
        tickets: [],
        totalPages: 0,
        pageSize: 10,
        metaData: {
          totalCount: 0,
          totalBaseBetAmount: 0,
          totalBaseWinAmount: 0,
          totalWinAmount: 0,
          totalBetAmount: 0,
        },
      };
      mockPromotionTicketService.getPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      await controller.getPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledTimes(1);
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledWith({
        playerId: 'player123',
        promotionId: 'promo789',
        playerPromotionId: 'player-promotion-id-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        pageIndex: 1,
        pageSize: 10,
      });
    });

    it('should handle query with roundId filter', async () => {
      // Arrange
      const queryWithRoundId: GetPromotionTicketsDto = {
        ...queryDto,
        roundId: 'round123',
      };
      const expectedServiceResponse: GetPromotionTicketsPlayerResponse = {
        tickets: [
          {
            _id: '507f1f77bcf86cd799439011',
            gameRoundId: 123,
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1001,
            winAmount: 25.0,
            displayName: 'Game 1',
          } as any,
        ],
        totalPages: 1,
        pageSize: 10,
        metaData: {
          totalCount: 1,
          totalBaseBetAmount: 25.0,
          totalBaseWinAmount: 25.0,
          totalWinAmount: 25.0,
          totalBetAmount: 25.0,
        },
      };
      mockPromotionTicketService.getPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.getPromotionTickets(queryWithRoundId);

      // Assert
      expect(mockPromotionTicketService.getPromotionTickets).toHaveBeenCalledWith(queryWithRoundId);
      expect(actualResult.tickets).toHaveLength(1);
      expect(actualResult.metaData?.totalCount).toBe(1);
      expect(actualResult.metaData?.totalBaseBetAmount).toBe(25.0);
      expect(actualResult.metaData?.totalBaseWinAmount).toBe(25.0);
    });
  });

  describe('exportPromotionTickets', () => {
    const queryDto: GetPromotionTicketsDto = {
      playerId: 'player123',
      promotionId: 'promo789',
      playerPromotionId: 'player-promotion-id-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      pageIndex: 1,
      pageSize: 10,
    };

    it('should successfully export promotion tickets', async () => {
      // Arrange
      const expectedServiceResponse: PromotionTicketsPlayerResponse = {
        tickets: [
          {
            _id: 'ticket-id-1',
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1001,
            winAmount: 25.0,
          } as any,
          {
            _id: 'ticket-id-2',
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1002,
            winAmount: 30.0,
          } as any,
        ],
      };
      mockPromotionTicketService.exportPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.exportPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledWith(queryDto);
      expect(actualResult).toEqual(expectedServiceResponse);
      expect(actualResult.tickets).toHaveLength(2);
    });

    it('should handle empty export results', async () => {
      // Arrange
      const expectedServiceResponse: PromotionTicketsPlayerResponse = {
        tickets: [],
      };
      mockPromotionTicketService.exportPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.exportPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledWith(queryDto);
      expect(actualResult).toEqual(expectedServiceResponse);
      expect(actualResult.tickets).toHaveLength(0);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const mockError = new Error('Export service error');
      mockPromotionTicketService.exportPromotionTickets.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.exportPromotionTickets(queryDto)).rejects.toThrow(
        'Export service error',
      );
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledWith(queryDto);
    });

    it('should call service with correct query parameters', async () => {
      // Arrange
      const expectedServiceResponse: PromotionTicketsPlayerResponse = {
        tickets: [],
      };
      mockPromotionTicketService.exportPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      await controller.exportPromotionTickets(queryDto);

      // Assert
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledTimes(1);
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledWith({
        playerId: 'player123',
        promotionId: 'promo789',
        playerPromotionId: 'player-promotion-id-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        pageIndex: 1,
        pageSize: 10,
      });
    });

    it('should handle export with date range filtering', async () => {
      // Arrange
      const queryWithDateRange: GetPromotionTicketsDto = {
        playerId: 'player123',
        playerPromotionId: 'player-promotion-id-123',
        promotionId: 'promo789',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
        pageIndex: 1,
        pageSize: 5,
      };
      const expectedServiceResponse: PromotionTicketsPlayerResponse = {
        tickets: [
          {
            _id: 'ticket-id-1',
            playerId: 'player123',
            promotionId: 'promo789',
            gameId: 1001,
            winAmount: 25.0,
            displayName: 'Game 1',
          } as any,
        ],
      };
      mockPromotionTicketService.exportPromotionTickets.mockResolvedValue(expectedServiceResponse);

      // Act
      const actualResult = await controller.exportPromotionTickets(queryWithDateRange);

      // Assert
      expect(mockPromotionTicketService.exportPromotionTickets).toHaveBeenCalledWith(
        queryWithDateRange,
      );
      expect(actualResult.tickets).toHaveLength(1);
      expect(actualResult.tickets?.[0]).toHaveProperty('displayName', 'Game 1');
    });
  });
});
