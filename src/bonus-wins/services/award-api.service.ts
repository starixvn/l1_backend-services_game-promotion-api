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
interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

@Injectable()
export class AwardAPIService {
  private readonly awardAPIUrl: string | undefined;
  private readonly awardAPITimeout: number;
  private readonly authUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly loggerService: LoggerService) {
    this.awardAPIUrl = process.env.AWARD_API_URL;
    this.awardAPITimeout = parseInt(process.env.AWARD_API_TIMEOUT || '30000');
    this.authUrl = process.env.AWARD_AUTH_URL || 'http://l2-auth-api-local2-service:5000';
    this.clientId = process.env.AWARD_CLIENT_ID || 'game-server';
    this.clientSecret = process.env.AWARD_CLIENT_SECRET || 'gameserver@20luminet&';
  }

  /**
   * Get OAuth2 Bearer token using client credentials flow
   * @returns Bearer token string
   */
  private async getBearerToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    try {
      const tokenResponse = await axios.post<OAuthTokenResponse>(
        `${this.authUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000, // 10 seconds for auth
        },
      );

      const { access_token, expires_in } = tokenResponse.data;

      // Cache the token (expire 30 seconds early to be safe)
      this.cachedToken = {
        token: access_token,
        expiresAt: Date.now() + (expires_in - 30) * 1000,
      };

      return access_token;
    } catch (error) {
      this.loggerService.error('Failed to get OAuth token', error.stack, {
        authUrl: this.authUrl,
        clientId: this.clientId,
        error: error.message,
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
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
      // Get Bearer token for authentication
      const bearerToken = await this.getBearerToken();

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
            Authorization: `bearer ${bearerToken}`,
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
