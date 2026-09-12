// Ethereum legacy ts (type 0)
export interface LegacyTransaction {
  type: '0x0';

  blockHash: string;
  blockNumber: string;
  transactionIndex: string;

  hash: string;
  from: string;
  to: string | null;

  nonce: string;
  gas: string;
  gasPrice: string;
  value: string;
  input: string;

  v: string;
  r: string;
  s: string;
}

/* Ethereum type 1 ts (access list)
  Type 1 was introduced by EIP-2930. Its purpose is 
  to let a transaction explicitly declare addresses and storage slots that
  it expects to access
*/
interface AccessListEntry {
  address: string;
  storageKeys: string[];
}

type AccessList = AccessListEntry[];

export interface AccessListTransaction {
  type: '0x1';

  blockHash: string;
  blockNumber: string;
  transactionIndex: string;

  hash: string;
  from: string;
  to: string | null;

  chainId: string;
  nonce: string;

  gas: string;
  gasPrice: string;

  value: string;
  input: string;

  accessList: AccessList;

  yParity: string;
  r: string;
  s: string;
}

/* Ethereum type 2 ts:
  This transaction type was introduced by EIP-1559.
  It replaced the old single gasPrice bidding model with:
  base fee +  priority fee <= max fee

 The base fee is determined by the protocol and burned; 
 the transaction specifies the maximum total fee and maximum priority 
 fee it is willing to pay.
*/
export interface Eip1559Transaction {
  type: '0x2';

  blockHash: string;
  blockNumber: string;
  transactionIndex: string;

  hash: string;
  from: string;
  to: string | null;

  chainId: string;
  nonce: string;

  gas: string;

  maxFeePerGas: string;
  maxPriorityFeePerGas: string;

  value: string;
  input: string;

  accessList: AccessList;

  yParity: string;
  r: string;
  s: string;
}

// Ethereum type 3 ts (Blob)
// Blob transactions cannot be contract-creation transactions; EIP-4844 requires to to be present.
export interface BlobTransaction {
  type: '0x3';

  blockHash: string;
  blockNumber: string;
  transactionIndex: string;

  hash: string;
  from: string;
  to: string;

  chainId: string;
  nonce: string;

  gas: string;

  maxFeePerGas: string;
  maxPriorityFeePerGas: string;

  value: string;
  input: string;

  accessList: AccessList;

  maxFeePerBlobGas: string;
  blobVersionedHashes: string[];

  yParity: string;
  r: string;
  s: string;
}

// Ethereum type 4 ts (Set Code Transaction)
// EIP-7702 allows an EOA to temporarily/transactionally operate using delegated code,
// enabling smart-account-like functionality while retaining the EOA address.
// The transaction contains an authorizationList.

interface Authorization {
  chainId: string;
  address: string;
  nonce: string;
  yParity: string;
  r: string;
  s: string;
}

export interface SetCodeTransaction {
  type: '0x4';

  blockHash: string;
  blockNumber: string;
  transactionIndex: string;

  hash: string;
  from: string;
  to: string;

  chainId: string;
  nonce: string;

  gas: string;

  maxFeePerGas: string;
  maxPriorityFeePerGas: string;

  value: string;
  input: string;

  accessList: AccessList;

  authorizationList: Authorization[];

  yParity: string;
  r: string;
  s: string;
}

export type EthereumTransaction =
  | LegacyTransaction
  | AccessListTransaction
  | Eip1559Transaction
  | BlobTransaction
  | SetCodeTransaction;

export type TransactionResponse<T extends boolean> = T extends true
  ? EthereumTransaction
  : string;
