import type { ParsedTransferLog } from '#app/interfaces/rpc/ethereum/ethereum-logs.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return undefined;
    return trimmed;
  }
  return value;
}

export class GetETHTransferLogsRequestDto {
  @ApiProperty({
    description: 'Start block number (inclusive)',
    example: 5_000_000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromBlock!: number;

  @ApiProperty({
    description: 'End block number (inclusive)',
    example: 5_000_005,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toBlock!: number;

  @ApiProperty({
    description: 'Whether add transaction receipt to the response or not',
    example: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  addTransactionReceipt!: boolean;

  @ApiPropertyOptional({
    description:
      'Optional contract address filter. Leave empty for all addresses (alchemy/ankr only). Do not type the word null.',
    example: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    type: String,
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, {
    message: 'address must be a valid Ethereum address',
  })
  address?: string;
}

export class ParsedTransferLogDto implements ParsedTransferLog {
  @ApiProperty({
    description: 'Sender address',
    example: '0x1111111111111111111111111111111111111111',
  })
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  from!: string;

  @ApiProperty({
    description: 'Recipient address',
    example: '0x2222222222222222222222222222222222222222',
  })
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  to!: string;

  @ApiProperty({
    description: 'Transfer amount (uint256 as decimal string)',
    example: '1000000',
  })
  @IsString()
  value!: string;

  @ApiProperty({
    description: 'Token/contract address that emitted the Transfer event',
    example: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  })
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  contractAddress!: string;

  @ApiProperty({ example: '0x4c4b40' })
  @IsString()
  blockNumber!: string;

  @ApiProperty({
    example: '0xdef4567890abc123def4567890abc123def4567890abc123def4567890abc123',
  })
  @IsString()
  transactionHash!: string;

  @ApiProperty({ example: '0x1' })
  @IsString()
  logIndex!: string;
}

export class TransactionReceiptLogDto {
  @ApiProperty({
    description: 'Address of the contract that emitted the log',
    example: '0x63355a2ff725b11b6d82071c9fd710c0dcc71900',
  })
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  address!: string;

  @ApiProperty({
    description: 'Log topics',
    example: [
      '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
      '0x0000000000000000000000003b54910405994ca0959fc0630df297ffda1b8814',
      '0x000000000000000000000000321ce961084fcf3a56de4be2f2006707a0421aa4',
    ],
  })
  @IsString({ each: true })
  topics!: string[];

  @ApiProperty({
    description: 'Non-indexed event data',
    example: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
  @IsString()
  data!: string;

  @ApiProperty({
    example: '0x72247ea9191db039158939f7ba958e638a32df4f61a43edcae60cb7a686a2d55',
  })
  @IsString()
  blockHash!: string;

  @ApiProperty({
    example: '0x4c4b40',
  })
  @IsString()
  blockNumber!: string;

  @ApiProperty({
    example: '0x6592aed4',
  })
  @IsString()
  blockTimestamp!: string;

  @ApiProperty({
    example: '0xc3e30fc09f87349b9f053aed25a3d436ee781d20a8b6af749e8f17453d09cef0',
  })
  @IsString()
  transactionHash!: string;

  @ApiProperty({
    example: '0x5',
  })
  @IsString()
  transactionIndex!: string;

  @ApiProperty({
    example: '0x3',
  })
  @IsString()
  logIndex!: string;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  removed!: boolean;
}

export class TransactionReceiptDto {
  @ApiProperty({
    example: '0x2',
  })
  @IsString()
  type!: string;

  @ApiProperty({
    example: '0x1',
    description: 'Transaction execution status. 0x1 = success, 0x0 = reverted.',
  })
  @IsString()
  status!: string;

  @ApiProperty({
    example: '0x1f74d2',
  })
  @IsString()
  cumulativeGasUsed!: string;

  @ApiProperty({
    type: [TransactionReceiptLogDto],
  })
  @ValidateNested({ each: true })
  @Type(() => TransactionReceiptLogDto)
  logs!: TransactionReceiptLogDto[];

  @ApiProperty({
    example: '0x0000000000000000000000000000000000000001000000000000000000000000',
  })
  @IsString()
  logsBloom!: string;

  @ApiProperty({
    example: '0xc3e30fc09f87349b9f053aed25a3d436ee781d20a8b6af749e8f17453d09cef0',
  })
  @IsString()
  transactionHash!: string;

  @ApiProperty({
    example: '0x5',
  })
  @IsString()
  transactionIndex!: string;

  @ApiProperty({
    example: '0x72247ea9191db039158939f7ba958e638a32df4f61a43edcae60cb7a686a2d55',
  })
  @IsString()
  blockHash!: string;

  @ApiProperty({
    example: '0x4c4b40',
  })
  @IsString()
  blockNumber!: string;

  @ApiProperty({
    example: '0x2053b',
  })
  @IsString()
  gasUsed!: string;

  @ApiProperty({
    example: '0xef461c4b',
  })
  @IsString()
  effectiveGasPrice!: string;

  @ApiProperty({
    example: '0x3b54910405994ca0959fc0630df297ffda1b8814',
  })
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  from!: string;

  @ApiProperty({
    example: '0x321ce961084fcf3a56de4be2f2006707a0421aa4',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  to!: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX)
  contractAddress!: string | null;
}

export class GetETHTransferLogsResponseDto {
  @ApiProperty({ type: [ParsedTransferLogDto] })
  @ValidateNested({ each: true })
  @Type(() => ParsedTransferLogDto)
  logs!: ParsedTransferLogDto[];

  @ApiPropertyOptional({
    type: [TransactionReceiptDto],
    description: 'Included only when addTransactionReceipt=true',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionReceiptDto)
  receipts?: TransactionReceiptDto[];
}
