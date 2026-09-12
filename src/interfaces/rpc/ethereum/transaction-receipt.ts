export interface RawETHTransactionReceipt {
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  logs: TransactionLog[];
  logsBloom: string;
  status: string;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
  type: string;
}

interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  removed: boolean;
}

export type ETHTransactionReceipt = RawETHTransactionReceipt | null;
