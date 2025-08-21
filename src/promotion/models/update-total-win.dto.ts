import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTotalWinDto {
  @ApiProperty({ description: 'Player identifier' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'Operator identifier' })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({ description: 'Promotion identifier' })
  @IsString()
  @IsNotEmpty()
  promotionId: string;

  @ApiProperty({ description: 'Win amount to add to total' })
  @IsNumber()
  @IsNotEmpty()
  winAmount: number;
}
