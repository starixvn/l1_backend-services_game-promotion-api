import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PlayerDto {
  @ApiProperty({
    description: 'Operator identifier',
    example: 'op123',
  })
  @IsNotEmpty()
  @IsString()
  operatorId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site1',
  })
  @IsNotEmpty()
  @IsString()
  siteName: string;

  @ApiProperty({
    description: 'Player identifier',
    example: 'player123',
  })
  @IsNotEmpty()
  @IsString()
  playerId: string;
}
