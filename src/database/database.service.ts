import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, type Prisma } from '#app/database/generated/prisma/client.js';
import * as ioredis from 'ioredis';
import { PrismaPg } from '@prisma/adapter-pg';
import { recordPrismaQueryStat } from './query-statistics.js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public static prisma: PrismaClient;
  private static redis: ioredis.Redis;
  private static prismaConnected = false;
  private static redisConnected = false;
  private static isShutdownInitiated = false;

  private static redisConfig: ioredis.RedisOptions;

  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    const enableQueryEvents = process.env.PRISMA_ENABLE_QUERY_EVENTS === 'true';

    // 1) Base prisma (attach events ONLY here)
    const basePrisma = new PrismaClient({
      adapter,
      log: enableQueryEvents
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
    });

    const canOn = typeof (basePrisma as any).$on === 'function';

    // Query events require emit:'event', level:'query'
    if (enableQueryEvents && canOn) {
      (basePrisma as any).$on('query', (event: Prisma.QueryEvent) => {
        if (event.duration > 200) {
          const MAX = 400;
          const params =
            event.params?.length > MAX
              ? event.params.slice(0, MAX) + '…'
              : event.params;
          this.logger.warn(`[PRISMA] ${event.duration}ms ${event.query} ${params}`);
        }
      });
    }

    // warn/error events (if supported)
    if (canOn) {
      (basePrisma as any).$on('error', (event: Prisma.LogEvent) => {
        this.logger.error(`Error: ${event.message}`);
      });
      (basePrisma as any).$on('warn', (event: Prisma.LogEvent) => {
        this.logger.warn(`Warn: ${event.message}`);
      });
    } else {
      // Edge client / unsupported runtime: do not crash
      this.logger.warn(
        'Prisma $on() not available. Skipping Prisma event listeners.',
      );
    }

    const extendedPrisma = basePrisma.$extends({
      name: 'prisma-query-stats',
      query: {
        $allOperations: async ({ model, operation, args, query }) => {
          const modelName = model ?? 'raw'; // raw ops have no model
          void recordPrismaQueryStat(
            DatabaseService.redis,
            modelName,
            operation,
          ).catch((e) => {});
          return query(args);
        },
      },
    });

    DatabaseService.prisma = extendedPrisma as unknown as PrismaClient;
  }

  async onModuleInit() {
    try {
      // Initializing Prisma
      if (!DatabaseService.prismaConnected) {
        await DatabaseService.prisma.$connect();
        DatabaseService.prismaConnected = true;
        this.logger.log('Prisma client connected.');
      }

      // Initializing Redis
      if (!DatabaseService.redisConnected) {
        const {
          REDIS_NO_CLUSTER_HOST,
          REDIS_NO_CLUSTER_PORT,
          REDIS_NO_CLUSTER_PASSWORD,
          REDIS_NO_CLUSTER_DATABASE_INDEX,
        } = process.env;

        DatabaseService.redisConfig = {
          port: +REDIS_NO_CLUSTER_PORT!,
          host: REDIS_NO_CLUSTER_HOST,
          connectTimeout: 10000,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };

        if (REDIS_NO_CLUSTER_PASSWORD) {
          DatabaseService.redisConfig.password = REDIS_NO_CLUSTER_PASSWORD;
        }
        if (REDIS_NO_CLUSTER_DATABASE_INDEX) {
          DatabaseService.redisConfig.db = +REDIS_NO_CLUSTER_DATABASE_INDEX;
        }

        DatabaseService.redis = new ioredis.Redis(DatabaseService.redisConfig);
        DatabaseService.redisConnected = true;
        DatabaseService.redis.on('connect', () =>
          this.logger.log('Redis client connected.'),
        );
        DatabaseService.redis.on('error', (err) =>
          this.logger.error('Redis client error', err),
        );
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error setting up databases: ${err.message}`);
      throw error;
    }
  }

  async onApplicationShutdown() {
    if (DatabaseService.isShutdownInitiated) {
      return;
    }
    DatabaseService.isShutdownInitiated = true;

    if (DatabaseService.prisma && DatabaseService.prismaConnected) {
      await DatabaseService.prisma.$disconnect();
      this.logger.log('Prisma client disconnected.');
    }

    if (DatabaseService.redis && DatabaseService.redis.status === 'ready') {
      await DatabaseService.redis.quit().catch((_) => {});
      this.logger.log('Redis client disconnected.');
    }
  }

  public getPrisma() {
    return DatabaseService.prisma;
  }

  public getRedis() {
    return DatabaseService.redis;
  }

  public getRedisConfig() {
    return DatabaseService.redisConfig;
  }
}
