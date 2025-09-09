export interface UpdatePromotionTicketDto {
  playerId: string;
  operatorId: string;
  siteName: string;
  promotionId: string;
  gameId: number;
  gameRoundId: number;
  appType: number;
  betAmount: number;
  winAmount: number;
  baseWinAmount: number;
}
