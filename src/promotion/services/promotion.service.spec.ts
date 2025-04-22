import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionService } from './promotion.service';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { CreatePromotionDto } from '../models/create-promotion.dto';
import { UpdatePromotionDto } from '../models/update-promotion.dto';
import { PromotionStatus } from '../models/promotion-filter.dto';
import { NotFoundException } from '@nestjs/common';

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

// Define a better mock interface for Mongoose model
interface MockModel<T = any> extends Partial<Model<T>> {
  new (): Partial<T>;
  constructor: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  deleteOne: jest.Mock;
  prototype: {
    save: jest.Mock;
  };
}

// Create a mock model factory
const createMockModel = <T>(): MockModel<T> => {
  const mockSave = jest.fn();

  // Create the mock model constructor
  const MockModelClass: any = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));

  // Add static methods
  MockModelClass.find = jest.fn();
  MockModelClass.findById = jest.fn();
  MockModelClass.findByIdAndUpdate = jest.fn();
  MockModelClass.deleteOne = jest.fn();

  // Add prototype methods
  MockModelClass.prototype = {
    save: mockSave,
  };

  return MockModelClass;
};

describe('PromotionService', () => {
  let service: PromotionService;
  let model: MockModel<PromotionDocument>;

  beforeEach(async () => {
    const mockModel = createMockModel<PromotionDocument>();

    // Setup mock return values
    mockModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPromotionArray),
    });
    mockModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPromotion),
    });
    mockModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPromotion),
    });
    mockModel.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    mockModel.prototype.save.mockResolvedValue(mockPromotion);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: getModelToken(Promotion.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
    model = module.get(getModelToken(Promotion.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPromotion', () => {
    it('should create a new promotion', async () => {
      const createPromotionDto: CreatePromotionDto = {
        name: 'Test Promotion',
        operatorId: 'op123',
        currencyGroups: ['currency1'] as any,
        startDate: mockDate,
        endDate: futureDate,
        bonusItemCount: 10,
        gameConfigType: 2,
        gameIds: [1001],
      };

      const result = await service.createPromotion(createPromotionDto);
      expect(result).toEqual(mockPromotion);
    });

    it('should generate a code from the name', async () => {
      const createPromotionDto: CreatePromotionDto = {
        name: 'Test Promotion With Spaces!',
        operatorId: 'op123',
        currencyGroups: ['currency1'] as any,
        startDate: mockDate,
        endDate: futureDate,
        bonusItemCount: 10,
        gameConfigType: 2,
        gameIds: [1001],
      };

      const expectedPromotion = {
        ...mockPromotion,
        name: 'Test Promotion With Spaces!',
        code: 'test-promotion-with-spaces',
      };

      model.prototype.save.mockResolvedValueOnce(expectedPromotion);

      const result = await service.createPromotion(createPromotionDto);
      expect(result.code).toBe('test-promotion-with-spaces');
    });
  });

  describe('findAll', () => {
    it('should return all promotions when no filter is provided', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockPromotionArray),
      });

      const result = await service.findAll();
      expect(result).toEqual(mockPromotionArray);
      expect(model.find).toHaveBeenCalledWith({});
    });

    it('should filter by operatorIds', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        operatorIds: ['op123'],
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        operatorId: { $in: ['op123'] },
      });
    });

    it('should filter by code', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        code: 'test-promotion',
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        code: 'test-promotion',
      });
    });

    it('should filter by NOT_STARTED status', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        status: PromotionStatus.NOT_STARTED,
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        startDate: { $gt: expect.any(Date) },
      });
    });

    it('should filter by RUNNING status', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        status: PromotionStatus.RUNNING,
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        startDate: { $lte: expect.any(Date) },
        endDate: { $gt: expect.any(Date) },
      });
    });

    it('should filter by ENDED status', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        status: PromotionStatus.ENDED,
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        endDate: { $lte: expect.any(Date) },
      });
    });

    it('should combine multiple filters', async () => {
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      const result = await service.findAll({
        operatorIds: ['op123'],
        code: 'test-promotion',
        status: PromotionStatus.RUNNING,
      });
      expect(result).toEqual([mockPromotion]);
      expect(model.find).toHaveBeenCalledWith({
        operatorId: { $in: ['op123'] },
        code: 'test-promotion',
        startDate: { $lte: expect.any(Date) },
        endDate: { $gt: expect.any(Date) },
      });
    });
  });

  describe('findOne', () => {
    it('should return a promotion by id', async () => {
      model.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockPromotion),
      });

      const result = await service.findOne('a-promotion-id');
      expect(result).toEqual(mockPromotion);
      expect(model.findById).toHaveBeenCalledWith('a-promotion-id');
    });

    it('should throw NotFoundException if promotion not found', async () => {
      model.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
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

      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(updatedPromotion),
      });

      const result = await service.update('a-promotion-id', updatePromotionDto);
      expect(result).toEqual(updatedPromotion);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'a-promotion-id',
        { ...updatePromotionDto, code: 'updated-promotion' },
        { new: true },
      );
    });

    it('should not update code if name is not provided', async () => {
      const updatePromotionDto: UpdatePromotionDto = {
        bonusItemCount: 20,
      };

      const updatedPromotion = {
        ...mockPromotion,
        bonusItemCount: 20,
      };

      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(updatedPromotion),
      });

      const result = await service.update('a-promotion-id', updatePromotionDto);
      expect(result).toEqual(updatedPromotion);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('a-promotion-id', updatePromotionDto, {
        new: true,
      });
    });

    it('should throw NotFoundException if promotion not found', async () => {
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.update('nonexistent-id', { name: 'Updated Promotion' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a promotion and return true', async () => {
      model.deleteOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({ deletedCount: 1 }),
      });

      const result = await service.remove('a-promotion-id');
      expect(result).toBe(true);
      expect(model.deleteOne).toHaveBeenCalledWith({ _id: 'a-promotion-id' });
    });

    it('should throw NotFoundException if promotion not found', async () => {
      model.deleteOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({ deletedCount: 0 }),
      });

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
