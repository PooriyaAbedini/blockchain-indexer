import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Repository } from '#app/database/repositoryRegistry.js';
import { DatabaseService } from '#app/database/database.service.js';
import { serviceTokens } from './service-tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: serviceTokens.SERVICE_REGISTRY,
      // Lazy load to avoid ESM TDZ
      useFactory: async (
        moduleRef: ModuleRef,
        config: ConfigService,
        repo: Repository,
        db: DatabaseService,
      ) => {
        const { ServiceRegistry } = await import('./service-registry.js');
        return new ServiceRegistry(moduleRef, config, repo, db);
      },
      inject: [ModuleRef, ConfigService, Repository, DatabaseService],
    },
  ],
  exports: [serviceTokens.SERVICE_REGISTRY],
})
export class ServiceModule {}
