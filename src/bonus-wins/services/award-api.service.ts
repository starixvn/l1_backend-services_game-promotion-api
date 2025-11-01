import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { LoggerService } from '../../core/logger/logger.service';

interface AwardAPIRequest {
  TimeStamp: string;
  PlayerId: string;
  Amount: number;
  GameTypeId: number;
  PromotionId: string;
  Currency: string;
  SiteId: string;
}

interface AwardAPIResponse {
  TimeStamp: string;
  Result: {
    Seq: string;
    PlayerId: string;
    ErrorCode: number;
    ErrorDescription: string;
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
  }): Promise<AwardAPIResult> {
    if (!this.awardAPIUrl) {
      throw new Error('AwardAPI URL is not configured');
    }

    const now = new Date();
    const timestamp = now.toISOString();

    const awardRequest: AwardAPIRequest = {
      TimeStamp: timestamp,
      PlayerId: requestData.playerId,
      Amount: Number(requestData.amount.toFixed(4)),
      GameTypeId: requestData.gameTypeId,
      PromotionId: requestData.promotionId,
      Currency: requestData.currency,
      SiteId: requestData.siteId,
    };

    try {
      this.loggerService.captureMessage('Calling AwardAPI', 'fatal', {
        url: this.awardAPIUrl,
        request: awardRequest,
      });

      const response: AxiosResponse<AwardAPIResponse> = await axios.post(
        this.awardAPIUrl,
        awardRequest,
        {
          timeout: this.awardAPITimeout,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const awardAPIResponse = response.data;
      const awardResult: AwardAPIResult = {
        success: awardAPIResponse.Result.ErrorCode === 0,
        message: awardAPIResponse.Result.ErrorDescription,
        transactionId: awardAPIResponse.Result.Seq,
        errorCode: awardAPIResponse.Result.ErrorCode,
      };

      this.loggerService.captureMessage('AwardAPI call completed', 'fatal', {
        response: awardResult,
        rawResponse: awardAPIResponse,
        statusCode: response.status,
      });

      return awardResult;
    } catch (error) {
      this.loggerService.error('AwardAPI call failed', error.stack, {
        url: this.awardAPIUrl,
        request: awardRequest,
        error: error.message,
        response: error.response?.data,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        message: `AwardAPI call failed: ${error.message}`,
      };
    }
  }
}
