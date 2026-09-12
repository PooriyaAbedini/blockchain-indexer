import { EthereumTransaction } from '#app/interfaces/rpc/ethereum/transactions.js';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsBoolean } from 'class-validator';

export class GetETHBlocksByNumberRequestDto {
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
    description: 'Whether add the decoded transaction objects to blocks or not',
    example: true,
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  addTxns!: boolean;
}

export class WithdrawalDto {
  @ApiProperty({
    description: 'Withdrawal index within the beacon chain withdrawal queue.',
    example: '0x0',
  })
  index!: string;

  @ApiProperty({
    description: 'Validator index that initiated the withdrawal.',
    example: '0x12345',
  })
  validatorIndex!: string;

  @ApiProperty({
    description: 'Recipient Ethereum address.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  address!: string;

  @ApiProperty({
    description: 'Amount withdrawn in Gwei, represented as a hexadecimal string.',
    example: '0x59682f00',
  })
  amount!: string;
}

// TRANSACTIONS DTO:
/**
 * EIP-2930 access-list entry.
 */
export class AccessListEntryDto {
  @ApiProperty({
    description: 'Ethereum address declared in the access list.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  address!: string;

  @ApiProperty({
    description: 'Storage slots that the transaction expects to access.',
    type: [String],
    example: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
  })
  storageKeys!: string[];
}

/**
 * EIP-7702 authorization entry.
 */
export class AuthorizationDto {
  @ApiProperty({
    description: 'Chain ID for which this authorization is valid.',
    example: '0x1',
  })
  chainId!: string;

  @ApiProperty({
    description: 'Address of the contract to which execution is delegated.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  address!: string;

  @ApiProperty({
    description: 'Authorization nonce.',
    example: '0x2',
  })
  nonce!: string;

  @ApiProperty({
    description: 'ECDSA signature parity bit.',
    example: '0x1',
  })
  yParity!: string;

  @ApiProperty({
    description: 'ECDSA signature r value.',
    example: '0x6f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
  })
  r!: string;

  @ApiProperty({
    description: 'ECDSA signature s value.',
    example: '0x1f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
  })
  s!: string;
}

/**
 * Fields common to all Ethereum transaction types.
 */
export class BaseTransactionDto {
  @ApiProperty({
    description: 'Transaction hash.',
    example: '0x5e3d4c6a2c6a8a7b4c8f5f5b8d8d5e5f4e3d2c1b0a99887766554433221100aa',
  })
  hash!: string;

  @ApiProperty({
    description: 'Hash of the block containing this transaction.',
    example: '0xb3b20624d9f5c6d6bdf153e8f9b5d9fd4476c6e2e8f2ef4b8a4d56c89b9d7f12',
  })
  blockHash!: string;

  @ApiProperty({
    description: 'Block number containing this transaction.',
    example: '0x4c4b40',
  })
  blockNumber!: string;

  @ApiProperty({
    description: 'Zero-based transaction position within the block.',
    example: '0x0',
  })
  transactionIndex!: string;

  @ApiProperty({
    description: 'Address that sent the transaction.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  from!: string;

  @ApiProperty({
    description:
      'Transaction recipient address. Null when the transaction creates a contract.',
    nullable: true,
    example: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  })
  to!: string | null;

  @ApiProperty({
    description: 'Sender account nonce.',
    example: '0x15',
  })
  nonce!: string;

  @ApiProperty({
    description: 'Maximum amount of gas that the transaction is allowed to consume.',
    example: '0x5208',
  })
  gas!: string;

  @ApiProperty({
    description: 'Amount of ETH transferred by the transaction, in Wei.',
    example: '0xde0b6b3a7640000',
  })
  value!: string;

  @ApiProperty({
    description: 'Transaction calldata encoded as a hexadecimal string.',
    example: '0xa9059cbb000000000000000000000000...',
  })
  input!: string;

  @ApiProperty({
    description: 'ECDSA signature r value.',
    example: '0x6f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
  })
  r!: string;

  @ApiProperty({
    description: 'ECDSA signature s value.',
    example: '0x1f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
  })
  s!: string;
}

/**
 * Ethereum Legacy Transaction (Type 0).
 */
export class LegacyTransactionDto extends BaseTransactionDto {
  @ApiProperty({
    description: 'Legacy Ethereum transaction type.',
    example: '0x0',
    enum: ['0x0'],
  })
  type!: '0x0';

  @ApiProperty({
    description: 'Gas price offered by the sender, in Wei.',
    example: '0x59682f00',
  })
  gasPrice!: string;

  @ApiProperty({
    description:
      'ECDSA recovery identifier used by the legacy transaction signature.',
    example: '0x25',
  })
  v!: string;
}

/**
 * Common fields shared by typed transactions.
 *
 * EIP-2718 introduced typed transaction envelopes.
 */
export class TypedTransactionDto extends BaseTransactionDto {
  @ApiProperty({
    description: 'EIP-2718 transaction type identifier.',
    example: '0x2',
    enum: ['0x1', '0x2', '0x3', '0x4'],
  })
  type!: '0x1' | '0x2' | '0x3' | '0x4';

  @ApiProperty({
    description: 'Ethereum chain ID on which the transaction is valid.',
    example: '0x1',
  })
  chainId!: string;

  @ApiProperty({
    description: 'Access list containing addresses and storage slots.',
    type: [AccessListEntryDto],
    example: [
      {
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        storageKeys: [
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ],
      },
    ],
  })
  accessList!: AccessListEntryDto[];

  @ApiProperty({
    description: 'ECDSA signature parity bit.',
    example: '0x1',
  })
  yParity!: string;
}

/**
 * Ethereum Access List Transaction (Type 1).
 *
 * Introduced by EIP-2930.
 */
export class AccessListTransactionDto extends TypedTransactionDto {
  @ApiProperty({
    description: 'EIP-2930 access-list transaction type.',
    example: '0x1',
    enum: ['0x1'],
  })
  declare type: '0x1';

  @ApiProperty({
    description: 'Gas price offered by the sender, in Wei.',
    example: '0x59682f00',
  })
  gasPrice!: string;
}

/**
 * Common fields for EIP-1559 and newer fee-market transactions.
 */
export class Eip1559BaseTransactionDto extends TypedTransactionDto {
  @ApiProperty({
    description: 'Maximum total fee per gas the sender is willing to pay.',
    example: '0x77359400',
  })
  maxFeePerGas!: string;

  @ApiProperty({
    description:
      'Maximum priority fee per gas the sender is willing to pay to the validator.',
    example: '0x3b9aca00',
  })
  maxPriorityFeePerGas!: string;
}

/**
 * Ethereum EIP-1559 Transaction (Type 2).
 */
export class Eip1559TransactionDto extends Eip1559BaseTransactionDto {
  @ApiProperty({
    description: 'EIP-1559 transaction type.',
    example: '0x2',
    enum: ['0x2'],
  })
  declare type: '0x2';
}

/**
 * Ethereum Blob Transaction (Type 3).
 *
 * Introduced by EIP-4844.
 */
export class BlobTransactionDto extends Eip1559BaseTransactionDto {
  @ApiProperty({
    description: 'EIP-4844 blob transaction type.',
    example: '0x3',
    enum: ['0x3'],
  })
  declare type: '0x3';

  @ApiProperty({
    description: 'Maximum fee the sender is willing to pay per blob gas.',
    example: '0x12a05f200',
  })
  maxFeePerBlobGas!: string;

  @ApiProperty({
    description:
      'Versioned hashes identifying the blobs associated with this transaction.',
    type: [String],
    example: ['0x019f8d5f5d4d99887766554433221100ffeeddccbbaa99887766554433221100'],
  })
  blobVersionedHashes!: string[];

  @ApiProperty({
    description:
      'Recipient address. Blob transactions cannot be contract-creation transactions.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  declare to: string;
}

/**
 * Ethereum Set Code Transaction (Type 4).
 *
 * Introduced by EIP-7702.
 */
export class SetCodeTransactionDto extends Eip1559BaseTransactionDto {
  @ApiProperty({
    description: 'EIP-7702 set-code transaction type.',
    example: '0x4',
    enum: ['0x4'],
  })
  declare type: '0x4';

  @ApiProperty({
    description: 'List of authorization records used to delegate EOA execution.',
    type: [AuthorizationDto],
    example: [
      {
        chainId: '0x1',
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        nonce: '0x2',
        yParity: '0x1',
        r: '0x6f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
        s: '0x1f4f2c6a3cbd62ef5d4d99887766554433221100ffeeddccbbaa998877665544',
      },
    ],
  })
  authorizationList!: AuthorizationDto[];

  @ApiProperty({
    description: 'Recipient address. EIP-7702 transactions require a recipient.',
    example: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  })
  declare to: string;
}

/**
 * Transaction returned when eth_getBlockByNumber is called
 * with the second parameter set to false.
 */
export class TransactionHashDto {
  @ApiProperty({
    description:
      'Transaction hash returned when full transaction objects are not requested.',
    example: '0x5e3d4c6a2c6a8a7b4c8f5f5b8d8d5e5f4e3d2c1b0a99887766554433221100aa',
  })
  hash!: string;
}

@ApiExtraModels(
  LegacyTransactionDto,
  AccessListTransactionDto,
  Eip1559TransactionDto,
  BlobTransactionDto,
  SetCodeTransactionDto,
)
export class GetETHBlocksByNumberResponseDto {
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
