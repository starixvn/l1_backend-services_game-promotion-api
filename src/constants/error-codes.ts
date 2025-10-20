/**
 * Global error codes for the entire application
 * Format: {MODULE}{CATEGORY}{NUMBER}
 *
 * Modules:
 * - SB: Spin Bonus (Player Promotion)
 * - PR: Promotion
 * - AN: Announcement
 *
 * Categories:
 * - 30XX: Player Promotion operations
 * - 31XX: Promotion management
 * - 32XX: Announcement operations
 */

// Player Promotion Error Codes (SB30XX)
export const PLAYER_PROMOTION_ERROR_CODES = {
  PLAYER_PROMOTION_NOT_FOUND: {
    code: 'SB3000',
  },
  DEDUCTION_FAILED: {
    code: 'SB3001',
  },
  DEDUCTION_SUCCESS: {
    code: 'SB3002',
  },
  ROLLBACK_SUCCESS: {
    code: 'SB3003',
  },
  ROLLBACK_FAILED: {
    code: 'SB3004',
  },
  TO_REQUIREMENT_NOT_MET: {
    code: 'SB3005',
  },
  BONUS_NOT_COMPLETED: {
    code: 'SB3006',
  },
  INVALID_TARGET_GAME: {
    code: 'SB3007',
  },
  STREAM_PROCESSING_ERROR: {
    code: 'SB3008',
  },
  UPDATE_TOTAL_WIN_SUCCESS: {
    code: 'SB3009',
  },
  UPDATE_TOTAL_WIN_FAILED: {
    code: 'SB3010',
  },
  CALCULATE_TO_SUCCESS: {
    code: 'SB3011',
  },
  CALCULATE_TO_FAILED: {
    code: 'SB3012',
  },
  UPDATE_TOTAL_TO_SUCCESS: {
    code: 'SB3013',
  },
  UPDATE_TOTAL_TO_FAILED: {
    code: 'SB3014',
  },
  INVALID_TURNOVER_MULTIPLIER: {
    code: 'SB3015',
  },
  BONUS_WIN_CLAIM_SUCCESS: {
    code: 'SB3016',
  },
  BONUS_WIN_CLAIM_FAILED: {
    code: 'SB3017',
  },
  BONUS_ALREADY_CLAIMED: {
    code: 'SB3018',
  },
  GIFT_CODE_REQUIRED: {
    code: 'SB3019',
  },
  INVALID_GIFT_CODE: {
    code: 'SB3020',
  },
  UNEXPECTED_GIFT_CODE_ERROR: {
    code: 'SB3021',
  },
  NO_ACTIVE_BONUS_WIN: {
    code: 'SB3022',
  },
  CLAIMING_EXPIRED: {
    code: 'SB3023',
  },
  // Claim Bonus Wins - Specific Error Codes (SB3024-SB3029)
  CLAIM_TO_REQUIREMENT_NOT_MET: {
    code: 'SB3024',
    message: 'Turnover requirement not met',
    description: 'Player has not completed the required turnover to claim bonus',
  },
  CLAIM_VERIFICATION_FAILED: {
    code: 'SB3025',
    message: 'Claim verification failed',
    description: 'Bonus claim verification checks failed',
  },
  CLAIM_UPDATE_FAILED: {
    code: 'SB3026',
    message: 'Claim update failed',
    description: 'Failed to update promotion as claimed (promotion not found or already claimed)',
  },
  CLAIM_PROMOTION_NOT_FOUND: {
    code: 'SB3027',
    message: 'Promotion not found',
    description: 'The promotion does not exist or has been removed',
  },
  CLAIM_ACTUAL_WIN_MISMATCH: {
    code: 'SB3028',
    message: 'Actual win amount mismatch',
    description: 'The calculated win amount does not match the stored amount',
  },
  CLAIM_UNEXPECTED_ERROR: {
    code: 'SB3029',
    message: 'Unexpected error during claim',
    description: 'An unexpected error occurred while processing the bonus claim',
  },
  PROMOTION_CANCELLED: {
    code: 'SB3030',
  },
  CLAIM_GET_TO_PROGRESS_FAILED: {
    code: 'SB3031',
    message: 'Failed to get TO progress',
    description:
      'Failed to get TO progress for player promotion (player promotion not found or already claimed)',
  },
  MANUAL_CLAIM_SUCCESS: {
    code: 'SB3031',
  },
  MANUAL_CLAIM_FAILED: {
    code: 'SB3032',
  },
  MANUAL_CLAIM_AWARD_API_FAILED: {
    code: 'SB3033',
  },
  MANUAL_CLAIM_INVALID_CURRENCY: {
    code: 'SB3034',
  },
  MANUAL_CLAIM_ALREADY_CLAIMED: {
    code: 'SB3035',
  },
  MOVING_TO_FINISHED_PROMOTION_FAILED: {
    code: 'SB3036',
  },
  DELETE_PLAYER_PROMOTION_FAILED: {
    code: 'SB3037',
  },
} as const;

// Promotion Error Codes (PR31XX) - Ready for future use
export const PROMOTION_ERROR_CODES = {
  PROMOTION_NOT_FOUND: {
    code: 'PR3100',
  },
  PROMOTION_EXPIRED: {
    code: 'PR3101',
  },
  PROMOTION_NOT_ACTIVE: {
    code: 'PR3102',
  },
} as const;

// Announcement Error Codes (AN32XX) - Ready for future use
export const ANNOUNCEMENT_ERROR_CODES = {
  ANNOUNCEMENT_NOT_FOUND: {
    code: 'AN3200',
  },
  ANNOUNCEMENT_EXPIRED: {
    code: 'AN3201',
  },
} as const;

// Promotion Ticket Error Codes (PT33XX) - For tracking promotion usage
export const PROMOTION_TICKET_ERROR_CODES = {
  CREATION_SUCCESS: {
    code: 'PT3300',
  },
  CREATION_FAILED: {
    code: 'PT3301',
  },
  UPDATE_SUCCESS: {
    code: 'PT3302',
  },
  UPDATE_FAILED: {
    code: 'PT3303',
  },
  FETCH_FAILED: {
    code: 'PT3304',
  },
} as const;

// Type definitions for better TypeScript support
export type PlayerPromotionErrorCode =
  (typeof PLAYER_PROMOTION_ERROR_CODES)[keyof typeof PLAYER_PROMOTION_ERROR_CODES];
export type PromotionErrorCode = (typeof PROMOTION_ERROR_CODES)[keyof typeof PROMOTION_ERROR_CODES];
export type AnnouncementErrorCode =
  (typeof ANNOUNCEMENT_ERROR_CODES)[keyof typeof ANNOUNCEMENT_ERROR_CODES];
export type PromotionTicketErrorCode =
  (typeof PROMOTION_TICKET_ERROR_CODES)[keyof typeof PROMOTION_TICKET_ERROR_CODES];

// Union type for all error codes
export type ApplicationErrorCode =
  | PlayerPromotionErrorCode
  | PromotionErrorCode
  | AnnouncementErrorCode
  | PromotionTicketErrorCode;
