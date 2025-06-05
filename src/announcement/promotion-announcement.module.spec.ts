import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as request from 'supertest';
import { PromotionAnnouncement } from './schemas/promotion-announcement.schema';
import { PromotionAnnouncementModule } from './promotion-announcement.module';

const mockDate = new Date();
const futureDate = new Date(mockDate.getTime() + 86400000);

describe('PromotionAnnouncementModule (Integration)', () => {
  let app: INestApplication;

  const mockPromotionAnnouncement = {
    promotionTitle: { 'en-US': 'Test Promotion Announcement' },
    bannerContent: { 'en-US': 'Test Content' },
    fromDate: mockDate,
    toDate: futureDate,
    template: 2,
    promotionMappings: [{ promotionCode: 'test-promotion-announcement', operatorId: 'op123' }],
  };

  const mockModelPromotionAnnouncement = {
    ...mockPromotionAnnouncement,
    save: jest.fn().mockReturnThis(),
  };

  beforeAll(async () => {
    function MockPromotionAnnouncementModel() {
      return {
        ...mockModelPromotionAnnouncement,
        save: jest.fn().mockResolvedValue(mockModelPromotionAnnouncement),
      };
    }

    MockPromotionAnnouncementModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockModelPromotionAnnouncement),
    });
    MockPromotionAnnouncementModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockModelPromotionAnnouncement),
    });
    MockPromotionAnnouncementModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockModelPromotionAnnouncement),
    });
    MockPromotionAnnouncementModel.deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    MockPromotionAnnouncementModel.aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockModelPromotionAnnouncement]),
    });
    MockPromotionAnnouncementModel.countDocuments = jest.fn().mockResolvedValue(1);

    const MockPromotionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue([{ code: 'test-promotion-announcement', operatorId: 'op123' }]),
        }),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PromotionAnnouncementModule],
    })
      .overrideProvider(getModelToken(PromotionAnnouncement.name))
      .useValue(MockPromotionAnnouncementModel)
      .overrideProvider(getModelToken('Promotion'))
      .useValue(MockPromotionModel)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/promotion-announcements (GET)', () => {
    it('should return all promotion announcements', () => {
      return request(app.getHttpServer()).get('/promotion-announcements').expect(200);
    });

    it('should filter promotion announcements by status', () => {
      return request(app.getHttpServer())
        .get('/promotion-announcements?status=running')
        .expect(200);
    });

    it('should combine multiple filters', () => {
      return request(app.getHttpServer())
        .get('/promotion-announcements?status=running')
        .expect(200);
    });
  });

  describe('/promotion-announcements/:id (GET)', () => {
    it('should return a promotion announcement by ID', async () => {
      const mockAnnouncement = {
        _id: 'a-promotion-announcement-id',
        promotionTitle: { 'en-US': 'Hot Promotion' },
        fromDate: '2025-06-01T00:00:00.000Z',
        toDate: '2025-06-02T00:00:00.000Z',
      };

      const mockModel = app.get(getModelToken(PromotionAnnouncement.name));
      const execMock = jest.fn().mockResolvedValueOnce(mockAnnouncement);
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      const findByIdMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockModel.findById = findByIdMock;

      const response = await request(app.getHttpServer())
        .get('/promotion-announcements/a-promotion-announcement-id')
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining(mockAnnouncement));
    });

    it('should return 404 for non-existent promotion announcement', () => {
      const mockModel = app.get(getModelToken(PromotionAnnouncement.name));
      mockModel.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) }),
      });

      return request(app.getHttpServer())
        .get('/promotion-announcements/nonexistent-id')
        .expect(404);
    });
  });

  describe('/promotion-announcements (POST)', () => {
    it('should create a new promotion announcement', () => {
      const dto = {
        promotionMappings: ['code1', 'code2'],
        promotionTitle: { 'en-US': 'Test Promotion Announcement' },
        bannerContent: { 'en-US': 'Test Content' },
        fromDate: mockDate,
        toDate: futureDate,
        template: 2,
        termsAndConditions: { 'en-US': 'Test Terms and Conditions' },
      };

      return request(app.getHttpServer()).post('/promotion-announcements').send(dto).expect(201);
    });

    it('should validate the promotion announcement data', () => {
      const invalidDto = {
        promotionTitle: { 'en-US': 'Test Promotion Announcement' },
        bannerContent: { 'en-US': 'Test Content' },
        fromDate: mockDate,
        toDate: futureDate,
      };

      return request(app.getHttpServer())
        .post('/promotion-announcements')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/promotion-announcements/:id (PUT)', () => {
    it('should update a promotion', () => {
      const updateDto = {
        promotionTitle: { 'en-US': 'Updated Promotion Announcement' },
      };

      const mockModel = app.get(getModelToken(PromotionAnnouncement.name));
      mockModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({ ...mockPromotionAnnouncement, ...updateDto }),
      });

      return request(app.getHttpServer())
        .put('/promotion-announcements/a-promotion-announcement-id')
        .send(updateDto)
        .expect(200);
    });

    it('should return 404 for non-existent promotion announcement', () => {
      const mockModel = app.get(getModelToken(PromotionAnnouncement.name));
      mockModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      });

      return request(app.getHttpServer())
        .put('/promotions-announcements/nonexistent-id')
        .send({ promotionTitle: { 'en-US': 'Updated Promotion' } })
        .expect(404);
    });
  });

  describe('/promotion-announcements/:id (DELETE)', () => {
    it('should delete a promotion announcement', () => {
      return request(app.getHttpServer())
        .delete('/promotion-announcements/a-promotion-announcement-id')
        .expect(200)
        .expect({
          statusCode: 200,
          message:
            'Promotion announcement with ID a-promotion-announcement-id deleted successfully',
        });
    });

    it('should return 404 for non-existent promotion announcement', () => {
      const mockModel = app.get(getModelToken(PromotionAnnouncement.name));
      mockModel.deleteOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce({ deletedCount: 0 }),
      });

      return request(app.getHttpServer())
        .delete('/promotion-announcements/nonexistent-id')
        .expect(404);
    });
  });

  describe('/promotion-announcements/admin/test (GET)', () => {
    it('should return test endpoint message', () => {
      return request(app.getHttpServer())
        .get('/promotion-announcements/admin/test')
        .expect(200)
        .expect({
          status: 'ok',
          message: 'Promotion announcement API test endpoint is working',
        });
    });
  });
});
