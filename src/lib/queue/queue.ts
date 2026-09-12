import { Global, Inject, Injectable, Logger } from '@nestjs/common';
import type { DatabaseService } from '#app/database/database.service.js';
import {
  Queue as BullQueue,
  Worker,
  type Processor,
  type Job,
  type RepeatOptions,
  type JobsOptions,
  type WorkerOptions,
  type JobType,
} from 'bullmq';
import type * as ioredis from 'ioredis';
import type { QueueName, JobData, BaseQueueName } from '#app/interfaces/index.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';

/**
 * when more than one instance of application is running on a server, sometimes delayed jobs are not working
 * properly so we tried to use prefixes for queue names to avoid this issue
 * "prefixedName"s are added to achive this goal
 */

@Global()
@Injectable()
export class Queue {
  static connectionToRedis: ioredis.Redis;
  static queues: { [K in QueueName]?: BullQueue };
  static workers: { [key: string]: Worker };

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {
    Queue.connectionToRedis = this.service.db.getRedis();
    /* Make sure that your redis instance has the setting 
    maxmemory-policy=noeviction
    in order to avoid automatic removal of keys which would cause unexpected errors in BullMQ */
    Queue.queues = {};
    Queue.workers = {};
  }

  private readonly logger: Logger = new Logger(Queue.name);

  getPrefixForQueueName = (): string => {
    const prefix = process.env.JOB_QUEUES_NAME_PREFIX;
    return prefix ?? '';
  };

  createNewQueue = async (name: QueueName, defaultJobOptions?: JobsOptions) => {
    const queueNamePrefix = this.getPrefixForQueueName();
    const prefixedName = `${queueNamePrefix}_${name}` as QueueName;
    const queueExists = Queue.queues[prefixedName];
    if (queueExists) return queueExists;
    const queue = new BullQueue(prefixedName, {
      connection: this.service.db.getRedisConfig(),
      defaultJobOptions,
      prefix: `{${queueNamePrefix}_BULLMQ}`,
    });

    Queue.queues[prefixedName] = queue;
    return queue;
  };

  createNewWorker<T extends QueueName, ReturnType>(
    queueName: T,
    workerName: string,
    workerFunction: Processor<JobData<T>, ReturnType, string>,
    opts: Partial<WorkerOptions> = {},
  ) {
    this.checkQueueExistence(queueName);

    const queueNamePrefix = this.getPrefixForQueueName();

    const worker = new Worker<JobData<T>, ReturnType>(
      `${queueNamePrefix}_${queueName}`,
      workerFunction,
      {
        ...opts,
        lockDuration: 120_000,
        lockRenewTime: 60_000,
        connection: this.service.db.getRedisConfig(),
        prefix: `{${queueNamePrefix}_BULLMQ}`,
      },
    );

    Queue.workers[workerName] = worker;
    this._workerListener(worker);

    return worker;
  }

  shutdownWorker = (worker: Worker) => {
    return worker.close();
  };

  addFIFOJob = <T extends QueueName>(
    queueName: T,
    jobName: string,
    data: JobData<T>,
    customJobId?: string,
    opts?: JobsOptions,
  ) => {
    const queue = this.checkQueueExistence(queueName);
    return queue.add(jobName, data, { jobId: customJobId, ...opts });
  };

  addDelayedJob = <T extends QueueName>(
    queueName: T,
    jobName: string,
    delay: number, // milliseconds
    data: JobData<T>,
    customJobId?: string,
  ) => {
    const queue = this.checkQueueExistence(queueName);
    const options: JobsOptions = { delay };
    if (customJobId) options.jobId = customJobId;
    return queue.add(jobName, data, options);
  };

  /**
   * Attempts to create a delayed job which the delay will only be considered after the current delay in the queue is passed
   *
   * For example if all jobs in the queue are planned to be triggered/finished in 4000ms and the {@link delay} is 3000ms, then the job
   * will be triggered in 7000ms
   *
   * Beware that this method **will not work consistently** due to concurrency problems since there can be multiple instances of
   * the app up and running. However its combination with Worker rate limiters can lead to satisfying results
   */

  addRepeatableJob = <T extends QueueName>(
    queueName: T,
    jobName: string,
    repeat: Omit<RepeatOptions, 'key'>,
    data: JobData<T>,
  ) => {
    const queue = this.checkQueueExistence(queueName);
    // BullMQ v6 removed `repeat` from JobsOptions / Queue.add — use Job Schedulers instead
    return queue.upsertJobScheduler(jobName, repeat, {
      name: jobName,
      data,
    });
  };

  getRepeatableJobs = async <T extends QueueName>(queueName: T) => {
    const queue = this.checkQueueExistence(queueName);
    return await queue.getJobSchedulers();
  };

  getJob = async <T extends QueueName>(queueName: T, jobId: string) => {
    const queue = this.checkQueueExistence(queueName);
    return await queue.getJob(jobId);
  };

