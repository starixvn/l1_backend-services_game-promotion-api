import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import { PromotionService } from '../services/promotion.service';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionStatus, PromotionFilterDto } from '../models/promotion-filter.dto';
import { PromotionPerformanceResponse } from '../responses/performance-promotion.response';

// Mock data
const mockDate = new Date();
const futureDate = new Date(mockDate.getTime() + 86400000); // tomorrow

const mockPromotion = {
  _id: 'a-promotion-id',
  name: 'Test Promotion',
  code: 'test-promotion',
  operatorId: 'op123',
  offeredSiteNames: ['site1'],
  currencyGroups: ['currency1'],
  startDate: mockDate,
  endDate: futureDate,
  bonusItemCount: 10,
  offeredPlayerIds: ['player1'],
  gameConfigType: 2,
  gameIds: [1001],
  betLevels: [],
  coinValues: [],
};

const mockPromotionArray = [
  mockPromotion,
  {
    ...mockPromotion,
    _id: 'another-promotion-id',
    name: 'Another Promotion',
    code: 'another-promotion',
    operatorId: 'op456',
  },
];

// Mock for running promotions
const mockRunningPromotions = [
  {
    _id: 'running-promotion-1',
    name: 'Running Promotion 1',
    code: 'running-promotion-1',
    operatorId: 'op123',
    endDate: new Date(mockDate.getTime() + 86400000 * 30), // 30 days later
  },
  {
    _id: 'running-promotion-2',
    name: 'Running Promotion 2',
    code: 'running-promotion-2',
    operatorId: 'op123',
    endDate: new Date(mockDate.getTime() + 86400000 * 15), // 15 days later
  },
];

// Mock for promotion performance response
const mockPromotionPerformance: PromotionPerformanceResponse = {
  bonusWin: 10000.5,
  bonusClaimed: 7500.25,
  redemptionRate: 75,
  totalTurnover: 50000,
  minRequiredTurnover: 25000,
  uniquePlayers: 150,
  avgBonusPerPlayer: 66.67,
  avgTurnoverPerPlayer: 333.33,
  dailyStats: [
    {
      date: '2025-01-01',
      bonusIssued: 1000.5,
      bonusRedeemed: 750.25,
      redemptionRate: 75,
    },
    {
      date: '2025-01-02',
      bonusIssued: 1500.0,
      bonusRedeemed: 1200.0,
      redemptionRate: 80,
    },
  ],
};

