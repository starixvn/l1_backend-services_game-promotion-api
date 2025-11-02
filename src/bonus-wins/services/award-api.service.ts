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
    this.authUrl = process.env.AWARD_AUTH_URL || 'https://l2-auth.lumigame.com/';
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

    let bearerToken: string | null = null;
    try {
      // Get Bearer token for authentication
      bearerToken = await this.getBearerToken();

      // Log bearer token information for debugging (without exposing full token)
      const bearerTokenInfo = bearerToken
        ? {
            tokenLength: bearerToken.length,
            tokenStartsWith: bearerToken.substring(0, 10),
            tokenEndsWith: bearerToken.substring(Math.max(0, bearerToken.length - 10)),
            isNull: false,
            isEmpty: bearerToken.trim().length === 0,
          }
        : {
            isNull: true,
            isEmpty: true,
            error: 'Bearer token is null or undefined',
          };

      this.loggerService.log('Bearer token retrieved for AwardAPI call', false, {
        ...bearerTokenInfo,
        authUrl: this.authUrl,
        clientId: this.clientId,
      });

      // Validate bearer token before making the request
      if (!bearerToken || bearerToken.trim().length === 0) {
        const error = new Error('Bearer token is missing or empty');
        this.loggerService.error('Cannot call AwardAPI without valid bearer token', error.stack, {
          request: awardRequest,
          bearerTokenInfo,
        });
        return {
          success: false,
          message: 'Authentication failed: Bearer token is missing or empty',
        };
      }

      this.loggerService.captureMessage('Calling AwardAPI', 'fatal', {
        url: this.awardAPIUrl,
        request: awardRequest,
        bearerTokenLength: bearerToken.length,
        bearerTokenPreview: `${bearerToken.substring(0, 10)}...${bearerToken.substring(bearerToken.length - 10)}`,
      });

      // Try passing object directly - axios may serialize it automatically with Content-Type header
      // If this doesn't work (server returns error), we'll need to use querystring.stringify()
      const response: AxiosResponse<AwardAPIResponse> = await axios.post(
        this.awardAPIUrl,
        awardRequest, // Pass object directly - axios should serialize with Content-Type header
        {
          timeout: this.awardAPITimeout,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${bearerToken}`,
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
      // Enhanced error logging for 400 errors
      const errorDetails: any = {
        url: this.awardAPIUrl,
        request: awardRequest,
        error: error.message,
        statusCode: error.response?.status,
        responseHeaders: error.response?.headers,
        responseData: error.response?.data,
      };

      // Add bearer token info if available (from the try block scope)
      if (error.response?.status === 400) {
        errorDetails.hint =
          '400 Bad Request - Check if bearer token is valid, request format is correct, and all required fields are present';
        errorDetails.bearerTokenUsed = bearerToken
          ? {
              length: bearerToken.length,
              startsWith: bearerToken.substring(0, 10),
              endsWith: bearerToken.substring(Math.max(0, bearerToken.length - 10)),
            }
          : 'Bearer token was null or undefined';
      }

      this.loggerService.error('AwardAPI call failed', error.stack, errorDetails);

      return {
        success: false,
        message: `AwardAPI call failed: ${error.message}`,
      };
    }
  }
}
