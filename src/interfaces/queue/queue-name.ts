type Prefix = '' | '0_' | '1_';
export type BaseQueueName =
  | 'EthereumMainnetHistoricalSync'
  | 'HistoricalSyncGap'
  | 'SyncGapHandler'
  | 'HandleLiveSync';

export type QueueName = `${Prefix}${BaseQueueName}`;
