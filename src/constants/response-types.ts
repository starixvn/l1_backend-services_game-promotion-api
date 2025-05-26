import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response interface for all API operations
 */
export class BaseApiResponse {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Error or success code' })
  code: string;

  @ApiProperty({ description: 'Human-readable message' })
  message: string;
}

/**
 * Generic success response
 */
export class SuccessResponse extends BaseApiResponse {
  @ApiProperty({ example: true })
  success: true;
}

/**
 * Generic error response
 */
export class ErrorResponse extends BaseApiResponse {
  @ApiProperty({ example: false })
  success: false;
}
