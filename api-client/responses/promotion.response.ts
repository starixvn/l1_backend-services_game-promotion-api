export interface BetLevelResponse {
  currencyGroup: string;
  betLevel: number;
}

export interface PromotionResponse {
  _id: string;
  name: string;
  code: string;
  operatorId: string;
  offeredSiteNames: string[];
  currencyGroups: string[];
  startDate: string;
  endDate: string;
  claimExpirationDate: string;
  bonusItemCount: number;
  offeredPlayerIds: string[];
  gameConfigType: number;
  gameIds: number[];
  betLevels: BetLevelResponse[];
  isGiftCode: boolean;
  minTurnoverMultiplier: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerStats {
  playerId: string;
  totalWin: number;
}

export interface PromotionExpiryResponse extends PromotionResponse {
  players: PlayerStats[];
}
