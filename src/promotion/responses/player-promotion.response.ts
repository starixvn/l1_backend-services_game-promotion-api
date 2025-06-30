import { ApiProperty } from '@nestjs/swagger';
import { PlayerPromotion } from '../schemas/player-promotion.schema';

export class PlayerPromotionResponse {
  @ApiProperty({ type: PlayerPromotion, nullable: true })
  promotion?: PlayerPromotion | null;
}
