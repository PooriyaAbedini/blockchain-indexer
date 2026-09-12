import type { ChainId } from '#app/core/constants/chains.js';
import type { QueueName } from './queue-name.js';

type JobDataMap = {
  EthereumMainnetHistoricalSync: {
    fromBlock: bigint;
    toBlock: bigint;
    maxBatchSize: bigint;
    sequenceRangeId: string;
  };
  HistoricalSyncGap: {
    fromBlock: bigint;
    toBlock: bigint;
    chainId: ChainId;
    gapId: string;
  };
  SyncGapHandler: {
    chainId: ChainId;
  };
  HandleLiveSync: {
    chainId: ChainId;
    blockNumbers: bigint[];
  };
};

type Prefix = '' | '0_' | '1_';

export type JobData<T extends QueueName = any> =
  (T extends `${Prefix}${infer BaseName extends keyof JobDataMap}`
    ? JobDataMap[BaseName]
    : never) & { job_seq_number?: number; _disable_log?: boolean };
