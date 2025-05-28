export interface EligiblePromotion {
  _id: string;
  name: string;
  code: string;
  operatorId: string;
  bonusItemCount: number;
  startDate: string;
  endDate: string;
}

export interface EligiblePromotionsResponse {
  promotions: EligiblePromotion[];
}
