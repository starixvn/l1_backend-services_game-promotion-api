import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiClientConfig } from './config/api-client.config';
import {
  PlayerDto,
  AssignPromotionDto,
  DeductBonusItemDto,
  RollbackBonusItemDto,
  CreatePromotionTicketDto,
  RedeemGiftCodeDto,
  UpdateTotalWinDto,
  UpdateTotalTurnoverDto,
  CalculateTORequirementDto,
} from './dtos';
import {
  PlayerPromotionResponse,
  EligiblePromotionsResponse,
  AssignmentResponse,
  DeductBonusItemResponse,
  RollbackResponse,
  CreatePromotionTicketResponse,
  PromotionResponse,
  UpdateTotalWinResponse,
  UpdateTotalTurnoverResponse,
  CalculateTORequirementResponse,
} from './responses';
import { TotalWinDto } from './dtos/total-win.dto';
import { PromotionExpiryResponse } from './responses/promotion.response';

export class GamePromotionApiClient {
  private readonly httpClient: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.httpClient = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: any) => {
        if (error.response) {
          // Server responded with error status
          throw new Error(
            `API Error: ${error.response.status} - ${error.response.data?.message || error.message}`,
          );
        } else if (error.request) {
          // Request was made but no response received
          throw new Error('Network Error: No response received from server');
        } else {
          // Something else happened
          throw new Error(`Request Error: ${error.message}`);
        }
      },
    );
  }

  // ===== PLAYER PROMOTION METHODS =====

  /**
   * Get existing or claim new promotion for a player
   */
  async claimPromotion(playerDto: PlayerDto): Promise<PlayerPromotionResponse> {
    const response: AxiosResponse<PlayerPromotionResponse> = await this.httpClient.post(
      '/player-promotions/claim-promotion',
      playerDto,
    );
    return response.data;
  }

  /**
   * Update total win amount for a player promotion (Stream Event)
   */
  async updateTotalWinAmount(updateDto: UpdateTotalWinDto): Promise<UpdateTotalWinResponse> {
    const response: AxiosResponse<UpdateTotalWinResponse> = await this.httpClient.post(
      '/player-promotions/update-total-win',
      updateDto,
    );
    return response.data;
  }

  /**
   * Update total turnover for a player promotion (Stream Event)
   */
  async updateTotalTurnover(
    updateDto: UpdateTotalTurnoverDto,
  ): Promise<UpdateTotalTurnoverResponse> {
    const response: AxiosResponse<UpdateTotalTurnoverResponse> = await this.httpClient.post(
      '/player-promotions/update-total-turnover',
      updateDto,
    );
    return response.data;
  }

  /**
   * Calculate TO requirement for a player promotion (Stream Event)
   */
  async calculateTORequirement(
    calculateDto: CalculateTORequirementDto,
  ): Promise<CalculateTORequirementResponse> {
    const response: AxiosResponse<CalculateTORequirementResponse> = await this.httpClient.post(
      '/player-promotions/calculate-to-requirement',
      calculateDto,
    );
    return response.data;
  }

  /**
   * Check which promotions are eligible for a player
   */
  async checkEligibility(playerDto: PlayerDto): Promise<EligiblePromotionsResponse> {
    const response: AxiosResponse<EligiblePromotionsResponse> = await this.httpClient.post(
      '/player-promotions/has-promotion',
      playerDto,
    );
    return response.data;
  }

  /**
   * Redeem a gift code promotion
   */
  async redeemGiftCode(redeemDto: RedeemGiftCodeDto): Promise<PlayerPromotionResponse> {
    const response: AxiosResponse<PlayerPromotionResponse> = await this.httpClient.post(
      '/player-promotions/redeem-gift-code',
      redeemDto,
    );
    return response.data;
  }

  /**
   * Assign a promotion to a player
   */
  async assignPromotion(assignDto: AssignPromotionDto): Promise<AssignmentResponse> {
    const response: AxiosResponse<AssignmentResponse> = await this.httpClient.post(
      '/player-promotions/assign',
      assignDto,
    );
    return response.data;
  }

  /**
   * Deduct a bonus item from player promotion
   */
  async deductBonusItem(deductDto: DeductBonusItemDto): Promise<DeductBonusItemResponse> {
    const response: AxiosResponse<DeductBonusItemResponse> = await this.httpClient.post(
      '/player-promotions/deduct-bonus-item',
      deductDto,
    );
    return response.data;
  }

  /**
   * Rollback a bonus item deduction
   */
  async rollbackBonusItem(rollbackDto: RollbackBonusItemDto): Promise<RollbackResponse> {
    const response: AxiosResponse<RollbackResponse> = await this.httpClient.post(
      '/player-promotions/rollback-bonus-item',
      rollbackDto,
    );
    return response.data;
  }

  // ===== PROMOTION METHODS =====

  async getRunningPromotions(operatorId?: string, gameId?: string): Promise<PromotionResponse[]> {
    const response: AxiosResponse<PromotionResponse[]> = await this.httpClient.get(
      `/promotions/running?operatorId=${operatorId}&gameId=${gameId}`,
    );
    return response.data;
  }

  /**
   * Get a specific promotion by ID
   */
  async getPromotionById(promotionId: string): Promise<PromotionResponse> {
    const response: AxiosResponse<PromotionResponse> = await this.httpClient.get(
      `/promotions/${promotionId}`,
    );
    return response.data;
  }

  async getExpiringPromotions(gameId?: string): Promise<PromotionExpiryResponse[]> {
    const response: AxiosResponse<PromotionExpiryResponse[]> = await this.httpClient.get(
      `/promotions/expiring?gameId=${gameId}`,
    );
    return response.data;
  }

  // ===== PROMOTION TICKET METHODS =====

  /**
   * Create a new promotion ticket for tracking
   */
  async createPromotionTicket(
    createTicketDto: CreatePromotionTicketDto,
  ): Promise<CreatePromotionTicketResponse> {
    const response: AxiosResponse<CreatePromotionTicketResponse> = await this.httpClient.post(
      '/promotion-tickets',
      createTicketDto,
    );
    return response.data;
  }

  /**
   * Get total win amount for a player by promotion and operator
   */
  async getTotalWin(totalWinDto: TotalWinDto): Promise<{ totalWin: number }> {
    const response: AxiosResponse<{ totalWin: number }> = await this.httpClient.post(
      '/promotion-tickets/total-win',
      totalWinDto,
    );
    return response.data;
  }

  // ===== UTILITY METHODS =====

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.httpClient.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`);
    }
  }

  /**
   * Update the base URL for the client
   */
  updateBaseURL(newBaseURL: string): void {
    this.httpClient.defaults.baseURL = newBaseURL;
  }

  /**
   * Add or update headers
   */
  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.httpClient.defaults.headers, headers);
  }
}
