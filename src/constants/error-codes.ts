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

// Type definitions for better TypeScript support
export type PlayerPromotionErrorCode =
  (typeof PLAYER_PROMOTION_ERROR_CODES)[keyof typeof PLAYER_PROMOTION_ERROR_CODES];
export type PromotionErrorCode = (typeof PROMOTION_ERROR_CODES)[keyof typeof PROMOTION_ERROR_CODES];
export type AnnouncementErrorCode =
  (typeof ANNOUNCEMENT_ERROR_CODES)[keyof typeof ANNOUNCEMENT_ERROR_CODES];

// Union type for all error codes
export type ApplicationErrorCode =
  | PlayerPromotionErrorCode
  | PromotionErrorCode
  | AnnouncementErrorCode;
