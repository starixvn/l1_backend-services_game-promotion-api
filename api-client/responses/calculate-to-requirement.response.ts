export interface CalculateTORequirementResponse {
  success: boolean;
  minRequiredTurnover: number;
  totalWinAmount: number;
  turnoverMultiplier: number;
  code?: string;
  message?: string;
}
