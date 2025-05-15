import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PromotionAnnouncementService } from './promotion-announcement.service';
import {
  PromotionAnnouncement,
  PromotionAnnouncementDocument,
} from '../schemas/promotion-announcement.schema';
import { NotFoundException } from '@nestjs/common';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { ANNOUNCEMENT_NOT_FOUND_DESCRIPTION } from '../../constants/api-messages';
import { Model } from 'mongoose';

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

describe('PromotionAnnouncementService', () => {
  let service: PromotionAnnouncementService;
  let model: any;

  const mockDate = new Date();
  const mockAnnouncement = {
    _id: 'ann123',
    promotionTitle: { 'en-US': 'Hot Promo' },
    bannerContent: { 'en-US': 'Banner' },
    termsAndConditions: { 'en-US': 'Terms' },
    fromDate: mockDate,
    toDate: new Date(mockDate.getTime() + 86400000),
    template: 1,
    promotionMappings: [{ operatorId: 'op1', promotionCode: 'code1' }],
  };

  beforeEach(async () => {
    const mockModel = createMockModel<PromotionAnnouncementDocument>();

    // Setup mock return values
    mockModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockAnnouncement]),
    });
    mockModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockAnnouncement),
    });
    mockModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockAnnouncement),
    });
    mockModel.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    mockModel.prototype.save.mockResolvedValue(mockAnnouncement);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionAnnouncementService,
        {
          provide: getModelToken(PromotionAnnouncement.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<PromotionAnnouncementService>(PromotionAnnouncementService);
    model = module.get(getModelToken(PromotionAnnouncement.name));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new announcement', async () => {
      const dto: CreatePromotionAnnouncementDto = {
        promotionTitle: { 'en-US': 'Hot Promo' },
        bannerContent: { 'en-US': 'Banner' },
        termsAndConditions: { 'en-US': 'Terms' },
        fromDate: mockDate,
        toDate: new Date(mockDate.getTime() + 86400000),
        template: 1,
        promotionMappings: [{ operatorId: 'op1', promotionCode: 'code1' }],
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockAnnouncement);
    });
  });

  describe('findAll', () => {
    it('should return paginated promotion announcements', async () => {
      const mockAnnouncement = {
        _id: '123',
        promotionTitle: { 'en-US': 'Test Promotion' },
        fromDate: new Date('2025-06-01T00:00:00Z'),
        toDate: new Date('2025-06-05T00:00:00Z'),
      };

      const mockItems = [mockAnnouncement];
      const mockCount = 1;

      jest
        .spyOn(model, 'aggregate')
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValueOnce(mockItems) } as any);

      jest.spyOn(model, 'countDocuments').mockResolvedValueOnce(mockCount);

      const result = await service.findAll();

      expect(result).toEqual({
        items: mockItems,
        metadata: {
          total: mockCount,
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });

      expect(model.aggregate).toHaveBeenCalled();
      expect(model.countDocuments).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return an announcement by id', async () => {
      const result = await service.findById('ann123');
      expect(result).toEqual(mockAnnouncement);
      expect(model.findById).toHaveBeenCalledWith('ann123');
    });

    it('should throw NotFoundException if not found', async () => {
      model.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findById('missing-id')).rejects.toThrow(
        new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION),
      );
    });
  });

  describe('update', () => {
    it('should update and return the announcement', async () => {
      const dto: UpdatePromotionAnnouncementDto = {
        template: 2,
        toDate: new Date(mockDate.getTime() + 172800000),
      };

      const updatedAnnouncement = {
        ...mockAnnouncement,
        template: 2,
        toDate: new Date(mockDate.getTime() + 172800000),
      };
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(updatedAnnouncement),
      });
      const result = await service.update('ann123', dto);
      expect(result).toEqual(updatedAnnouncement);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('ann123', dto, { new: true });
    });

    it('should throw NotFoundException if update fails', async () => {
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('missing-id', {})).rejects.toThrow(
        new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION),
      );
    });
  });

  describe('remove', () => {
    it('should delete the announcement', async () => {
      const result = await service.remove('ann123');
      expect(result).toBe(true);
      expect(model.deleteOne).toHaveBeenCalledWith({ _id: 'ann123' });
    });

    it('should throw NotFoundException if delete fails', async () => {
      model.deleteOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(service.remove('unknown')).rejects.toThrow(
        new NotFoundException(ANNOUNCEMENT_NOT_FOUND_DESCRIPTION),
      );
    });
  });
});
