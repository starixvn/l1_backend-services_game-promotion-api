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

@Schema({ timestamps: true, collection: 'promotion_announcements' })
export class PromotionAnnouncement {
  @ApiProperty({
    example: 'Super_Free_Spins_2024',
    description: 'Promotion title shown to client (letters, numbers, underscores only)',
  })
  @Prop({
    required: true,
  })
  promotionTitle: string;

  @ApiProperty({
    example: 'Get 50 free spins this summer!',
    description: 'Banner content shown to player',
  })
  @Prop({ required: true })
  bannerContent: string;

  @ApiProperty({
    description: 'Promotion rules and terms',
    example: 'Spins expire in 7 days...',
  })
  @Prop({ required: true })
  termsAndConditions: string;

  @ApiProperty({
    description: 'Display date range in GMT+7',
    example: '2024-06-01T00:00:00Z',
  })
  @Prop({
    type: Date,
    required: true,
  })
  displayDate: Date;

  @ApiProperty({
    type: [OperatorMapping],
    description: 'List of Operator-Promotion mappings (unique operatorId)',
  })
  @Prop({
    type: [OperatorMapping],
    validate: {
      validator: (mappings: OperatorMapping[]) => {
        const unique = new Set(mappings.map(m => m.operatorId));
        return unique.size === mappings.length;
      },
      message: 'Duplicate operatorId found.',
    },
  })
  promotionMappings: OperatorMapping[];
}

export const PromotionAnnouncementSchema = SchemaFactory.createForClass(PromotionAnnouncement);
