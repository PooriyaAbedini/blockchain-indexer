import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import {
  AccessListTransactionDto,
  BlobTransactionDto,
  Eip1559TransactionDto,
  LegacyTransactionDto,
  SetCodeTransactionDto,
  WithdrawalDto,
} from './get-eth-blocks-by-number.js';

export class TestHistoricalAutomationRequestDto {
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
}

@ApiExtraModels(
  LegacyTransactionDto,
  AccessListTransactionDto,
  Eip1559TransactionDto,
  BlobTransactionDto,
  SetCodeTransactionDto,
)
export class TestHistoricalAutomationResponseDto {
  @ApiProperty({
    description: 'Unique block hash.',
    example: '0xb3b20624d9f5c6d6bdf153e8f9b5d9fd4476c6e2e8f2ef4b8a4d56c89b9d7f12',
  })
  hash!: string;

  @ApiProperty({
    description: 'Hash of the parent block.',
    example: '0x4f6ccce4d5a8f82f3df4f49eb4af7d6f56b4dc6cb0bb3f8e75f4d0d61d4c63d2',
  })
  parentHash!: string;

  @ApiProperty({
    description: "Keccak-256 hash of the block's uncle list.",
    example: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  })
  sha3Uncles!: string;

  @ApiProperty({
    description: 'Address that received the block reward.',
    example: '0x388c818ca8b9251b393131c08a736a67ccb19297',
  })
  miner!: string;

  @ApiProperty({
    description: 'Root hash of the world state trie after block execution.',
    example: '0x7f6d2b6a5e8e2cbbcb92f6b2f8c7d8c9d7a4f6b3c8e1d9b7a6f5c4b3a2d1e0f9',
  })
  stateRoot!: string;

  @ApiProperty({
    description: 'Root hash of the transactions trie.',
    example: '0x56e81f171bcc55a6ff8345e69d7065b1d7f7c9d5d8b4c2d3e4f5a6b7c8d9e0f1',
  })
  transactionsRoot!: string;

  @ApiProperty({
    description: 'Root hash of the transaction receipts trie.',
    example: '0x83cafc7f7d6d3c7d6e5f4b3a291817161514131211100f0e0d0c0b0a09080706',
  })
  receiptsRoot!: string;

  @ApiProperty({
    description: 'Bloom filter containing logs generated in the block.',
    example: '0x00000000000000000000000000000000...',
  })
  logsBloom!: string;

  @ApiProperty({
    description:
      'Mining difficulty for pre-Merge blocks. Usually 0 after the Merge.',
    example: '0x0',
  })
  difficulty!: string;

  @ApiProperty({
    description: 'Block number represented as a hexadecimal string.',
    example: '0x4c4b40',
  })
  number!: string;

  @ApiProperty({
    description: 'Maximum gas allowed in this block.',
    example: '0x1c9c380',
  })
  gasLimit!: string;

  @ApiProperty({
    description: 'Total gas consumed by all transactions in this block.',
    example: '0x11c379',
  })
  gasUsed!: string;

  @ApiProperty({
    description:
      'Unix timestamp when the block was produced, encoded as hexadecimal.',
    example: '0x65f1f540',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Additional arbitrary data included by the block producer.',
    example: '0xd883010d03846765746888676f312e32312e35',
  })
  extraData!: string;

  @ApiProperty({
    description:
      'Mix hash used in proof-of-work blocks. Retained for compatibility after the Merge.',
    example: '0x0000000000000000000000000000000000000000000000000000000000000000',
  })
  mixHash!: string;

  @ApiProperty({
    description: 'Proof-of-work nonce. Usually zeroed or unused after the Merge.',
    example: '0x0000000000000000',
  })
  nonce!: string;

  @ApiProperty({
    description:
      'Base fee per gas introduced by EIP-1559. Null for pre-EIP-1559 blocks.',
    nullable: true,
    example: '0x59682f00',
  })
  baseFeePerGas!: string | null;

  @ApiProperty({
    description: 'Root hash of all withdrawals included in the block.',
    required: false,
    example: '0xd4b8f7f0f7e6e5d4c3b2a1908172635443322110ffeeddccbbaa998877665544',
  })
  withdrawalsRoot?: string;

  @ApiProperty({
    description: 'Total blob gas consumed by blob transactions (EIP-4844).',
    required: false,
    example: '0x20000',
  })
  blobGasUsed?: string;

  @ApiProperty({
    description: 'Running excess blob gas value used to calculate blob fees.',
    required: false,
    example: '0x40000',
  })
  excessBlobGas?: string;

  @ApiProperty({
    description: 'Beacon chain block root associated with this execution block.',
    required: false,
    example: '0x5f7a0f2e3d4c5b6a79888776655443322110ffeeddccbbaa9988776655443322',
  })
  parentBeaconBlockRoot?: string;

  @ApiProperty({
    description:
      'Hash of execution-layer requests introduced by newer protocol upgrades.',
    required: false,
    example: '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  })
  requestsHash?: string;

  @ApiProperty({
    description: 'Serialized size of the block in bytes.',
    example: '0x5c32',
  })
  size!: string;

  @ApiProperty({
    description: 'List of uncle block hashes.',
    type: [String],
    example: [],
  })
  uncles!: string[];

  @ApiProperty({
    description:
      'Transactions included in the block. When addTxns is false, this contains transaction hashes. When addTxns is true, this contains complete transaction objects.',
    type: 'array',
    items: {
      oneOf: [
        { type: 'string' },
        { $ref: getSchemaPath(LegacyTransactionDto) },
        { $ref: getSchemaPath(AccessListTransactionDto) },
        { $ref: getSchemaPath(Eip1559TransactionDto) },
        { $ref: getSchemaPath(BlobTransactionDto) },
        { $ref: getSchemaPath(SetCodeTransactionDto) },
      ],
    },
    examples: {
      hashesOnly: {
        summary: 'Transaction hashes',
        value: [
          '0x5e3d4c6a2c6a8a7b4c8f5f5b8d8d5e5f4e3d2c1b0a99887766554433221100aa',
          '0x8c3f6b7e2a1d9f4e5c6b7a8d9e0f1a2b3c4d5e6f7081928374655647382910ab',
        ],
      },
      fullTransactions: {
        summary: 'Full transaction objects',
        value: [
          {
            type: '0x2',
            blockHash:
              '0xb3b20624d9f5c6d6bdf153e8f9b5d9fd4476c6e2e8f2ef4b8a4d56c89b9d7f12',
            blockNumber: '0x4c4b40',
            transactionIndex: '0x0',
            hash: '0x5e3d4c6a2c6a8a7b4c8f5f5b8d8d5e5f4e3d2c1b0a99887766554433221100aa',
            from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            to: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            nonce: '0x15',
            gas: '0x5208',
            maxFeePerGas: '0x77359400',
            maxPriorityFeePerGas: '0x3b9aca00',
            value: '0xde0b6b3a7640000',
            input: '0x',
            accessList: [],
            yParity: '0x1',
            r: '0x6f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
            s: '0x1f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
          },
        ],
      },
    },
  })
  transactions!: (
    | string
    | LegacyTransactionDto
    | AccessListTransactionDto
    | Eip1559TransactionDto
    | BlobTransactionDto
    | SetCodeTransactionDto
  )[];

  @ApiProperty({
    description: 'Validator withdrawals included in the block (Shanghai upgrade).',
    type: [WithdrawalDto],
    required: false,
  })
  withdrawals?: WithdrawalDto[];
}
