import { ApiProperty } from '@nestjs/swagger';
import { BaseApiResponse } from '../../constants/response-types';
import { PromotionTicketDocument } from '../schemas/promotion-ticket.schema';

export class CreatePromotionTicketResponse extends BaseApiResponse {
  @ApiProperty({ description: 'Created promotion ticket data' })
  ticket?: PromotionTicketDocument;
}

export class UpdatePromotionTicketResponse extends BaseApiResponse {
  @ApiProperty({ description: 'Updated promotion ticket data' })
  ticket?: PromotionTicketDocument;
}
