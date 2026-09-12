import { Module } from '@nestjs/common';
import { OrchestrationService } from './orchestration.service.js';
import { OrchestrationHelper } from './orchestration.helper.js';

@Module({
  providers: [OrchestrationService, OrchestrationHelper],
})
export class JobOrchestrationModule {}
