export interface PlayerPromotion {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  promotionCode: string;
  currencyGroup: string;
  remainingBonusItems: number;
  initialBonusItem: number;
  betLevel: number;
  startDate: Date;
  endDate: Date;
  lastUsedDate: Date | null;
  isGiftCode: boolean;
  totalWinAmount: number;
  totalTurnover: number;
  minRequiredTurnover: number;
  createdAt?: Date;
  turnoverMultiplier: number;
  updatedAt?: Date;
}

export interface PlayerPromotionResponse {
  promotion?: PlayerPromotion | null;
}
