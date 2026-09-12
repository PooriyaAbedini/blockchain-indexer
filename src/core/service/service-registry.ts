import { DatabaseService } from '#app/database/database.service.js';
import type { Repository } from '#app/database/repositoryRegistry.js';
import { Transaction } from '#app/database/transaction.js';
import { AxiosService } from '#app/global/modules/axios/axios.service.js';
import { ListenerService } from '#app/global/modules/listener/listener.service.js';
import { CoreHelpersService } from '#app/global/modules/core-helpers/core-helpers.service.js';
import { EthereumProvider } from '#app/global/modules/ethereum-provider/ethereum-provider.service.js';
import { OrchestrationHelper } from '#app/global/modules/orchestration/orchestration.helper.js';
import { QueueHelper } from '#app/lib/queue/queue.helper.js';
import { Queue } from '#app/lib/queue/queue.js';
import { QueueService } from '#app/lib/queue/queue.service.js';
import {
  forwardRef,
  Global,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ModuleRef } from '@nestjs/core';
import { IndexerService } from '#app/api/indexer/indexer.service.js';

type HelperServices = {
  queueHelper: QueueHelper;
  orchestrationHelper: OrchestrationHelper;
};

/**
 * A central registry for all services in the application.
 * It helps resolve circular dependency issues by providing a central point to access all services.
 * It uses ModuleRef.get() to lazily fetch services from NestJS container.
 */
@Injectable()
@Global()
export class ServiceRegistry implements OnModuleInit {
  private readonly logger = new Logger(ServiceRegistry.name);
  private serviceMap: Map<string, any> = new Map();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    private readonly repository: Repository,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {}

  onModuleInit() {
    this.logger.log('ServiceRegistry initialized.');
  }

  private getService<T>(serviceType: new (...args: any[]) => T): T {
    const serviceName = serviceType.name;

    if (!this.serviceMap.has(serviceName)) {
      try {
        const service = this.moduleRef.get(serviceType, { strict: false });
        this.serviceMap.set(serviceName, service);
        return service;
      } catch (error) {
        this.logger.error(`Failed to get service: ${serviceName}`, error);
        throw new Error(`Service ${serviceName} not found in the container`);
      }
    }
    // eslint-ignore-@typescript-eslint/no-unsafe-return
    return this.serviceMap.get(serviceName);
  }

  get config() {
    return this.configService;
  }

  get db() {
    return this.databaseService;
  }

  get repo() {
    return this.repository;
  }

  get axios() {
    return this.getService(AxiosService);
  }

  get ethereumProvider() {
    return this.getService(EthereumProvider);
  }

  get queue() {
    return this.getService(Queue);
  }

  get queueService() {
    return this.getService(QueueService);
  }

  get transaction() {
    return this.getService(Transaction);
  }

  get coreHelpers() {
    return this.getService(CoreHelpersService);
  }

  get listener() {
    return this.getService(ListenerService);
  }

  get indexerService() {
    return this.getService(IndexerService);
  }

  private _helperInstances: Partial<HelperServices> = {};

  get helper(): HelperServices {
    if (!this._helperInstances.queueHelper) {
      this._helperInstances.queueHelper = this.getService(QueueHelper);
    }
    if (!this._helperInstances.orchestrationHelper) {
      this._helperInstances.orchestrationHelper =
        this.getService(OrchestrationHelper);
    }
    return this._helperInstances as HelperServices;
  }
}
