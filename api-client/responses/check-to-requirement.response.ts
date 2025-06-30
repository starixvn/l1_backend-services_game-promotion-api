export interface CheckTORequirementResponse {
  success: boolean;
  canClaim: boolean;
  totalTurnover: number;
  minRequiredTurnover: number;
  remainingTO: number;
  totalWinAmount: number;
  errorCode?: string;
  errorMessage?: string;
}
