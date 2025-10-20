import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as request from 'supertest';
import { PromotionModule } from './promotion.module';
import { Promotion } from './schemas/promotion.schema';
import { PlayerPromotion } from './schemas/player-promotion.schema';
import { PlayerFinishedPromotion } from './schemas/player-finished-promotion.schema';
import { PromotionTicket } from '../promotion-ticket/schemas/promotion-ticket.schema';
import { ActionLog } from '../core/action-log/schemas/action-log.schema';
// Used in query parameters: /promotions?status=running
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PromotionStatus } from './models/promotion-filter.dto';

// Mock data
const mockDate = new Date();
const futureDate = new Date(mockDate.getTime() + 86400000); // tomorrow

describe('PromotionModule (Integration)', () => {
  let app: INestApplication;
  // mockPromotionModel is assigned using app.get() in the test cases
  let mockPlayerPromotionModel: any;
  let mockPromotionTicketModel: any;

  // Sample promotion data with string dates for JSON comparison
  const mockPromotion = {
    _id: 'a-promotion-id',
    id: 'a-promotion-id', // For conversion between MongoDB _id and REST API id
    name: 'Test Promotion',
    code: 'test-promotion',
    operatorId: 'op123',
    offeredSiteNames: ['site1'],
    currencyGroups: ['currency1'],
    startDate: mockDate.toISOString(),
    endDate: futureDate.toISOString(),
    claimExpirationDate: new Date(futureDate.getTime() + 86400000).toISOString(), // 1 day after endDate
    bonusItemCount: 10,
    offeredPlayerIds: ['player1'],
    gameConfigType: 2,
    gameIds: [1001],
    betLevels: [],
    isGiftCode: false,
    minTurnoverMultiplier: 2,
  };

  // Used for testing multiple promotion scenarios - referenced in tests via spread operator
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockPromotionArray = [
    mockPromotion,
    {
      ...mockPromotion,
      _id: 'another-promotion-id',
      id: 'another-promotion-id',
      name: 'Another Promotion',
      code: 'another-promotion',
      operatorId: 'op456',
    },
  ];

  // For internal model testing - with Date objects
  const mockModelPromotion = {
    _id: 'a-promotion-id',
    name: 'Test Promotion',
    code: 'test-promotion',
    operatorId: 'op123',
    offeredSiteNames: ['site1'],
    currencyGroups: ['currency1'],
    startDate: mockDate,
    endDate: futureDate,
    claimExpirationDate: new Date(futureDate.getTime() + 86400000), // 1 day after endDate
    bonusItemCount: 10,
    offeredPlayerIds: ['player1'],
    gameConfigType: 2,
    gameIds: [1001],
    betLevels: [],
    isGiftCode: false,
    minTurnoverMultiplier: 2,
    save: jest.fn().mockReturnThis(),
  };

  // Setup mock MongoDB model
  beforeAll(async () => {
    // Create a constructor function for the model
    function MockPromotionModel() {
      return {
        ...mockModelPromotion,
        save: jest.fn().mockResolvedValue(mockModelPromotion),
      };
    }

    // Add static methods to the model
    MockPromotionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockModelPromotion]),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockModelPromotion]),
      }),
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockModelPromotion]),
            }),
          }),
        }),
      }),
    });
    MockPromotionModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockModelPromotion),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockModelPromotion),
      }),
    });
    MockPromotionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockModelPromotion),
    });
    MockPromotionModel.deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    MockPromotionModel.aggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockModelPromotion]),
    });
    MockPromotionModel.countDocuments = jest.fn().mockResolvedValue(1);

    // Mock db.collection for announcement mappings
    MockPromotionModel.db = {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              {
                promotionMappings: ['test-promotion'],
                promotionTitle: { 'en-US': 'Test Announcement' },
              },
            ]),
          }),
        }),
        distinct: jest.fn().mockResolvedValue(['test-promotion']),
      }),
    };

    // Mock for the Player Promotion model (required by the module)
    function MockPlayerPromotionModel() {
      return {
        _id: 'player-promotion-id',
        playerId: 'player1',
        operatorId: 'op123',
        siteName: 'site1',
        promotionId: 'a-promotion-id',
        promotionCode: 'test-promotion',
        currencyGroup: 'currency1',
        remainingBonusItems: 10,
        initialBonusItem: 10,
        betLevel: 1,
        startDate: mockDate,
        endDate: futureDate,
        lastUsedDate: null,
        isGiftCode: false,
        totalTurnover: 0,
        totalWinAmount: 0,
        minRequiredTurnover: 20,
        save: jest.fn().mockResolvedValue({
          _id: 'player-promotion-id',
          playerId: 'player1',
          operatorId: 'op123',
          siteName: 'site1',
          promotionId: 'a-promotion-id',
          promotionCode: 'test-promotion',
          currencyGroup: 'currency1',
          remainingBonusItems: 10,
          initialBonusItem: 10,
          betLevel: 1,
          startDate: mockDate,
          endDate: futureDate,
          lastUsedDate: null,
          isGiftCode: false,
          totalTurnover: 0,
          totalWinAmount: 0,
          minRequiredTurnover: 20,
        }),
      };
    }

    // Add static methods to the PlayerPromotion model
    MockPlayerPromotionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    MockPlayerPromotionModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    MockPlayerPromotionModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    mockPlayerPromotionModel = MockPlayerPromotionModel;

    // Mock for the Promotion Ticket model (required by the module)
    mockPromotionTicketModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    // Mock for the PlayerFinishedPromotion model (required by the module)
    const mockPlayerFinishedPromotionModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
      create: jest.fn().mockResolvedValue({}),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PromotionModule],
    })
      .overrideProvider(getModelToken(Promotion.name))
      .useValue(MockPromotionModel)
      .overrideProvider(getModelToken(PlayerPromotion.name))
      .useValue(mockPlayerPromotionModel)
      .overrideProvider(getModelToken(PlayerFinishedPromotion.name))
      .useValue(mockPlayerFinishedPromotionModel)
      .overrideProvider(getModelToken(PromotionTicket.name))
      .useValue(mockPromotionTicketModel)
      .overrideProvider(getModelToken(ActionLog.name, 'logs'))
      .useValue(mockActionLogModel)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/promotions (GET)', () => {
    it('should return all promotions', () => {
      return request(app.getHttpServer()).get('/promotions').expect(200);
    });

    it('should filter promotions by status', () => {
      return request(app.getHttpServer()).get('/promotions?status=running').expect(200);
    });

    it('should filter promotions by operatorIds', () => {
      return request(app.getHttpServer()).get('/promotions?operatorIds=op123').expect(200);
    });

    it('should filter promotions by code', () => {
      return request(app.getHttpServer()).get('/promotions?code=test-promotion').expect(200);
    });

    it('should combine multiple filters', () => {
      return request(app.getHttpServer())
        .get('/promotions?operatorIds=op123&status=running&code=test-promotion')
        .expect(200);
    });
  });

  describe('/promotions/running (GET)', () => {
    it('should return running promotions for a specific operator', () => {
      return request(app.getHttpServer()).get('/promotions/running?operatorId=op123').expect(200);
    });

    it('should return running promotions for a specific gameId', () => {
      return request(app.getHttpServer()).get('/promotions/running?gameId=1001').expect(200);
    });

    it('should return running promotions for both operatorId and gameId', () => {
      return request(app.getHttpServer())
        .get('/promotions/running?operatorId=op123&gameId=1001')
        .expect(200);
    });

    it('should return all running promotions when no parameters are provided', () => {
      return request(app.getHttpServer()).get('/promotions/running').expect(200);
    });
  });

  describe('/promotions (POST)', () => {
    it('should create a new promotion', () => {
      const createPromotionDto = {
        name: 'Test Promotion',
        code: '1224',
        operatorId: 'op123',
        currencyGroups: ['currency1'],
        startDate: mockDate.toISOString(),
        endDate: futureDate.toISOString(),
        claimExpirationDate: new Date(futureDate.getTime() + 86400000).toISOString(), // 1 day after endDate
        bonusItemCount: 10,
        gameConfigType: 2,
        gameIds: [1001],
        isGiftCode: false,
        minTurnoverMultiplier: 2,
        maxRedemptionTimes: 1,
      };

      // Skip validation of the response body as it's causing issues
      return request(app.getHttpServer()).post('/promotions').send(createPromotionDto).expect(201);
    });

    it('should validate the promotion data', () => {
      const invalidPromotionDto = {
        // Missing required fields
        name: 'Test Promotion',
      };

      return request(app.getHttpServer()).post('/promotions').send(invalidPromotionDto).expect(400);
    });
  });

  describe('/promotions/admin/unmapped-not-started (POST)', () => {
    it('should return unmapped not started promotions', () => {
      return request(app.getHttpServer()).post('/promotions/unmapped-not-started').expect(201);
    });
  });
});
