import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ManualClaimBonusWinsDto {
  @ApiProperty({
    description: 'Promotion ID',
    example: '65f1a2b3c4d5e6f7g8h9i0j1',
  })
  @IsString()
  @IsNotEmpty()
  promotionId: string;

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
    description: 'Site ID',
    example: '4100300',
  })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'site1',
  })
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'INH',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Currency group identifier',
    example: '60d21b4667d0d01ce67a7e3b',
  })
  @IsString()
  @IsNotEmpty()
  currencyGroup: string;

  @ApiProperty({
    description: 'Game type ID for the award',
    example: 9999,
  })
  @IsNotEmpty()
  gameTypeId: number;

  @ApiProperty({
    description: 'Admin user ID performing the manual claim',
    example: 'admin456',
  })
  @IsString()
  @IsNotEmpty()
  adminUserId: string;
}
