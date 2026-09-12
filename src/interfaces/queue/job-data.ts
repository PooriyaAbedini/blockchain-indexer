import type { ChainId } from '#app/core/constants/chains.js';
import type { QueueName } from './queue-name.js';

type JobDataMap = {
  EthereumMainnetHistoricalSync: {
    fromBlock: string;
    toBlock: string;
    maxBatchSize: string;
    sequenceRangeId: string;
  };
  HistoricalSyncGap: {
    fromBlock: string;
    toBlock: string;
    chainId: ChainId;
    gapId: string;
  };
  SyncGapHandler: {
    chainId: ChainId;
  };
  HandleLiveSync: {
    chainId: ChainId;
    blockNumbers: string[];
  };
};

type Prefix = '' | '0_' | '1_';

export type JobData<T extends QueueName = any> =
  (T extends `${Prefix}${infer BaseName extends keyof JobDataMap}`
    ? JobDataMap[BaseName]
    : never) & { job_seq_number?: number; _disable_log?: boolean };
