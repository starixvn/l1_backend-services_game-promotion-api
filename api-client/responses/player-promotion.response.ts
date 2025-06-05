export interface PlayerPromotion {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  promotionCode: string;
  currencyGroup: string;
  remainingBonusItems: number;
  lastUsedDate: Date;
}

export interface PlayerPromotionResponse {
  promotion: PlayerPromotion | null;
}
