export interface CreatePromotionTicketDto {
  playerId: string;
  siteName: string;
  operatorId: string;
  gameRoundId: number;
  promotionId: string;
  gameId: number;
  betAmount: number;
  appType: number;
  winAmount: number;
}
