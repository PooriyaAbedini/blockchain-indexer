import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { Transaction } from './transaction.js';
import { Repository } from './repositoryRegistry.js';
@Global()
@Module({
  providers: [DatabaseService, Transaction, Repository],
  exports: [DatabaseService, Transaction, Repository],
})
export class DatabaseModule {}
