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
export class PromotionTicketsPlayerResponse {
  @ApiProperty({ description: 'List of promotion tickets' })
  tickets?: PromotionTicketDocument[];
}

export class GetPromotionTicketsPlayerResponse extends PromotionTicketsPlayerResponse {
  @ApiProperty({ description: 'Total number of pages', required: false })
  totalPages?: number;

  @ApiProperty({ description: 'Number of items per page', required: false })
  pageSize?: number;

  @ApiProperty({ description: 'Metadata for pagination', required: false })
  metaData?: {
    totalCount: number;
    totalBaseBetAmount: number;
    totalBaseWinAmount: number;
    totalWinAmount: number;
    totalBetAmount: number;
  };
}
