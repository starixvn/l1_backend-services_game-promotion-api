import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { Issuer, custom } from 'openid-client';
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
  private readonly authUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: { token: any; expired: number | null } | null = null;

  constructor(private readonly loggerService: LoggerService) {
    this.awardAPIUrl = process.env.AWARD_API_URL;
    this.awardAPITimeout = parseInt(process.env.AWARD_API_TIMEOUT || '30000');
    this.authUrl = process.env.AWARD_AUTH_URL || 'http://l2-auth-api-local2-service:5000';
    this.clientId = process.env.AWARD_CLIENT_ID || 'game-server';
    // Note: Client secret can contain special characters like @ or &
    // When setting in .env file or environment, ensure it's properly quoted if needed:
    // AWARD_CLIENT_SECRET="gameserver@20luminet&"
    this.clientSecret = process.env.AWARD_CLIENT_SECRET || 'gameserver@20luminet&';
  }

  /**
   * Get OAuth2 Bearer token using client credentials flow
   * @returns Bearer token with expiration info
   */
  private async getBearerToken() {
    // Check if we have a valid cached token
    if (
      this.cachedToken &&
      this.cachedToken.expired &&
      Math.floor(Date.now() / 1000) < this.cachedToken.expired
    ) {
      return this.cachedToken.token.access_token;
    }

    try {
      // Set HTTP options globally to allow insecure requests (for development/testing)
      custom.setHttpOptionsDefaults({
        timeout: this.awardAPITimeout,
        rejectUnauthorized: false,
      } as any);

      // Discover the issuer
      const issuer = await Issuer.discover(this.authUrl);

      // Log client configuration for debugging (without exposing full secret)
      this.loggerService.log('Attempting to get bearer token', false, {
        authUrl: this.authUrl,
        clientId: this.clientId,
        clientSecretLength: this.clientSecret?.length || 0,
        tokenEndpoint: issuer.metadata.token_endpoint,
        supportedAuthMethods: issuer.metadata.token_endpoint_auth_methods_supported,
      });

      // Try client_secret_basic first, then fallback to client_secret_post
      // Some providers require basic auth for client credentials flow
      const authMethod = issuer.metadata.token_endpoint_auth_methods_supported?.includes(
        'client_secret_basic',
      )
        ? 'client_secret_basic'
        : 'client_secret_post';

      // Create a client with client credentials
      const client = new issuer.Client({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        token_endpoint_auth_method: authMethod,
      });

      // Request token using client credentials grant
      const tokenSet = await client.grant({
        grant_type: 'client_credentials',
      });

      this.cachedToken = tokenSet.access_token
        ? {
            token: tokenSet,
            expired: tokenSet.expires_at || null,
          }
        : null;

      return this.cachedToken?.token.access_token || null;
    } catch (error) {
      // Enhanced error logging for debugging invalid_client errors
      const errorDetails: any = {
        authUrl: this.authUrl,
        clientId: this.clientId,
        clientSecretLength: this.clientSecret?.length || 0,
        clientSecretStartsWith: this.clientSecret?.substring(0, 3) || '',
        clientSecretEndsWith:
          this.clientSecret?.substring(Math.max(0, this.clientSecret.length - 3)) || '',
        errorType: error.constructor?.name || 'Unknown',
      };

      // Include additional error information if available
      if (error.response) {
        errorDetails.statusCode = error.response.status;
        errorDetails.responseBody = error.response.data;
      }

      // Check if error message indicates invalid client credentials
      if (
        error.message?.toLowerCase().includes('invalid_client') ||
        error.message?.toLowerCase().includes('invalid client')
      ) {
        errorDetails.hint =
          'Check that AWARD_CLIENT_ID and AWARD_CLIENT_SECRET environment variables are set correctly. If secret contains special characters like @ or &, ensure the env var is properly quoted.';
      }

      this.loggerService.error(
        `Bearer token request failed: ${error.message}`,
        error.stack,
        errorDetails,
      );
      throw error;
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
