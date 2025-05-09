import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionAnnouncementDto } from './create-promotion-announcement.dto';

export class UpdatePromotionAnnouncementDto extends PartialType(CreatePromotionAnnouncementDto) {}