describe('PromotionController', () => {
  let controller: PromotionController;
  let service: PromotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            createPromotion: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getRunningPromotions: jest.fn(),
            doesCodeExist: jest.fn(),
            getPromotionPerformance: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
    service = module.get<PromotionService>(PromotionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new promotion', async () => {
      const createPromotionDto: CreatePromotionDto = {
        name: 'Test Promotion',
        operatorId: 'op123',
        code: 'test_promotion',
        currencyGroups: ['currency1'] as any,
        startDate: mockDate,
        endDate: futureDate,
        bonusItemCount: 10,
        gameConfigType: 2,
        gameIds: [1001],
        isGiftCode: false,
        minTurnoverMultiplier: 2,
        claimExpirationDate: futureDate,
        maxRedemptionTimes: 4,
      };

      jest.spyOn(service, 'createPromotion').mockResolvedValueOnce(mockPromotion as any);

      const result = await controller.create(createPromotionDto);
      expect(result).toEqual(mockPromotion);
      expect(service.createPromotion).toHaveBeenCalledWith(createPromotionDto);
    });
  });

  describe('findAll', () => {
    it('should return all promotions when no filter is provided', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockPromotionArray as any);

      const result = await controller.findAll({});
      expect(result).toEqual(mockPromotionArray);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filter parameters to service', async () => {
      const filterDto: PromotionFilterDto = {
        operatorIds: ['op123'],
        status: PromotionStatus.RUNNING,
        code: 'test-promotion',
      };

      jest.spyOn(service, 'findAll').mockResolvedValueOnce([mockPromotion] as any);

      const result = await controller.findAll(filterDto);
      expect(result).toEqual([mockPromotion]);
      expect(service.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('getRunningPromotions', () => {
    it('should return running promotions for a given operator sorted by priority', async () => {
      const operatorId = 'op123';
      jest
        .spyOn(service, 'getRunningPromotions')
        .mockResolvedValueOnce(mockRunningPromotions as any);

      const result = await controller.getRunningPromotions(operatorId);
      expect(result).toEqual(mockRunningPromotions);
      expect(service.getRunningPromotions).toHaveBeenCalledWith(operatorId, undefined);
    });

    it('should return running promotions for a given operator and gameId', async () => {
      const operatorId = 'op123';
      const gameId = '1001';
      jest
        .spyOn(service, 'getRunningPromotions')
        .mockResolvedValueOnce(mockRunningPromotions as any);

      const result = await controller.getRunningPromotions(operatorId, gameId);
      expect(result).toEqual(mockRunningPromotions);
      expect(service.getRunningPromotions).toHaveBeenCalledWith(operatorId, gameId);
    });

    it('should return all running promotions when no parameters are provided', async () => {
      jest
        .spyOn(service, 'getRunningPromotions')
        .mockResolvedValueOnce(mockRunningPromotions as any);

      const result = await controller.getRunningPromotions();
      expect(result).toEqual(mockRunningPromotions);
      expect(service.getRunningPromotions).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a specific promotion by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockPromotion as any);

      const result = await controller.findOne('a-promotion-id');
      expect(result).toEqual(mockPromotion);
      expect(service.findOne).toHaveBeenCalledWith('a-promotion-id');
    });
  });

  describe('update', () => {
    it('should update a promotion', async () => {
      const updatePromotionDto: UpdatePromotionDto = {
        name: 'Updated Promotion',
      };

      const updatedPromotion = {
        ...mockPromotion,
        name: 'Updated Promotion',
        code: 'updated-promotion',
      };

      jest.spyOn(service, 'update').mockResolvedValueOnce(updatedPromotion as any);

      const result = await controller.update('a-promotion-id', updatePromotionDto);
      expect(result).toEqual(updatedPromotion);
      expect(service.update).toHaveBeenCalledWith('a-promotion-id', updatePromotionDto);
    });
  });

  describe('remove', () => {
    it('should delete a promotion and return success message', async () => {
      jest.spyOn(service, 'remove').mockResolvedValueOnce(true);

      const result = await controller.remove('a-promotion-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Promotion with ID a-promotion-id deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith('a-promotion-id');
    });
  });

  describe('checkCodeExists', () => {
    it('should return true when code exists', async () => {
      const code = 'existing-code';
      jest.spyOn(service, 'doesCodeExist').mockResolvedValueOnce(true);

      const result = await controller.checkCodeExists(code);
      expect(result).toEqual({ exists: true });
      expect(service.doesCodeExist).toHaveBeenCalledWith(code);
    });

    it('should return false when code does not exist', async () => {
      const code = 'new-code';
      jest.spyOn(service, 'doesCodeExist').mockResolvedValueOnce(false);

      const result = await controller.checkCodeExists(code);
      expect(result).toEqual({ exists: false });
      expect(service.doesCodeExist).toHaveBeenCalledWith(code);
    });

    it('should throw BadRequestException if code is missing', async () => {
      await expect(controller.checkCodeExists(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPromotionPerformance', () => {
    it('should return promotion performance statistics', async () => {
      const promotionId = 'a-promotion-id';
      jest
        .spyOn(service, 'getPromotionPerformance')
        .mockResolvedValueOnce(mockPromotionPerformance);
      const result = await controller.getPromotionPerformance(promotionId);
      expect(result).toEqual(mockPromotionPerformance);
      expect(service.getPromotionPerformance).toHaveBeenCalledWith({ promotionId });
      expect(service.getPromotionPerformance).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when promotion is not found', async () => {
      const promotionId = 'non-existent-promotion-id';
      const notFoundError = new NotFoundException('Promotion not found');
      jest.spyOn(service, 'getPromotionPerformance').mockRejectedValueOnce(notFoundError);

      await expect(controller.getPromotionPerformance(promotionId)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getPromotionPerformance).toHaveBeenCalledWith({ promotionId });
    });

    it('should handle service errors properly', async () => {
      const promotionId = 'a-promotion-id';
      const serviceError = new Error('Database connection failed');
      jest.spyOn(service, 'getPromotionPerformance').mockRejectedValueOnce(serviceError);

      await expect(controller.getPromotionPerformance(promotionId)).rejects.toThrow(
        'Database connection failed',
      );
      expect(service.getPromotionPerformance).toHaveBeenCalledWith({ promotionId });
    });

    it('should pass the correct promotionId parameter to service', async () => {
      const promotionId = 'specific-promotion-id';
      jest
        .spyOn(service, 'getPromotionPerformance')
        .mockResolvedValueOnce(mockPromotionPerformance);

      await controller.getPromotionPerformance(promotionId);

      expect(service.getPromotionPerformance).toHaveBeenCalledWith({ promotionId });
      expect(service.getPromotionPerformance).toHaveBeenCalledTimes(1);
    });
  });
});
