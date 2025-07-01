export interface CreatePromotionTicketDto {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  gameId: number;
  gameRoundId: number;
  appType: number;
  betAmount: number;
  winAmount: number;
}
