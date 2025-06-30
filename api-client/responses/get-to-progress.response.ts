export interface GetTOProgressResponse {
  success: boolean;
  totalTurnover: number;
  minRequiredTurnover: number;
  remainingTO: number;
  progressPercentage: number;
  canClaim: boolean;
  totalWinAmount: number;
  errorCode?: string;
  errorMessage?: string;
}
