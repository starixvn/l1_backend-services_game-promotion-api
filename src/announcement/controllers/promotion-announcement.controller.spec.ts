import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PromotionAnnouncementController } from './promotion-announcement.controller';
import { PromotionAnnouncementService } from '../services/promotion-announcement.service';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import {
  PromotionAnnouncementFilterDto,
  PromotionAnnouncementStatus,
} from '../models/promotion-announcement-filter.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';
import { PromotionService } from '../../promotion/services/promotion.service';

// Mock the entire promotion module to avoid import issues
jest.mock('../../promotion/services/promotion.service', () => ({
  PromotionService: jest.fn().mockImplementation(() => ({
    findManyByCodes: jest.fn(),
  })),
}));

const mockDate = new Date();
const futureDate = new Date(mockDate.getTime() + 86400000); // tomorrow

const mockPromotionAnnouncement = {
  _id: 'a-promotion-id',
  promotionTitle: { 'en-US': 'Test Promotion' },
  bannerContent: { 'en-US': 'Test Content' },
  termsAndConditions: { 'en-US': 'Test Terms' },
  fromDate: mockDate,
  toDate: futureDate,
  promotionMappings: ['test-promotion'],
  template: 1,
  mappings: [{ promotionCode: 'test-promotion', operatorId: 'op123' }],
};

const mockPromotionAnnouncementArray = [
  mockPromotionAnnouncement,
  {
    ...mockPromotionAnnouncement,
    _id: 'another-promotion-id',
    promotionTitle: { 'en-US': 'Another Promotion' },
    promotionMappings: ['another-code'],
    mappings: [{ promotionCode: 'another-code', operatorId: 'op456' }],
  },
];

const mockPromotions = [
  {
    code: 'test-promotion',
    operatorId: 'op123',
    name: 'Test Promotion',
    offeredSiteNames: ['site1'],
    currencyGroups: ['currency1'],
    startDate: mockDate,
    endDate: futureDate,
    bonusItemCount: 10,
    offeredPlayerIds: ['player1'],
    gameConfigType: 1,
    gameIds: [1001],
    betLevels: [],
  },
];

describe('PromotionAnnouncementController', () => {
  let controller: PromotionAnnouncementController;
  let service: PromotionAnnouncementService;
  let promotionService: PromotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionAnnouncementController],
      providers: [
        {
          provide: PromotionAnnouncementService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: PromotionService,
          useValue: {
            findManyByCodes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PromotionAnnouncementController>(PromotionAnnouncementController);
    service = module.get<PromotionAnnouncementService>(PromotionAnnouncementService);
    promotionService = module.get<PromotionService>(PromotionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new promotion announcement', async () => {
      const dto: CreatePromotionAnnouncementDto = {
        promotionTitle: { 'en-US': 'Test Promotion' },
        bannerContent: { 'en-US': 'Test Content' },
        termsAndConditions: { 'en-US': 'Test Terms' },
        fromDate: mockDate,
        toDate: futureDate,
        promotionMappings: ['test-promotion'],
        template: 1,
      };

      jest.spyOn(service, 'create').mockResolvedValueOnce(mockPromotionAnnouncement as any);

      const result = await controller.create(dto);
      expect(result).toEqual(mockPromotionAnnouncement);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all promotion announcements with pagination metadata', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValueOnce({
        items: mockPromotionAnnouncementArray,
        metadata: {
          total: 2,
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });

      const result = await controller.findAll({});
      expect(result).toEqual({
        items: mockPromotionAnnouncementArray,
        metadata: {
          total: 2,
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filter parameters to service', async () => {
      const filterDto: PromotionAnnouncementFilterDto = {
        status: PromotionAnnouncementStatus.RUNNING,
      };

      jest.spyOn(service, 'findAll').mockResolvedValueOnce({
        items: [mockPromotionAnnouncement],
        metadata: {
          total: 1,
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });

      const result = await controller.findAll(filterDto);
      expect(result).toEqual({
        items: [mockPromotionAnnouncement],
        metadata: {
          total: 1,
          pageIndex: 1,
          pageSize: 10,
          totalPages: 1,
        },
      });
      expect(service.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('findById', () => {
    it('should return a specific promotion announcement by id', async () => {
      jest.spyOn(service, 'findById').mockResolvedValueOnce(mockPromotionAnnouncement as any);

      jest.spyOn(promotionService, 'findManyByCodes').mockResolvedValueOnce(mockPromotions as any);

      const result = await controller.findById('a-promotion-id');
      expect(result).toEqual(mockPromotionAnnouncement);
      expect(service.findById).toHaveBeenCalledWith('a-promotion-id');
      expect(promotionService.findManyByCodes).toHaveBeenCalledWith(['test-promotion']);
    });
  });

  describe('update', () => {
    it('should update a promotion announcement', async () => {
      const dto: UpdatePromotionAnnouncementDto = {
        promotionTitle: { 'en-US': 'Updated Promotion' },
      };

      const updated = {
        ...mockPromotionAnnouncement,
        promotionTitle: { 'en-US': 'Updated Promotion' },
      };

      jest.spyOn(service, 'update').mockResolvedValueOnce(updated as any);

      const result = await controller.update('a-promotion-id', dto);
      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('a-promotion-id', dto);
    });
  });

  describe('remove', () => {
    it('should delete a promotion announcement and return success message', async () => {
      jest.spyOn(service, 'remove').mockResolvedValueOnce(true);

      const result = await controller.remove('a-promotion-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Promotion announcement with ID a-promotion-id deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith('a-promotion-id');
    });
  });

  describe('test', () => {
    it('should return a test message', async () => {
      const result = await controller.test();
      expect(result).toEqual({
        status: 'ok',
        message: 'Promotion announcement API test endpoint is working',
      });
    });
  });
});
