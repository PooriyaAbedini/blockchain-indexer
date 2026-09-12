import { Global, Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { BlockRepository } from './entities/block.repo.js';
import { SyncStateRepository } from './entities/chain-sync-state.repo.js';
import { ChianRepository } from './entities/chain.repo.js';
import { TokenTransferRepository } from './entities/token-transfer.repo.js';
import { TransactionRepository } from './entities/transaction.repo.js';
import { TokenRepository } from './entities/token.repo.js';
import { IndexerErrorRepository } from './entities/indexer-error.repo.js';
import { SyncGapRepository } from './entities/sync-gap.repo.js';
import { TransactionReceiptRepository } from './entities/transaction-receipt.js';
import { HistoricalSyncRangeRepository } from './entities/historical-sync-range.repo.js';

@Injectable()
@Global()
export class Repository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public block: BlockRepository = new BlockRepository(this.db);
  public syncState: SyncStateRepository = new SyncStateRepository(this.db);
  public chain: ChianRepository = new ChianRepository(this.db);
  public token: TokenRepository = new TokenRepository(this.db);
  public syncGap: SyncGapRepository = new SyncGapRepository(this.db);
  public tokenTransfer: TokenTransferRepository = new TokenTransferRepository(
    this.db,
  );
  public transaction: TransactionRepository = new TransactionRepository(this.db);

  public indexerError: IndexerErrorRepository = new IndexerErrorRepository(this.db);
  public transactionReceipt: TransactionReceiptRepository =
    new TransactionReceiptRepository(this.db);

  public historicalSyncRange: HistoricalSyncRangeRepository =
    new HistoricalSyncRangeRepository(this.db);
}
