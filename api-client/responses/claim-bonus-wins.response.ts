export interface ClaimBonusWinsResponse {
  success: boolean;
  playerFinishedPromotionId: string;
  claimedAmount: number;
  totalTurnover: number;
  minRequiredTurnover: number;
  totalWinAmount: number;
  errorCode?: string;
  errorMessage?: string;
}
