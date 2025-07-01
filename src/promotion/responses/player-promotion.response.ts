import { ApiProperty } from '@nestjs/swagger';
import { PlayerPromotion } from '../schemas/player-promotion.schema';
import { BaseApiResponse } from '../../constants/response-types';

export class PlayerPromotionResponse extends BaseApiResponse {
  @ApiProperty({ type: PlayerPromotion, nullable: true })
  promotion?: PlayerPromotion | null;
}
