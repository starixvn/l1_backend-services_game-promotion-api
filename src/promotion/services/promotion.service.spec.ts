import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromotionService } from './promotion.service';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { PromotionTicket } from '../../promotion-ticket/schemas/promotion-ticket.schema';
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
  isGiftCode?: boolean;
  minTurnoverMultiplier?: number;
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
  isGiftCode: false,
  minTurnoverMultiplier: 2,
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
  exists: jest.Mock;
  aggregate: jest.Mock;
  countDocuments: jest.Mock;
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
  MockModelClass.aggregate = jest.fn();
  MockModelClass.countDocuments = jest.fn();

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
        {
          provide: getModelToken(PromotionTicket.name),
          useValue: {
            find: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
            aggregate: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          },
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
        isGiftCode: false,
        minTurnoverMultiplier: 2,
        claimExpirationDate: futureDate,
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
        isGiftCode: false,
        minTurnoverMultiplier: 2,
        claimExpirationDate: futureDate,
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
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockPromotionArray),
      });
      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({ pageIndex: 1, pageSize: 10 });

      expect(model.aggregate).toHaveBeenCalled();
      expect(model.countDocuments).toHaveBeenCalledWith({});

      expect(result.items).toEqual(mockPromotionArray);
      expect(result.metadata).toEqual({
        total: 1,
        pageIndex: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should filter by operatorIds', async () => {
      const operatorIds = ['op123'];

      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });
      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        operatorIds,
        pageIndex: 1,
        pageSize: 10,
      });

      // Kiểm tra pipeline chứa $match với operatorId $in
      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              operatorId: { $in: operatorIds },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
    });

    it('should filter by code', async () => {
      const code = 'test-promotion';

      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        code,
        pageIndex: 1,
        pageSize: 10,
      });

      // Kiểm tra rằng pipeline chứa $match với code regex
      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              code: { $regex: code, $options: 'i' },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
      expect(result.metadata.total).toBe(1);
    });

    it('should filter by NOT_STARTED status', async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        status: PromotionStatus.NOT_STARTED,
        pageIndex: 1,
        pageSize: 10,
      });

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              startDate: { $gt: expect.any(Date) },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
    });

    it('should filter by RUNNING status', async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        status: PromotionStatus.RUNNING,
        pageIndex: 1,
        pageSize: 10,
      });

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              startDate: { $lte: expect.any(Date) },
              endDate: { $gt: expect.any(Date) },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
    });

    it('should filter by ENDED status', async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        status: PromotionStatus.ENDED,
        pageIndex: 1,
        pageSize: 10,
      });

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              endDate: { $lte: expect.any(Date) },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
    });

    it('should combine multiple filters', async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce([mockPromotion]),
      });

      model.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findAll({
        operatorIds: ['op123'],
        code: 'test-promotion',
        status: PromotionStatus.RUNNING,
        pageIndex: 1,
        pageSize: 10,
      });

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              operatorId: { $in: ['op123'] },
              code: { $regex: 'test-promotion', $options: 'i' },
              startDate: { $lte: expect.any(Date) },
              endDate: { $gt: expect.any(Date) },
            }),
          }),
        ]),
      );

      expect(result.items).toEqual([mockPromotion]);
    });
  });

  describe('getRunningPromotions', () => {
    it('should query for running promotions with operatorId filter', async () => {
      // Arrange
      const testNow = new Date('2023-01-15T12:00:00Z');
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      const mockExec = jest.fn().mockResolvedValue([]);
      const mockFind = jest.fn().mockReturnValue({
        exec: mockExec,
      });
      model.find = mockFind;

      // Act
      await service.getRunningPromotions('op123');

      // Assert
      expect(mockFind).toHaveBeenCalledWith(
        {
          startDate: { $lte: expect.any(Date) },
          endDate: { $gt: expect.any(Date) },
          operatorId: 'op123',
        },
        null,
        {
          sort: { endDate: 1, _id: 1 },
          lean: true,
        },
      );
    });

    it('should query for running promotions with gameId filter', async () => {
      // Arrange
      const testNow = new Date('2023-01-15T12:00:00Z');
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      const mockExec = jest.fn().mockResolvedValue([]);
      const mockFind = jest.fn().mockReturnValue({
        exec: mockExec,
      });
      model.find = mockFind;

      // Act
      await service.getRunningPromotions(undefined, '1001');

      // Assert
      expect(mockFind).toHaveBeenCalledWith(
        {
          startDate: { $lte: expect.any(Date) },
          endDate: { $gt: expect.any(Date) },
          gameIds: { $in: [1001] },
        },
        null,
        {
          sort: { endDate: 1, _id: 1 },
          lean: true,
        },
      );
    });

    it('should query for running promotions with both operatorId and gameId filters', async () => {
      // Arrange
      const testNow = new Date('2023-01-15T12:00:00Z');
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      const mockExec = jest.fn().mockResolvedValue([]);
      const mockFind = jest.fn().mockReturnValue({
        exec: mockExec,
      });
      model.find = mockFind;

      // Act
      await service.getRunningPromotions('op123', '1001');

      // Assert
      expect(mockFind).toHaveBeenCalledWith(
        {
          startDate: { $lte: expect.any(Date) },
          endDate: { $gt: expect.any(Date) },
          operatorId: 'op123',
          gameIds: { $in: [1001] },
        },
        null,
        {
          sort: { endDate: 1, _id: 1 },
          lean: true,
        },
      );
    });

    it('should query for all running promotions when no filters are provided', async () => {
      // Arrange
      const testNow = new Date('2023-01-15T12:00:00Z');
      jest.spyOn(global.Date, 'now').mockImplementation(() => testNow.getTime());

      const mockExec = jest.fn().mockResolvedValue([]);
      const mockFind = jest.fn().mockReturnValue({
        exec: mockExec,
      });
      model.find = mockFind;

      // Act
      await service.getRunningPromotions();

      // Assert
      expect(mockFind).toHaveBeenCalledWith(
        {
          startDate: { $lte: expect.any(Date) },
          endDate: { $gt: expect.any(Date) },
        },
        null,
        {
          sort: { endDate: 1, _id: 1 },
          lean: true,
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return a promotion by id', async () => {
      // Arrange
      const mockExec = jest.fn().mockResolvedValue(mockPromotion);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById.mockReturnValueOnce({
        lean: mockLean,
      });

      // Act
      const result = await service.findOne('a-promotion-id');

      // Assert
      expect(result).toEqual(mockPromotion);
      expect(model.findById).toHaveBeenCalledWith('a-promotion-id');
      expect(mockLean).toHaveBeenCalled();
    });

    it('should throw NotFoundException if promotion not found', async () => {
      // Arrange
      const mockExec = jest.fn().mockResolvedValue(null);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById.mockReturnValueOnce({
        lean: mockLean,
      });

      // Act & Assert
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
