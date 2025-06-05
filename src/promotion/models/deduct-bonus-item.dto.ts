import { IsString } from 'class-validator';

export class DeductBonusItemDto {
  @IsString()
  operatorId: string;

  @IsString()
  playerId: string;

  @IsString()
  promotionId: string;
}
