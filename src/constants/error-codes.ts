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
    message: 'Player Promotion Not Found',
    description: 'Player promotion not found in database',
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
    message: 'Stream Processing Error',
    description: 'Error occurred while processing TO progress',
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
    message: 'Bonus Already Claimed',
    description: 'Bonus has already been claimed by the player',
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
    message: 'No Active Bonus Win',
    description: 'Player does not have an active bonus win',
  },
  CLAIMING_EXPIRED: {
    code: 'SB3023',
    message: 'Claiming Expired',
    description: 'Claim expiration date has passed',
  },
  // Claim Bonus Wins - Specific Error Codes (SB3024-SB3029)
  CLAIM_TO_REQUIREMENT_NOT_MET: {
    code: 'SB3024',
    message: 'Turnover Requirement Not Met',
    description: 'Player has not met the minimum turnover requirement',
  },
  CLAIM_VERIFICATION_FAILED: {
    code: 'SB3025',
    message: 'Claim Verification Failed',
    description: 'Verification check failed - total win amount or turnover mismatch detected',
  },
  CLAIM_UPDATE_FAILED: {
    code: 'SB3026',
    message: 'Claim Update Failed',
    description:
      'Failed to update player promotion in database - promotion may have already been claimed or does not exist',
  },
  CLAIM_PROMOTION_NOT_FOUND: {
    code: 'SB3027',
    message: 'Promotion Not Found',
    description: 'Player promotion not found in database',
  },
  CLAIM_ACTUAL_WIN_MISMATCH: {
    code: 'SB3028',
    message: 'Actual Win Mismatch',
    description: 'Actual win amount does not match expected amount',
  },
  CLAIM_UNEXPECTED_ERROR: {
    code: 'SB3029',
    message: 'Unexpected Error',
    description: 'An unexpected error occurred during claim process',
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
