export interface EthereumLog {
  logIndex: string;
  removed: boolean;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  address: string;
  data: string;
  topics: string[];
}

export interface ParsedTransferLog {
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

export interface EthereumLogsRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result: EthereumLog[];
}
