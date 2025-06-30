export interface ClaimBonusWinsResponse {
  success: boolean;
  claimedAmount: number;
  totalTurnover: number;
  minRequiredTurnover: number;
  totalWinAmount: number;
  errorCode?: string;
  errorMessage?: string;
}
