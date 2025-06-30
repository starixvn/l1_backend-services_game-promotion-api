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
  totalTurnover: number;
  totalWinAmount: number;
  minRequiredTurnover: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlayerPromotionResponse {
  success: boolean;
  code?: string;
  message?: string;
  promotion?: PlayerPromotion | null;
}
