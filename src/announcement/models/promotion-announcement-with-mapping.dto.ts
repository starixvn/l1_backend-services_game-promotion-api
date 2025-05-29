import { ApiProperty } from '@nestjs/swagger';
import { PromotionAnnouncement } from '../schemas/promotion-announcement.schema';

export class OperatorPromotionMappingDto {
  @ApiProperty()
  operatorId: string;

  @ApiProperty()
  promotionCode: string;
}

export class PromotionAnnouncementWithMappingsDto extends PromotionAnnouncement {
  @ApiProperty({ type: [OperatorPromotionMappingDto] })
  mappings: OperatorPromotionMappingDto[];
}
