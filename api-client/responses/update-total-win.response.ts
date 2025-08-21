export interface UpdateTotalWinResponse {
  success: boolean;
  totalWinAmount: number;
  remainingBonusItems: number;
  code?: string;
  message?: string;
}
