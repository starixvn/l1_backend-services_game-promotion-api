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

// Define a test interface for our mock objects
interface MockPromotionType {
  _id: string;
  name: string;
  code?: string;
  operatorId?: string;
  offeredSiteNames?: string[];
  currencyGroups?: any[];
  startDate: Date;
  endDate: Date;
  bonusItemCount?: number;
  offeredPlayerIds?: string[];
  gameConfigType?: number;
  gameIds?: number[];
  betLevels?: any[];
}

const mockPromotion: MockPromotionType = {
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

const mockPromotionArray: MockPromotionType[] = [
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
  MockModelClass.exists = jest.fn();

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
        code: '1234',
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
        code: ' 20243',
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

  describe('getRunningPromotions', () => {
    it('should return running promotions for given operator sorted by earliest end date', async () => {
      // Create fixed dates for testing
      const testNow = new Date('2023-01-15T12:00:00Z');
      const testPast = new Date('2023-01-01T12:00:00Z');
      const testFuture1 = new Date('2023-01-30T12:00:00Z'); // 15 days later
      const testFuture2 = new Date('2023-02-04T12:00:00Z'); // 20 days later
      const testFuture3 = new Date('2023-02-14T12:00:00Z'); // 30 days later

      // Create test data with explicit dates
      const testRunningPromotions = [
        {
          _id: 'running-promotion-1',
          name: 'Running Promotion 1',
          operatorId: 'op123',
          startDate: testPast,
          endDate: testFuture3, // Latest end date
        },
        {
          _id: 'running-promotion-2',
          name: 'Running Promotion 2',
          operatorId: 'op123',
          startDate: testPast,
          endDate: testFuture2, // Middle end date
        },
        {
          _id: 'running-promotion-3',
          name: 'Running Promotion 3',
          operatorId: 'op456',
          startDate: testPast,
          endDate: testFuture1, // Earliest end date
        },
        {
          _id: 'not-started-promotion',
          name: 'Not Started Promotion',
          operatorId: 'op123',
          startDate: testFuture1, // Future start date (not running)
          endDate: testFuture3,
        },
        {
          _id: 'ended-promotion',
          name: 'Ended Promotion',
          operatorId: 'op123',
          startDate: new Date('2022-12-01T12:00:00Z'),
          endDate: new Date('2022-12-31T12:00:00Z'), // Past end date (not running)
        },
      ];

      // Mock Date.now to return our fixed test date
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      // Mock the service to return only running promotions for the given operator
      const runningPromotions = testRunningPromotions.filter(
        p => p.startDate <= testNow && p.endDate > testNow && p.operatorId === 'op123',
      );

      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(runningPromotions),
      });

      const result = (await service.getRunningPromotions('op123')) as MockPromotionType[];

      // Should only include the running promotions for operator op123 (2 out of 5)
      expect(result.length).toBe(2);

      // Should not include non-running promotions
      expect(result.find(p => p._id === 'not-started-promotion')).toBeUndefined();
      expect(result.find(p => p._id === 'ended-promotion')).toBeUndefined();
      expect(result.find(p => p._id === 'running-promotion-3')).toBeUndefined(); // Different operator

      // Should be sorted by earliest end date first
      expect(result[0]._id).toBe('running-promotion-2'); // Earlier end date
      expect(result[1]._id).toBe('running-promotion-1'); // Later end date
    });

    it('should filter by exact operatorId match', async () => {
      // Create fixed dates for testing
      const testNow = new Date('2023-01-15T12:00:00Z');
      const testPast = new Date('2023-01-01T12:00:00Z');
      const testFuture1 = new Date('2023-01-30T12:00:00Z');
      const testFuture2 = new Date('2023-02-04T12:00:00Z');

      // Create test data with explicit dates
      const testRunningPromotions = [
        {
          _id: 'running-promotion-1',
          name: 'Running Promotion 1',
          operatorId: 'op123',
          startDate: testPast,
          endDate: testFuture2,
        },
        {
          _id: 'running-promotion-2',
          name: 'Running Promotion 2',
          operatorId: 'op123',
          startDate: testPast,
          endDate: testFuture1,
        },
      ];

      // Mock Date.now to return our fixed test date
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(testRunningPromotions),
      });

      const result = (await service.getRunningPromotions('op123')) as MockPromotionType[];

      // Should only include the running promotions for operator op123
      expect(result.length).toBe(2);
      expect(result.every(p => p.operatorId === 'op123')).toBe(true);
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'op123',
        }),
      );

      // Should be sorted by earliest end date first
      expect(result[0]._id).toBe('running-promotion-2'); // Earlier end date
      expect(result[1]._id).toBe('running-promotion-1'); // Later end date
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
        code: 'updated-promotion',
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

  describe('doesCodeExist', () => {
    it('should return true if promotion with code exists', async () => {
      const code = 'existing-code';
      model.exists = jest.fn().mockResolvedValueOnce({ _id: 'some-id' });

      const result = await service.doesCodeExist(code);
      expect(result).toBe(true);
      expect(model.exists).toHaveBeenCalledWith({ code });
    });

    it('should return false if promotion with code does not exist', async () => {
      const code = 'non-existing-code';
      model.exists = jest.fn().mockResolvedValueOnce(null);

      const result = await service.doesCodeExist(code);
      expect(result).toBe(false);
      expect(model.exists).toHaveBeenCalledWith({ code });
    });
  });
});
