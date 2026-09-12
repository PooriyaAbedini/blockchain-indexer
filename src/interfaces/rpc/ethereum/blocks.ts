import { EthereumTransaction, type TransactionResponse } from './transactions.js';

interface Withdrawal {
  index: string;
  validatorIndex: string;
  address: string;
  amount: string;
}

export interface EthereumBlock<T extends boolean> {
  hash: string;
  parentHash: string;

  sha3Uncles: string;
  miner: string;

  stateRoot: string;
  transactionsRoot: string;
  receiptsRoot: string;

  logsBloom: string;

  difficulty: string;
  number: string;

  gasLimit: string;
  gasUsed: string;

  timestamp: string;
  extraData: string;
  mixHash: string;
  nonce: string;

  baseFeePerGas: string | null;

  withdrawalsRoot?: string;
  blobGasUsed?: string;
  excessBlobGas?: string;
  parentBeaconBlockRoot?: string;
  requestsHash?: string;

  size: string;
  uncles: string[];
  transactions: TransactionResponse<T>[];
  withdrawals?: Withdrawal[];
}
