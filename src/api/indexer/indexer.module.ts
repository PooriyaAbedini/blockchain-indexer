import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service.js';
import { IndexerController } from './indexer.controller.js';

@Module({
  providers: [IndexerService],
  controllers: [IndexerController],
})
export class IndexerModule {}
