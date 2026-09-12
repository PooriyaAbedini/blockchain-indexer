import { Module } from '@nestjs/common';
import { CoreHelpersService } from './core-helpers.service.js';

@Module({
  providers: [CoreHelpersService],
  exports: [CoreHelpersService],
})
export class CoreHelpersModule {}
