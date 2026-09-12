import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { BASE_URLS } from '#app/lib/urls.js';
import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { WebSocketProvider } from 'ethers';
import type { ChainId } from '#app/core/constants/chains.js';

@Injectable()
export class ListenerService implements OnModuleDestroy {
  private readonly logger = new Logger(ListenerService.name);
  private wsProvider: WebSocketProvider | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private isConnecting = false;
  private isDisconnecting = false;
  private isShuttingDown = false;

  private lastEnqueuedBlock: bigint | null = null;

  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  async start(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || this.isShuttingDown) {
      return;
    }

    this.isConnecting = true;

    try {
      const apiKey = this.service.config.get<string>('config.apis.alchemy.apiKey')!;
      const url = BASE_URLS.alchemy.ethereum.ws.mainnet(apiKey);
      const provider = new WebSocketProvider(url);
      this.wsProvider = provider;
      this.registerSubscriptions(provider);
      const ws = (provider as any).websocket;

      ws.on('open', () => {
        if (this.wsProvider !== provider) {
          return;
        }

        this.logger.log('WS connected');

        this.reconnectAttempt = 0;

        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        this.isDisconnecting = false;
      });

      ws.on('close', async (code: number, reason: Buffer) => {
        if (this.wsProvider !== provider) {
          return;
        }

        this.logger.warn(
          `WS closed: code=${code} reason=${reason?.toString() ?? ''}`,
        );

        await this.handleDisconnect(provider);
      });

      ws.on('error', async (err: Error) => {
        if (this.wsProvider !== provider) {
          return;
        }

        this.logger.error(`WS error: ${err.message}`);

        await this.handleDisconnect(provider);
      });
    } finally {
      this.isConnecting = false;
    }
  }

  private registerSubscriptions(provider: WebSocketProvider): void {
    this.subscribeToBlocks(provider, 1);

    // Future subscriptions:
    // this.subscribeToPendingTransactions(provider);
    // this.subscribeToTransferEvents(provider);
    // this.subscribeToLogs(provider);
  }

  /**
   * Serializes asynchronous block handling so that only one
   * handleBlock() execution is active at a time.
   *
   * This is important because the WebSocket block listener does not
   * wait for an async event callback to finish before another block
   * event can be delivered.
   */
  private blockProcessingPromise: Promise<void> = Promise.resolve();

  private subscribeToBlocks(provider: WebSocketProvider, chainId: ChainId): void {
    provider.on('block', (blockNumber: number) => {
      this.blockProcessingPromise = this.blockProcessingPromise
        .then(() => this.handleBlock(provider, blockNumber - 1, chainId))
        .catch((error) => {
          this.logger.error(
            `Failed to handle block ${blockNumber}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    });
  }

  private async handleBlock(
    provider: WebSocketProvider,
    blockNumber: number,
    chainId: ChainId,
  ): Promise<void> {
    if (this.wsProvider !== provider) {
      return;
    }

    const incomingBlock = BigInt(blockNumber);

    if (this.lastEnqueuedBlock === null) {
      const syncState = await this.service.repo.syncState.findUniqueSyncState({
        where: {
          chain_id: chainId,
        },
      });

      if (!syncState?.live_started_at) {
        throw new Error(
          'There is no sync state or live sync has not started properly!',
        );
      }

      this.lastEnqueuedBlock = syncState.live_started_at;
    }

    if (incomingBlock < this.lastEnqueuedBlock) {
      throw new Error(
        `Incoming block ${incomingBlock} is lower than ` +
          `last enqueued block ${this.lastEnqueuedBlock}`,
      );
    }

    if (incomingBlock === this.lastEnqueuedBlock) {
      return;
    }

    const liveBlocks = new Set<bigint>();

    for (
      let block = this.lastEnqueuedBlock + 1n;
      block <= incomingBlock;
      block += 1n
    ) {
      liveBlocks.add(block);
    }

    const liveBlockNumbers = [...liveBlocks].map((block) => block.toString());

    const jobId = this.service.helper.queueHelper.createLiveSyncJobId(
      chainId,
      liveBlockNumbers,
    );

    await this.service.queue.addFIFOJob(
      'HandleLiveSync',
      'HandleLiveSync',
      {
        chainId,
        blockNumbers: liveBlockNumbers,
      },
      jobId,
    );

    this.lastEnqueuedBlock = incomingBlock;

    this.logger.debug(
      `[${new Date().toISOString()}] Enqueued live blocks ${JSON.stringify(liveBlockNumbers)}`,
    );
  }

  private async handleDisconnect(provider: WebSocketProvider): Promise<void> {
    if (this.isDisconnecting || this.isShuttingDown) {
      return;
    }

    if (this.wsProvider !== provider) {
      return;
    }

    this.isDisconnecting = true;

    this.wsProvider = null;

    try {
      await provider.destroy();
    } catch (error) {
      this.logger.debug(
        `Failed to destroy WebSocket provider: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (this.reconnectTimer) {
      this.isDisconnecting = false;
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 60_000);

    this.reconnectAttempt++;

    this.logger.warn(
      `Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.isDisconnecting = false;

      void this.connect();
    }, delay);
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.wsProvider) {
      const provider = this.wsProvider;

      this.wsProvider = null;

      try {
        await provider.destroy();
      } catch {}
    }
  }
}
