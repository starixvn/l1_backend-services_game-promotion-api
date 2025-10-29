import { ApiProperty } from '@nestjs/swagger';

/**
 * Response data for a cancelled promotion
 *
 * @class CancelPromotionResponseData
 * @description Contains details about the cancelled promotion including dates and admin info
 */
export class CancelPromotionResponseData {
  @ApiProperty({
    description: 'Cancelled promotion ID',
    example: '507f1f77bcf86cd799439011',
  })
  promotionId: string;

  @ApiProperty({
    description: 'Promotion code',
    example: 'summer-promo-2025',
  })
  promotionCode: string;

  @ApiProperty({
    description: 'Original scheduled end date (before cancellation)',
    example: '2025-12-31T23:59:59.000Z',
  })
  originalEndDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'New end date (cancellation timestamp)',
    example: '2025-10-28T14:30:00.000Z',
  })
  newEndDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'Timestamp when cancellation occurred',
    example: '2025-10-28T14:30:00.000Z',
  })
  cancelledAt: string; // ISO 8601 format

  @ApiProperty({
    description: 'Admin user who performed the cancellation',
    example: 'admin123',
  })
  adminUserId: string;
}

/**
 * Standardized response for promotion cancellation endpoint
 *
 * @class CancelPromotionResponse
 * @description Follows constitution-mandated response format: { success, code, message, data }
 */
export class CancelPromotionResponse {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response code',
    example: 'PR3103',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Promotion cancelled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Cancellation details',
    type: CancelPromotionResponseData,
  })
  data: CancelPromotionResponseData;
}
