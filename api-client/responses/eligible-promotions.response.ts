export interface EligiblePromotion {
  _id: string;
  name: string;
  code: string;
  operatorId: string;
  bonusItemCount: number;
  gameIds: number[];
  currencyGroup: string;
  startDate: string;
  endDate: string;
  isGiftCode: boolean;
}

export interface EligiblePromotionsResponse {
  promotions: EligiblePromotion[];
}
