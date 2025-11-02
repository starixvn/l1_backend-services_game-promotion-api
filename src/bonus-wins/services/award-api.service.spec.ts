import { Test, TestingModule } from '@nestjs/testing';
import axios, { AxiosError } from 'axios';
import { LoggerService } from '../../core/logger/logger.service';
import { AwardAPIService } from './award-api.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AwardAPIService', () => {
  let service: AwardAPIService;
  let loggerService: jest.Mocked<LoggerService>;

  const mockAwardAPIUrl = 'https://api.example.com/award';
  const mockAwardAPITimeout = 30000;

  beforeEach(async () => {
    // Set environment variables
    process.env.AWARD_API_URL = mockAwardAPIUrl;
    process.env.AWARD_API_TIMEOUT = String(mockAwardAPITimeout);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwardAPIService,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            captureMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AwardAPIService>(AwardAPIService);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.AWARD_API_URL;
    delete process.env.AWARD_API_TIMEOUT;
  });

  describe('awardPlayer', () => {
    const mockRequestData = {
      playerId: 'player123',
      amount: 25.99,
      promotionId: 'promo123',
      currency: 'USD',
      siteId: 'site123',
      gameTypeId: 9999,
      operatorId: 'op123',
      awardType: 1,
    };

    it('should throw error when AwardAPI URL is not configured', async () => {
      delete process.env.AWARD_API_URL;
      const serviceWithoutUrl = new AwardAPIService(loggerService);

      await expect(serviceWithoutUrl.awardPlayer(mockRequestData)).rejects.toThrow(
        'AwardAPI URL is not configured',
      );
    });

    it('should successfully call AwardAPI and return success result', async () => {
      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: 'player123',
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 0,
            errorMessage: null,
            errorDescription: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.awardPlayer(mockRequestData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockAwardAPIUrl,
        {
          operatorId: mockRequestData.operatorId,
          playerId: mockRequestData.playerId,
          siteId: mockRequestData.siteId,
          gameTypeId: mockRequestData.gameTypeId,
          amount: Number(mockRequestData.amount.toFixed(4)),
          promotionId: mockRequestData.promotionId,
          currency: mockRequestData.currency,
          awardType: mockRequestData.awardType,
        },
        {
          timeout: mockAwardAPITimeout,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      expect(result).toEqual({
        success: true,
        message: undefined,
        errorCode: 0,
      });
    });

    it('should use default awardType of 1 when not provided', async () => {
      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: 'player123',
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 0,
            errorMessage: null,
            errorDescription: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const { ...requestWithoutAwardType } = mockRequestData;
      const result = await service.awardPlayer(requestWithoutAwardType);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockAwardAPIUrl,
        expect.objectContaining({
          awardType: 1,
        }),
        expect.any(Object),
      );

      expect(result.success).toBe(true);
    });

    it('should handle AwardAPI error response (errorCode !== 0)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: null,
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 1001,
            errorMessage: 'Invalid player',
            errorDescription: 'Player not found',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.awardPlayer(mockRequestData);

      expect(result).toEqual({
        success: false,
        message: 'Player not found',
        errorCode: 1001,
      });
    });

    it('should handle AwardAPI error response with errorDescription', async () => {
      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: null,
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 1002,
            errorMessage: null,
            errorDescription: 'Unspecified Error',
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.awardPlayer(mockRequestData);

      expect(result).toEqual({
        success: false,
        message: 'Unspecified Error',
        errorCode: 1002,
      });
    });

    it('should handle non-200 status code', async () => {
      const mockResponse = {
        status: 400,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: null,
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 0,
            errorMessage: null,
            errorDescription: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.awardPlayer(mockRequestData);

      expect(result).toEqual({
        success: false,
        message: undefined,
        errorCode: 0,
      });
    });

    it('should format amount to 4 decimal places', async () => {
      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: 'player123',
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 0,
            errorMessage: null,
            errorDescription: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.awardPlayer({
        ...mockRequestData,
        amount: 25.99999999,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockAwardAPIUrl,
        expect.objectContaining({
          amount: 26.0,
        }),
        expect.any(Object),
      );
    });

    it('should handle axios error and return failure result', async () => {
      const axiosError = {
        message: 'Network Error',
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
        stack: 'Error stack trace',
      } as AxiosError;

      mockedAxios.post.mockRejectedValue(axiosError);

      const result = await service.awardPlayer(mockRequestData);

      expect(loggerService.error).toHaveBeenCalledWith('AwardAPI call failed', axiosError.stack, {
        url: mockAwardAPIUrl,
        request: expect.objectContaining({
          playerId: mockRequestData.playerId,
          amount: Number(mockRequestData.amount.toFixed(4)),
        }),
        error: 'Network Error',
        statusCode: 500,
      });

      expect(result).toEqual({
        success: false,
        message: 'AwardAPI call failed: Network Error',
      });
    });

    it('should handle axios error without response', async () => {
      const axiosError = {
        message: 'Network Error',
        stack: 'Error stack trace',
      } as AxiosError;

      mockedAxios.post.mockRejectedValue(axiosError);

      const result = await service.awardPlayer(mockRequestData);

      expect(loggerService.error).toHaveBeenCalledWith('AwardAPI call failed', axiosError.stack, {
        url: mockAwardAPIUrl,
        request: expect.any(Object),
        error: 'Network Error',
        statusCode: undefined,
      });

      expect(result).toEqual({
        success: false,
        message: 'AwardAPI call failed: Network Error',
      });
    });

    it('should use custom timeout from environment variable', async () => {
      const customTimeout = 60000;
      process.env.AWARD_API_TIMEOUT = String(customTimeout);

      const serviceWithCustomTimeout = new AwardAPIService(loggerService);

      const mockResponse = {
        status: 200,
        data: {
          timeStamp: '2025-11-02T11:09:54.4816225+00:00',
          result: {
            playerId: 'player123',
            seq: 'af24ec4a-79b5-48f5-ad28-0133ff2c05e5',
            errorCode: 0,
            errorMessage: null,
            errorDescription: null,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await serviceWithCustomTimeout.awardPlayer(mockRequestData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockAwardAPIUrl,
        expect.any(Object),
        expect.objectContaining({
          timeout: customTimeout,
        }),
      );
    });
  });
});
