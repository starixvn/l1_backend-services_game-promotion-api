export interface DeductBonusItemResponse {
  success: boolean;
  code: string;
  message: string;
  remainingItems?: number;
  lastUsedDate?: string;
}

export interface RollbackResponse {
  success: boolean;
  code: string;
  message: string;
  remainingItems?: number;
  lastUsedDate?: string;
}
