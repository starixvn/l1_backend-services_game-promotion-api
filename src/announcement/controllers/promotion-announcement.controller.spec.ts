import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PromotionAnnouncementController } from './promotion-announcement.controller';
import { PromotionAnnouncementService } from '../services/promotion-announcement.service';
import { CreatePromotionAnnouncementDto } from '../models/create-promotion-announcement.dto';
import { PromotionAnnouncementFilterDto } from '../models/promotion-announcement-filter.dto';
import { PromotionAnnouncementStatus } from '../models/promotion-announcement-filter.dto';
import { UpdatePromotionAnnouncementDto } from '../models/update-promotion-announcement.dto';

// Mock data
const mockDate = new Date();
const futureDate = new Date(mockDate.getTime() + 86400000); // tomorrow

const mockPromotionAnnouncement = {
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

const mockPromotionAnnouncementArray = [
  mockPromotionAnnouncement,
  {
    ...mockPromotionAnnouncement,
    _id: 'another-promotion-announcement-id',
    promotionTitle: { 'en-US': 'Another Promotion' },
    fromDate: new Date('2025-06-01T00:00:00Z'),
    toDate: new Date('2025-06-05T00:00:00Z'),
    operatorId: 'op456',
  },
];

describe('PromotionAnnouncementController', () => {
  let controller: PromotionAnnouncementController;
  let service: PromotionAnnouncementService;

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
      ],
    }).compile();

    controller = module.get<PromotionAnnouncementController>(PromotionAnnouncementController);
    service = module.get<PromotionAnnouncementService>(PromotionAnnouncementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new promotion announcement', async () => {
      const createPromotionAnnouncementDto: CreatePromotionAnnouncementDto = {
        promotionTitle: { 'en-US': 'Test Promotion Announcement' },
        bannerContent: { 'en-US': 'Test Content' },
        termsAndConditions: { 'en-US': 'Test Terms and Conditions' },
        fromDate: mockDate,
        toDate: futureDate,
        promotionMappings: [
          {
            promotionCode: 'test-promotion-announcement',
            operatorId: 'op123',
          },
        ],
        template: 1,
      };

      jest.spyOn(service, 'create').mockResolvedValueOnce(mockPromotionAnnouncement as any);

      const result = await controller.create(createPromotionAnnouncementDto);
      expect(result).toEqual(mockPromotionAnnouncement);
      expect(service.create).toHaveBeenCalledWith(createPromotionAnnouncementDto);
    });
  });

  describe('findAll', () => {
    it('should return all promotion announcements when no filter is provided', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(mockPromotionAnnouncementArray as any);

      const result = await controller.findAll({});
      expect(result).toEqual(mockPromotionAnnouncementArray);
      expect(service.findAll).toHaveBeenCalledWith({});
    });

    it('should pass filter parameters to service', async () => {
      const filterDto: PromotionAnnouncementFilterDto = {
        status: PromotionAnnouncementStatus.RUNNING,
      };

      jest.spyOn(service, 'findAll').mockResolvedValueOnce([mockPromotionAnnouncement] as any);

      const result = await controller.findAll(filterDto);
      expect(result).toEqual([mockPromotionAnnouncement]);
      expect(service.findAll).toHaveBeenCalledWith(filterDto);
    });
  });

  describe('findById', () => {
    it('should return a specific promotion by id', async () => {
      jest.spyOn(service, 'findById').mockResolvedValueOnce(mockPromotionAnnouncement as any);

      const result = await controller.findById('a-promotion-announcement-id');
      expect(result).toEqual(mockPromotionAnnouncement);
      expect(service.findById).toHaveBeenCalledWith('a-promotion-announcement-id');
    });
  });

  describe('update', () => {
    it('should update a promotion', async () => {
      const updatePromotionAnnouncementDto: UpdatePromotionAnnouncementDto = {
        promotionTitle: { 'en-US': 'Updated Promotion' },
      };

      const updatedPromotionAnnouncement = {
        ...mockPromotionAnnouncement,
        promotionTitle: { 'en-US': 'Updated Promotion' },
      };

      jest.spyOn(service, 'update').mockResolvedValueOnce(updatedPromotionAnnouncement as any);

      const result = await controller.update(
        'a-promotion-announcement-id',
        updatePromotionAnnouncementDto,
      );
      expect(result).toEqual(updatedPromotionAnnouncement);
      expect(service.update).toHaveBeenCalledWith(
        'a-promotion-announcement-id',
        updatePromotionAnnouncementDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a promotion announcement and return success message', async () => {
      jest.spyOn(service, 'remove').mockResolvedValueOnce(true);

      const result = await controller.remove('a-promotion-announcement-id');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Promotion announcement with ID a-promotion-announcement-id deleted successfully',
      });
      expect(service.remove).toHaveBeenCalledWith('a-promotion-announcement-id');
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
