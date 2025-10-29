import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for cancelling a running promotion before its scheduled end date
 *
 * @class CancelPromotionDto
 * @description Validates admin user ID for audit trail when cancelling a promotion
 */
export class CancelPromotionDto {
  @ApiProperty({
    description: 'Admin user ID performing the cancellation',
    example: 'admin123',
    required: true,
  })
  @IsString()
  adminUserId: string;
}
