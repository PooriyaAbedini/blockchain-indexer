import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, Matches } from 'class-validator';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export class GetETHTokenMetadataRequestDto {
  @ApiPropertyOptional({
    description: 'Token contract addresses to fetch metadata for',
    type: [String],
    example: [
      '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    ],
  })
  @IsArray()
  @Matches(ETH_ADDRESS_REGEX, {
    each: true,
    message: 'each address must be a valid Ethereum address',
  })
  addresses!: string[];
}

export class GetETHTokenMetadataResponseDto {
  @ApiProperty({
    description: 'Ethereum token contract address',
    example: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  })
  address!: string;

  @ApiProperty({
    description: 'Token name',
    example: 'USD Coin',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
    nullable: true,
  })
  symbol!: string | null;

  @ApiProperty({
    description: 'Token decimals',
    example: 6,
    nullable: true,
  })
  decimals!: number | null;
}
