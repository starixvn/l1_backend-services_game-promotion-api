import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { LogBuilder } from './log-builder.util';

describe('LogBuilder', () => {
  const OPERATOR_ID = 'ONEworksVGCash';
  const ACTION = 'claim-bonus-win';
  const REQUEST_DATA = {
    playerId: 'PLAYER123',
    siteName: 'casino.com',
    promotionId: 'PROMO456',
  };

  describe('constructor', () => {
    it('should create a log builder with initial values', () => {
      // Arrange & Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const log = logBuilder.build();

      // Assert
      expect(log.operatorId).toBe(OPERATOR_ID);
      expect(log.action).toBe(ACTION);
      expect(log.request).toEqual(REQUEST_DATA);
      expect(log.logTimeStamp).toBeDefined();
      expect(log.response).toBeUndefined();
    });

    it('should generate ISO 8601 timestamp', () => {
      // Arrange & Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const log = logBuilder.build();

      // Assert
      expect(log.logTimeStamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should accept different action names', () => {
      // Arrange & Act
      const actions = ['claim-bonus-win', 'update-turnover', 'assign-promotion'];

      // Assert
      actions.forEach(action => {
        const logBuilder = new LogBuilder(OPERATOR_ID, action, REQUEST_DATA);
        const log = logBuilder.build();
        expect(log.action).toBe(action);
      });
    });

    it('should accept any request data structure', () => {
      // Arrange
      const customRequest = {
        playerId: 'PLAYER999',
        gameId: 5001,
        betAmount: 100,
        customField: 'custom value',
      };

      // Act
      const logBuilder = new LogBuilder(OPERATOR_ID, 'update-turnover', customRequest);
      const log = logBuilder.build();

      // Assert
      expect(log.request).toEqual(customRequest);
    });
  });

  describe('withResponse', () => {
    it('should add response data to log', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const responseData = {
        claimedAmount: 50,
        totalTurnover: 1200,
        minRequiredTurnover: 1000,
      };

      // Act
      const log = logBuilder.withResponse(responseData).build();

      // Assert
      expect(log.response).toEqual(responseData);
    });

    it('should return this for method chaining', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const result = logBuilder.withResponse({ success: true });

      // Assert
      expect(result).toBe(logBuilder);
    });

    it('should merge multiple withResponse calls', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder
        .withResponse({ claimedAmount: 50 })
        .withResponse({ totalTurnover: 1200 })
        .build();

      // Assert
      expect(log.response).toEqual({
        claimedAmount: 50,
        totalTurnover: 1200,
      });
    });

    it('should overwrite duplicate keys', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder
        .withResponse({ claimedAmount: 50 })
        .withResponse({ claimedAmount: 100 })
        .build();

      // Assert
      expect(log.response?.claimedAmount).toBe(100);
    });
  });

  describe('withError', () => {
    it('should add error code, message, and description', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder
        .withError(PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code)
        .build();

      // Assert
      expect(log.response?.errorCode).toBe('SB3024');
      expect(log.response?.errorMessage).toBe('Turnover Requirement Not Met');
      expect(log.response?.errorDescription).toBe(
        'Player has not met the minimum turnover requirement',
      );
    });

    it('should add additional data with error', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const additionalData = {
        claimedAmount: 0,
        totalTurnover: 500,
        minRequiredTurnover: 1000,
      };

      // Act
      const log = logBuilder
        .withError(PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code, additionalData)
        .build();

      // Assert
      expect(log.response).toEqual({
        claimedAmount: 0,
        totalTurnover: 500,
        minRequiredTurnover: 1000,
        errorCode: 'SB3024',
        errorMessage: 'Turnover Requirement Not Met',
        errorDescription: 'Player has not met the minimum turnover requirement',
      });
    });

    it('should return this for method chaining', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const result = logBuilder.withError(
        PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.code,
      );

      // Assert
      expect(result).toBe(logBuilder);
    });

    it('should handle unknown error codes with default message', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder.withError('UNKNOWN_CODE').build();

      // Assert
      expect(log.response?.errorCode).toBe('UNKNOWN_CODE');
      expect(log.response?.errorMessage).toBe('Unknown Error');
      expect(log.response?.errorDescription).toBe('An unknown error occurred');
    });

    it('should chain withResponse and withError', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder
        .withResponse({
          claimedAmount: 0,
          totalTurnover: 500,
        })
        .withError(PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code)
        .build();

      // Assert
      expect(log.response).toEqual({
        claimedAmount: 0,
        totalTurnover: 500,
        errorCode: 'SB3024',
        errorMessage: 'Turnover Requirement Not Met',
        errorDescription: 'Player has not met the minimum turnover requirement',
      });
    });

    it('should handle all known error codes', () => {
      // Arrange
      const errorCodes = [
        PLAYER_PROMOTION_ERROR_CODES.NO_ACTIVE_BONUS_WIN.code,
        PLAYER_PROMOTION_ERROR_CODES.BONUS_ALREADY_CLAIMED.code,
        PLAYER_PROMOTION_ERROR_CODES.PLAYER_PROMOTION_NOT_FOUND.code,
        PLAYER_PROMOTION_ERROR_CODES.CLAIMING_EXPIRED.code,
        PLAYER_PROMOTION_ERROR_CODES.STREAM_PROCESSING_ERROR.code,
        PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code,
        PLAYER_PROMOTION_ERROR_CODES.CLAIM_VERIFICATION_FAILED.code,
        PLAYER_PROMOTION_ERROR_CODES.CLAIM_UPDATE_FAILED.code,
        PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code,
      ];

      // Act & Assert
      errorCodes.forEach(errorCode => {
        const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
        const log = logBuilder.withError(errorCode).build();

        expect(log.response?.errorCode).toBe(errorCode);
        expect(log.response?.errorMessage).toBeDefined();
        expect(log.response?.errorMessage).not.toBe('Unknown Error');
        expect(log.response?.errorDescription).toBeDefined();
        expect(log.response?.errorDescription).not.toBe('An unknown error occurred');
      });
    });
  });

  describe('build', () => {
    it('should return complete log object', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder
        .withResponse({
          claimedAmount: 50,
          totalTurnover: 1200,
        })
        .build();

      // Assert
      expect(log).toHaveProperty('operatorId');
      expect(log).toHaveProperty('logTimeStamp');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('request');
      expect(log).toHaveProperty('response');
    });

    it('should return log without response if not set', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);

      // Act
      const log = logBuilder.build();

      // Assert
      expect(log).toHaveProperty('operatorId');
      expect(log).toHaveProperty('logTimeStamp');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('request');
      expect(log.response).toBeUndefined();
    });

    it('should be callable multiple times with consistent results', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      logBuilder.withResponse({ success: true });

      // Act
      const log1 = logBuilder.build();
      const log2 = logBuilder.build();

      // Assert
      expect(log1).toEqual(log2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle success scenario', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, 'claim-bonus-win', {
        playerId: 'PLAYER123',
        siteName: 'casino.com',
        promotionId: 'PROMO456',
      });

      // Act
      const log = logBuilder
        .withResponse({
          claimedAmount: 50,
          totalTurnover: 1200,
          minRequiredTurnover: 1000,
          totalWinAmount: 50,
          progressPercentage: 120,
          claimedAt: new Date('2025-03-24T01:57:13.180Z'),
        })
        .build();

      // Assert
      expect(log.operatorId).toBe('ONEworksVGCash');
      expect(log.action).toBe('claim-bonus-win');
      expect(log.response?.claimedAmount).toBe(50);
      expect(log.response).not.toHaveProperty('errorCode');
    });

    it('should handle error scenario with context data', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, 'claim-bonus-win', {
        playerId: 'PLAYER123',
        siteName: 'casino.com',
        promotionId: 'PROMO456',
      });

      // Act
      const log = logBuilder
        .withResponse({
          claimedAmount: 0,
          totalTurnover: 500,
          minRequiredTurnover: 1000,
          totalWinAmount: 50,
          remainingTO: 500,
          progressPercentage: 50,
        })
        .withError(PLAYER_PROMOTION_ERROR_CODES.CLAIM_TO_REQUIREMENT_NOT_MET.code)
        .build();

      // Assert
      expect(log.response?.errorCode).toBe('SB3024');
      expect(log.response?.errorMessage).toBe('Turnover Requirement Not Met');
      expect(log.response?.claimedAmount).toBe(0);
      expect(log.response?.remainingTO).toBe(500);
    });

    it('should handle different action types', () => {
      // Arrange & Act
      const updateTurnoverLog = new LogBuilder(OPERATOR_ID, 'update-turnover', {
        playerId: 'PLAYER123',
        gameId: 5001,
        betAmount: 100,
      })
        .withResponse({
          success: true,
          totalTurnover: 1500,
        })
        .build();

      const assignPromotionLog = new LogBuilder(OPERATOR_ID, 'assign-promotion', {
        playerId: 'PLAYER123',
        promotionId: 'PROMO789',
      })
        .withResponse({
          assignmentId: 'ASSIGN123',
          bonusItems: 10,
        })
        .build();

      // Assert
      expect(updateTurnoverLog.action).toBe('update-turnover');
      expect(assignPromotionLog.action).toBe('assign-promotion');
    });

    it('should handle unexpected error with custom message', () => {
      // Arrange
      const logBuilder = new LogBuilder(OPERATOR_ID, 'claim-bonus-win', REQUEST_DATA);
      const errorMessage = 'Database connection timeout';

      // Act
      const log = logBuilder
        .withResponse({
          claimedAmount: 0,
          error: errorMessage,
        })
        .withError(PLAYER_PROMOTION_ERROR_CODES.CLAIM_UNEXPECTED_ERROR.code)
        .build();

      // Assert
      expect(log.response?.errorCode).toBe('SB3029');
      expect(log.response?.errorMessage).toBe('Unexpected Error');
      expect(log.response?.error).toBe(errorMessage);
    });
  });

  describe('edge cases', () => {
    it('should handle empty request object', () => {
      // Arrange & Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, {});
      const log = logBuilder.build();

      // Assert
      expect(log.request).toEqual({});
    });

    it('should handle empty response object', () => {
      // Arrange & Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const log = logBuilder.withResponse({}).build();

      // Assert
      expect(log.response).toEqual({});
    });

    it('should handle null values in response', () => {
      // Arrange & Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, REQUEST_DATA);
      const log = logBuilder
        .withResponse({
          value: null,
          amount: 0,
        })
        .build();

      // Assert
      expect(log.response?.value).toBeNull();
      expect(log.response?.amount).toBe(0);
    });

    it('should handle nested objects in request', () => {
      // Arrange
      const complexRequest = {
        playerId: 'PLAYER123',
        metadata: {
          region: 'Asia',
          level: 5,
        },
      };

      // Act
      const logBuilder = new LogBuilder(OPERATOR_ID, ACTION, complexRequest);
      const log = logBuilder.build();

      // Assert
      expect(log.request).toEqual(complexRequest);
      expect(log.request.metadata.region).toBe('Asia');
    });
  });
});
