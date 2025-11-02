import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { LoggerService } from '../../core/logger/logger.service';

interface AwardAPIRequest {
  operatorId: string;
  playerId: string;
  siteId: string;
  gameTypeId: number;
  amount: number;
  promotionId: string;
  currency: string;
  awardType: number;
}

interface AwardAPIResponse {
  timeStamp: string;
  result: {
    playerId: string | null;
    seq: string;
    errorCode: number;
    errorMessage: string | null;
    errorDescription: string | null;
  };
}

interface AwardAPIResult {
  success: boolean;
  message?: string;
  transactionId?: string;
  errorCode?: number;
}

/**
 * Service for calling external AwardAPI to reward players
 */
@Injectable()
export class AwardAPIService {
  private readonly awardAPIUrl: string | undefined;
  private readonly awardAPITimeout: number;
  private readonly httpHeaders = { 'Content-Type': 'application/json' };

  constructor(private readonly loggerService: LoggerService) {
    this.awardAPIUrl = process.env.AWARD_API_URL;
    this.awardAPITimeout = parseInt(process.env.AWARD_API_TIMEOUT || '30000');
  }

  /**
   * Call AwardAPI to reward player with bonus wins
   * @param requestData Request data for AwardAPI
   * @returns AwardAPI result
   */
  async awardPlayer(requestData: {
    playerId: string;
    amount: number;
    promotionId: string;
    currency: string;
    siteId: string;
    gameTypeId: number;
    operatorId: string;
    awardType?: number;
  }): Promise<AwardAPIResult> {
    if (!this.awardAPIUrl) {
      throw new Error('AwardAPI URL is not configured');
    }

    const { operatorId, playerId, siteId, gameTypeId, amount, promotionId, currency, awardType } =
      requestData;

    const awardRequest: AwardAPIRequest = {
      operatorId,
      playerId,
      siteId,
      gameTypeId,
      amount: Number(amount.toFixed(4)),
      promotionId,
      currency,
      awardType: awardType ?? 1, // Default to 1 if not provided
    };

    try {
      // Send JSON payload - axios automatically serializes objects to JSON
      const response: AxiosResponse<AwardAPIResponse> = await axios.post(
        this.awardAPIUrl,
        awardRequest, // JSON object - axios will serialize automatically
        {
          timeout: this.awardAPITimeout,
          headers: this.httpHeaders,
        },
      );

      const awardAPIResponse = response.data;
      // Status 200 and errorCode 0 mean successful
      const isSuccess = response.status === 200 && awardAPIResponse.result.errorCode === 0;
      const awardResult: AwardAPIResult = {
        success: isSuccess,
        message:
          awardAPIResponse.result.errorDescription ||
          awardAPIResponse.result.errorMessage ||
          undefined,
        transactionId: awardAPIResponse.result.seq,
        errorCode: awardAPIResponse.result.errorCode,
      };

      return awardResult;
    } catch (error) {
      this.loggerService.error('AwardAPI call failed', error.stack, {
        url: this.awardAPIUrl,
        request: awardRequest,
        error: error.message,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        message: `AwardAPI call failed: ${error.message}`,
      };
    }
  }
}
