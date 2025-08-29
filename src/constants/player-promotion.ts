export const PROMOTION_STATUS = {
  ACTIVE: 'Active',
  INELIGIBLE: 'Ineligible',
  TURN_OVER_MET: 'Turnover Met',
  BONUS_CLAIMED: 'Bonus Claimed',
  EXPIRED: 'Expired',
};

export const PLAYER_PROMOTION_AGGREGATION = {
  FIELDS: {
    TURNOVER_MULTIPLIER: 'turnoverMultiplier',
    TOTAL_TURNOVER: 'totalTurnover',
    MIN_REQUIRED_TURNOVER: 'minRequiredTurnover',
    TOTAL_WIN_AMOUNT: 'totalWinAmount',
    BONUS_CLAIMED: 'bonusClaimed',
    CLAIMED_AT: 'claimedAt',
    START_DATE: 'startDate',
    END_DATE: 'endDate',
    EXPIRED_DATE: 'claimExpirationDate',
  },
};
