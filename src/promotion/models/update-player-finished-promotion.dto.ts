import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePlayerFinishedPromotionDto {
  @ApiProperty({ description: 'Player finished promotion ID' })
  @IsString()
  @IsNotEmpty()
  playerFinishedPromotionId: string;

  @ApiProperty({ description: 'Sequence number' })
  @IsString()
  @IsNotEmpty()
  seq: string;
}
