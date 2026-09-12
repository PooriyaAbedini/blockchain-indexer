import { Module } from '@nestjs/common';
import { ListenerService } from './listener.service.js';

@Module({
  providers: [ListenerService],
})
export class ListenerModule {}
