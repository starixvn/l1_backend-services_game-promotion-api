/**
 * Action Log Interface
 * Represents structured log entries for player actions
 */
export interface IActionLog {
  /**
   * Operator identifier
   */
  operatorId: string;

  /**
   * ISO 8601 timestamp (auto-generated)
   */
  logTimeStamp: string;

  /**
   * Action name (e.g., "claim-bonus-win", "assign-promotion")
   */
  action: string;

  /**
   * Request parameters
   */
  request: IActionLogRequest;

  /**
   * Response data (optional)
   */
  response?: IActionLogResponse;
}

/**
 * Action Log Request Interface
 */
export interface IActionLogRequest {
  playerId: string;
  siteName: string;
  promotionId?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Action Log Response Interface
 */
export interface IActionLogResponse {
  claimedAmount?: number;
  totalTurnover?: number;
  minRequiredTurnover?: number;
  totalWinAmount?: number;
  progressPercentage?: number;
  errorCode?: string;
  errorMessage?: string;
  errorDescription?: string;
  [key: string]: any; // Allow additional fields
}
