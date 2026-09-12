import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServiceModule } from './core/service/service.module.js';
import { DatabaseModule } from './database/database.module.js';
import config, { validationSchema } from './config/config.js';
import { AxiosModule } from './global/modules/axios/axios.module.js';
import { CoreHelpersModule } from './global/modules/core-helpers/core-helpers.module.js';
import { QueueModule } from './lib/queue/queue.module.js';
import { IndexerModule } from './api/indexer/indexer.module.js';
import { EthereumProviderModule } from './global/modules/ethereum-provider/ethereum-provider.module.js';
import { JobOrchestrationModule } from './global/modules/orchestration/orchestration.module.js';
import { ListenerModule } from './global/modules/listener/listener.module.js';

@Module({
  imports: [
    ServiceModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [config],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AxiosModule,
    CoreHelpersModule,
    QueueModule,
    IndexerModule,
    EthereumProviderModule,
    JobOrchestrationModule,
    ListenerModule,
  ],
  providers: [ConfigService, Logger],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {}
}
