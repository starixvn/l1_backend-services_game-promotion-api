export interface PlayerPromotionPair {
  playerId: string;
  promotionId: string;
}

export interface QueryIncompletePromotionsDto {
  playerPromotionPairs: PlayerPromotionPair[];
}
