import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { Queue } from './queue.js';
import { QueueHelper } from './queue.helper.js';

@Global()
@Module({
  providers: [QueueHelper, Queue, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
