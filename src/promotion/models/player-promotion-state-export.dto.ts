import { OmitType } from '@nestjs/swagger';
import { PlayerPromotionStateDto } from './player-promotion-state.dto';

export class PlayerPromotionStateExportDto extends OmitType(PlayerPromotionStateDto, [
  'pageIndex',
  'pageSize',
] as const) {}
