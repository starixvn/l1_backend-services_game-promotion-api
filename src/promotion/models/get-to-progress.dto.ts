import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GetTOProgressDto {
  @ApiProperty({
    description: 'Player ID',
    example: 'player123',
  })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({
    description: 'Operator ID',
    example: 'op123',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site456',
  })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({
    description: 'Promotion ID',
    example: '65f1a2b3c4d5e6f7g8h9i0j1',
  })
  @IsString()
  @IsNotEmpty()
  promotionId: string;
}
