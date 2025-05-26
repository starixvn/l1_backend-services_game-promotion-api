import { ApiProperty } from '@nestjs/swagger';
import { BaseApiResponse } from '../../constants/response-types';

export class DeductBonusItemResponse extends BaseApiResponse {}

export class DeductWithRollbackResponse extends BaseApiResponse {
  @ApiProperty({ description: 'Previous state data for potential rollback' })
  rollbackData?: {
    previousRemainingItems: number;
    previousLastUsedDate: Date | null;
  };
}

export class RollbackResponse extends BaseApiResponse {}
