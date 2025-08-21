import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class PlayerDto {
  @ApiProperty({
    description: 'Game ID',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  gameId: number;

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
    description: 'Currency group identifier',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsNotEmpty()
  @IsString()
  currencyGroup: string;

  @ApiProperty({
    description: 'Player identifier',
    example: 'player123',
  })
  @IsNotEmpty()
  @IsString()
  playerId: string;
}
