import type { ServiceRegistry } from '#app/core/service/service-registry.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { Context } from '#app/interfaces/index.js';
import { BASE_URLS, NetworkName, ProviderName } from '#app/lib/urls.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
export type RpcRetryOptions = {
  /** Total attempts including the first try. Default: 3 */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry. Default: 500 */
  baseDelayMs?: number;
  /** Cap for exponential backoff delay. Default: 8_000 */
  maxDelayMs?: number;
  /** Label used in logs (e.g. eth_getLogs). */
  label?: string;
  /** Override which errors are retryable. */
  isRetryable?: (error: unknown) => boolean;
};

export interface JsonRpcSender {
  send<T>(method: string, params: unknown[]): Promise<T>;
}

export interface JsonRpcBatchSender {
  sendBatch<T = unknown>(
    requests: JsonRpcBatchRequest[],
  ): Promise<JsonRpcBatchResponse<T>[]>;
}

export interface JsonRpcBatchRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown[];
}

export interface JsonRpcBatchResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 8_000;

@Injectable()
export class CoreHelpersService {
  private readonly logger = new Logger(CoreHelpersService.name);
  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  public onSuccessChecker = <T extends Context['onSuccess'][0]>(
    ctx: Context | undefined,
    fn: T,
  ): void => {
    if (ctx) {
      ctx.onSuccess.push(fn);
      return;
    }

    fn();
  };

  public onFailureChecker = <T extends Context['onFailure'][0]>(
    ctx: Context | undefined,
    fn: T,
  ): void => {
    if (ctx) {
      ctx.onFailure.push(fn);
    }
  };

  public getRpcUrl(): string {
    const provider =
      this.service.config.getOrThrow<ProviderName>('config.rpcProvider');
    const network = this.service.config.getOrThrow<NetworkName>('config.rpcNetwork');

    switch (`${provider}:${network}`) {
      case `${ProviderName.ALCHEMY}:${NetworkName.ETHEREUM_MAINNET}`: {
        const apiKey = this.service.config.getOrThrow<string>(
          'config.apis.alchemy.apiKey',
        );
        return BASE_URLS.alchemy.ethereum.http.mainnet(apiKey);
      }

      case `${ProviderName.ALCHEMY}:${NetworkName.ETHEREUM_SEPOLIA}`: {
        const apiKey = this.service.config.getOrThrow<string>(
          'config.apis.alchemy.apiKey',
        );
        return BASE_URLS.alchemy.ethereum.http.sepolia(apiKey);
      }

      case `${ProviderName.ANKR}:${NetworkName.ETHEREUM_MAINNET}`: {
        const apiKey = this.service.config.getOrThrow<string>(
          'config.apis.ankr.apiKey',
        );
        return BASE_URLS.ankr.ethereum.http.mainnet(apiKey);
      }

      case `${ProviderName.ANKR}:${NetworkName.ETHEREUM_SEPOLIA}`: {
        const apiKey = this.service.config.getOrThrow<string>(
          'config.apis.ankr.apiKey',
        );
        return BASE_URLS.ankr.ethereum.http.sepolia(apiKey);
      }

      case `${ProviderName.PUBLIC}:${NetworkName.ETHEREUM_MAINNET}`:
        return BASE_URLS.public.ethereum.http.mainnet;

      case `${ProviderName.PUBLIC}:${NetworkName.ETHEREUM_SEPOLIA}`:
        return BASE_URLS.public.ethereum.http.sepolia;

      default:
        throw new Error(`Unsupported provider/network: ${provider}:${network}`);
    }
  }

  /**
   * Transient RPC / network failures worth retrying.
   * Permanent filter/validation errors are not retried.
   */
  public isRetryableRpcError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const code = this.getErrorCode(error);

    if (
      message.includes('please specify an address') ||
      message.includes('invalid') ||
      message.includes('method not found') ||
      code === -32600 ||
      code === -32601 ||
      code === -32602
    ) {
      return false;
    }

    if (
      code === 'TIMEOUT' ||
      code === 'NETWORK_ERROR' ||
      code === 'SERVER_ERROR' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 429 ||
      code === -32005 ||
      code === -32000
    ) {
      return true;
    }

    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('network')
    );
  }

  /**
   * Run an async RPC call with exponential backoff retries.
   */
  public async withRpcRetry<T>(
    fn: (attempt: number) => Promise<T>,
    options: RpcRetryOptions = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    const label = options.label ?? 'rpc';
    const shouldRetry = options.isRetryable ?? ((e) => this.isRetryableRpcError(e));

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        const retryable = shouldRetry(error);
        const isLast = attempt >= maxAttempts;

        if (!retryable || isLast) {
          throw error;
        }

        const delayMs = this.computeRetryDelayMs(attempt, baseDelayMs, maxDelayMs);
        this.logger.warn(
          `${label} attempt ${attempt}/${maxAttempts} failed (${this.getErrorMessage(error)}); retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  /**
   * Send a JSON-RPC request with retries. Use from any RPC provider service.
   */
  public async sendRpc<T>(
    provider: JsonRpcSender,
    method: string,
    params: unknown[],
    options: Omit<RpcRetryOptions, 'label'> = {},
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    return this.withRpcRetry(
      async (attempt) => {
        this.logger.log(
          `RPC ${method} attempt=${attempt}/${maxAttempts} params=${JSON.stringify(params)}`,
        );
        return provider.send(method, params) as Promise<T>;
      },
      {
        ...options,
        maxAttempts,
        label: method,
      },
    );
  }

  public createBatch<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    return batches;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private getErrorCode(error: unknown): string | number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const record = error as Record<string, unknown>;
    if ('code' in record) return record.code as string | number;
    if (
      'error' in record &&
      record.error &&
      typeof record.error === 'object' &&
      'code' in (record.error as object)
    ) {
      return (record.error as { code: string | number }).code;
    }
    return undefined;
  }

  private computeRetryDelayMs(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
  ): number {
    const exp = baseDelayMs * 2 ** (attempt - 1); // exponential backoff delay (the wait time before next retry)
    const jitter = Math.floor(Math.random() * 100); // we are using a jitter to handle Thundering Herd Problem (when all workers are hitting error simultaneously) --> using this we are controling trafic spike
    return Math.min(exp + jitter, maxDelayMs);
  }
}
