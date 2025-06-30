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
    message: 'Player promotion not found',
  },
  DEDUCTION_FAILED: {
    code: 'SB3001',
    message: 'Cannot deduct bonus item',
  },
  DEDUCTION_SUCCESS: {
    code: 'SB3002',
    message: 'Bonus item deducted successfully',
  },
  ROLLBACK_SUCCESS: {
    code: 'SB3003',
    message: 'Bonus item rollback successful',
  },
  ROLLBACK_FAILED: {
    code: 'SB3004',
    message: 'Cannot rollback bonus item deduction',
  },
  TO_REQUIREMENT_NOT_MET: {
    code: 'SB3005',
    message: 'Minimum turnover requirement not met',
  },
  BONUS_NOT_COMPLETED: {
    code: 'SB3006',
    message: 'All bonus items must be completed before calculating TO requirement',
  },
  INVALID_TARGET_GAME: {
    code: 'SB3007',
    message: 'Bet must be placed on target game for TO calculation',
  },
  STREAM_PROCESSING_ERROR: {
    code: 'SB3008',
    message: 'Error processing stream event',
  },
  UPDATE_TOTAL_WIN_SUCCESS: {
    code: 'SB3009',
    message: 'Total win amount updated successfully',
  },
  UPDATE_TOTAL_WIN_FAILED: {
    code: 'SB3010',
    message: 'Failed to update total win amount',
  },
  CALCULATE_TO_SUCCESS: {
    code: 'SB3011',
    message: 'TO requirement calculated successfully',
  },
  CALCULATE_TO_FAILED: {
    code: 'SB3012',
    message: 'Failed to calculate TO requirement',
  },
  UPDATE_TOTAL_TO_SUCCESS: {
    code: 'SB3013',
    message: 'Total turnover updated successfully',
  },
  UPDATE_TOTAL_TO_FAILED: {
    code: 'SB3014',
    message: 'Failed to update total turnover',
  },
  INVALID_TURNOVER_MULTIPLIER: {
    code: 'SB3015',
    message: 'Invalid turnover multiplier. Must be at least 2.0',
  },
  BONUS_WIN_CLAIM_SUCCESS: {
    code: 'SB3016',
    message: 'Bonus wins claimed successfully',
  },
  BONUS_WIN_CLAIM_FAILED: {
    code: 'SB3017',
    message: 'Failed to claim bonus wins',
  },
  BONUS_ALREADY_CLAIMED: {
    code: 'SB3018',
    message: 'Bonus wins have already been claimed',
  },
} as const;

// Promotion Error Codes (PR31XX) - Ready for future use
export const PROMOTION_ERROR_CODES = {
  PROMOTION_NOT_FOUND: {
    code: 'PR3100',
    message: 'Promotion not found',
  },
  PROMOTION_EXPIRED: {
    code: 'PR3101',
    message: 'Promotion has expired',
  },
  PROMOTION_NOT_ACTIVE: {
    code: 'PR3102',
    message: 'Promotion is not active',
  },
} as const;

// Announcement Error Codes (AN32XX) - Ready for future use
export const ANNOUNCEMENT_ERROR_CODES = {
  ANNOUNCEMENT_NOT_FOUND: {
    code: 'AN3200',
    message: 'Announcement not found',
  },
  ANNOUNCEMENT_EXPIRED: {
    code: 'AN3201',
    message: 'Announcement has expired',
  },
} as const;

// Promotion Ticket Error Codes (PT33XX) - For tracking promotion usage
export const PROMOTION_TICKET_ERROR_CODES = {
  CREATION_SUCCESS: {
    code: 'PT3300',
    message: 'Promotion ticket created successfully',
  },
  CREATION_FAILED: {
    code: 'PT3301',
    message: 'Failed to create promotion ticket',
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