  removeRepeatableJob = async <T extends QueueName>(queueName: T, key: string) => {
    const queue = this.checkQueueExistence(queueName);
    return await queue.removeJobScheduler(key);
  };

  removeJob = <T extends QueueName>(queueName: T, jobId: string) => {
    const queue = this.checkQueueExistence(queueName);
    return queue.remove(jobId);
  };

  getQueue(queueName: BaseQueueName) {
    const queueNamePrefix = this.getPrefixForQueueName();
    const prefixedQueueName = `${queueNamePrefix}_${queueName}` as QueueName;
    if (queueName.startsWith('0') || queueName.startsWith('1'))
      return { queue: Queue.queues[queueName], prefixedQueueName };
    return { queue: Queue.queues[prefixedQueueName], prefixedQueueName };
  }

  getWorker(workerName: QueueName): Worker | undefined {
    return Queue.workers[workerName] as Worker;
  }

  getJobs = async <T extends QueueName>(
    queueName: T,
    states?: JobType[],
    start?: number,
    end?: number,
  ) => {
    const queue = Queue.queues[queueName] as BullQueue;
    const jobs = await queue.getJobs(states, start, end);

    return jobs;
  };

  private getDelayedJobsCount = (queue: BullQueue<any, any, string>) => {
    return queue.getJobCountByTypes('delayed');
  };

  private _workerListener = (worker: Worker) => {
    worker
      .waitUntilReady()
      .then(() => {
        worker.concurrency = 1;
      })
      .catch((err) => {
        this.logger.error(
          `Worker for queue ${worker.name} failed to initialize:`,
          err,
        );
      });

    worker.on('completed', (job: Job) => {
      if (job.data._disable_log) return;
      this.logger.log(`job ${job.id}  is completed`);
    });

    worker.on('progress', (job: Job) => {
      if (job.data._disable_log) return;
      this.logger.log(`job ${job.id}  is in progress`);
    });

    worker.on('failed', (job, failedReason) => {
      this.logger.error(
        `Job failed.\n` +
          `Queue: ${worker.name}\n` +
          `Job: ${job?.id ?? 'unknown'}\n` +
          `Reason: ${
            failedReason instanceof Error ? failedReason.stack : String(failedReason)
          }`,
      );
    });

    worker.on('error', (error) => {
      if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      } else {
        this.logger.error(String(error));
      }
    });
  };

  checkQueueExistence = (queueName: QueueName) => {
    const queueNamePrefix = this.getPrefixForQueueName();
    const prefixedQueueName = `${queueNamePrefix}_${queueName}` as QueueName;
    const queue = Queue.queues[prefixedQueueName] as BullQueue;

    if (!queue) {
      this.logger.error(
        new Error(`queue ${queueNamePrefix}_${queueName} is not exist`),
      );
      throw new Error(`queue ${queueNamePrefix}_${queueName} is not exist`);
    }

    return queue;
  };

  getQueues = () => {
    return Queue.queues;
  };

  // WARNING: DANGEROUS FUNCTIONS
  // isCancelled = async (job: Job) => {
  //   const cancelKey = `cancel:${job.queueName}:${job.id}`;
  //   return await Queue.connectionToRedis.get(cancelKey) === '1';
  // };

  // stopJob = async <T extends QueueName>(queueName: T, jobId: string): Promise<boolean> => {
  //   const queue = this.checkQueueExistence(queueName);
  //   const job = await queue.getJob(jobId);

  //   if (!job) {
  //     this.logger.warn(`Job with ID ${jobId} not found in queue ${queueName}`);
  //     return false;
  //   }

  //   const state = await job.getState();

  //   if (['waiting', 'delayed', 'paused'].includes(state)) {
  //     await job.remove();
  //     this.logger.log(`Job ${jobId} removed from queue ${queueName}`);
  //     return true;
  //   }

  //   if (state === 'active') {
  //     const cancelKey = `cancel:${job.queueName}:${job.id}`;
  //     await Queue.connectionToRedis.set(cancelKey, '1', 'EX', 3600);
  //     this.logger.warn(`Cancel flag set for active job ${jobId}`);

  //     const worker = this.getWorker(queueName);

  //     if (worker) {
  //       await worker.close();
  //       delete Queue.workers[queueName];
  //       this.logger.warn(`Worker for queue ${queueName} was closed`);
  //     }

  //     // Wait a bit to let the job cleanup
  //     await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5s delay

  //     const jobAfterShutdown = await queue.getJob(jobId);

  //     if (jobAfterShutdown) {
  //       const finalState = await jobAfterShutdown.getState();

  //       if (['completed', 'failed', 'active'].includes(finalState)) {
  //         await jobAfterShutdown.remove();
  //         this.logger.log(`Cancelled job ${jobId} removed from queue ${queueName}`);
  //       }
  //     }

  //     return true;
  //   }

  //   this.logger.warn(`Job ${jobId} is in state "${state}" and cannot be stopped`);
  //   return false;
  // };
}
