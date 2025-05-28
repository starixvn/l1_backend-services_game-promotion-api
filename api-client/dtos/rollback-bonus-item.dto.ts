export interface RollbackBonusItemDto {
  operatorId: string;
  playerId: string;
  promotionId: string;
  previousRemainingItems: number;
  previousLastUsedDate?: string;
}
