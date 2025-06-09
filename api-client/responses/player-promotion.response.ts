export interface PlayerPromotion {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  promotionCode: string;
  currencyGroup: string;
  remainingBonusItems: number;
  lastUsedDate: Date;
  betLevel: number;
  isGiftCode: boolean;
}

export interface PlayerPromotionResponse {
  promotion: PlayerPromotion | null;
}
