import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PromotionAnnouncementDocument = PromotionAnnouncement & Document;

class OperatorMapping {
  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @Prop({ required: true })
  operatorId: string;

  @ApiProperty({ example: 'promo-summer-01', description: 'Promotion Code' })
  @Prop({ required: true })
  promotionCode: string;
}

class LocalizedString {
  [languageCode: string]: string;
}

@Schema({ timestamps: true, collection: 'promotion_announcements' })
export class PromotionAnnouncement {
  @ApiProperty({
    example: {
      'en-US': 'Super_Free_Spins_2024',
      'vi-VN': 'Vòng quay miễn phí siêu hot 2024',
    },
    description: 'Localized promotion titles (key = language code)',
  })
  @Prop({ type: Object, required: true })
  promotionTitle: LocalizedString;

  @ApiProperty({
    example: {
      'en-US': 'Get 50 free spins this summer!',
      'vi-VN': 'Nhận 50 lượt quay miễn phí mùa hè này!',
    },
    description: 'Localized banner content',
  })
  @Prop({ type: Object, required: true })
  bannerContent: LocalizedString;

  @ApiProperty({
    example: {
      'en-US': 'Spins expire in 7 days...',
      'vi-VN': 'Lượt quay hết hạn sau 7 ngày...',
    },
    description: 'Localized terms and conditions',
  })
  @Prop({ type: Object, required: true })
  termsAndConditions: LocalizedString;

  @ApiProperty({
    description: 'Start date of the promotion',
    example: '2024-06-01T00:00:00Z',
  })
  @Prop({
    type: Date,
    required: true,
  })
  fromDate: Date;

  @ApiProperty({
    description: 'End date of the promotion',
    example: '2024-06-01T00:00:00Z',
  })
  @Prop({
    type: Date,
    required: true,
  })
  toDate: Date;

  @ApiProperty({
    type: [OperatorMapping],
    description: 'List of Operator-Promotion mappings (unique operatorId)',
  })
  @Prop({
    type: [OperatorMapping],
    required: true,
  })
  promotionMappings: OperatorMapping[];

  @ApiProperty({
    example: 1,
    description: 'Template number offered by announcement',
  })
  @Prop({
    required: true,
  })
  template: number;
}

export const PromotionAnnouncementSchema = SchemaFactory.createForClass(PromotionAnnouncement);
