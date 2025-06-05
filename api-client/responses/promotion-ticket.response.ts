export interface PromotionTicket {
  _id: string;
  playerId: string;
  operatorId: string;
  gameId: number;
  gameRoundId: number;
  appType: number;
  betAmount: number;
  winAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromotionTicketResponse {
  success: boolean;
  code: string;
  message: string;
  ticket?: PromotionTicket;
}
