export interface CreatePromotionTicketDto {
  playerId: string;
  operatorId: string;
  gameId: number;
  gameRoundId: number;
  appType: number;
  betAmount: number;
  winAmount: number;
}
