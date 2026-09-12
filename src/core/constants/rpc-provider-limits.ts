import { ProviderName } from '#app/lib/urls.js';

export type RpcProviderLimits = {
  /** Max inclusive blocks per eth_getLogs RPC call (chunk size). */
  maxBlockSpan: number;
  /** Guaranteed requests/minute (Node API). Omit to disable throttling. */
  requestsPerMinute?: number;
  /** Max JSON-RPC batch size (Node API). Reserved for future batch calls. */
  maxBatchSize: number;
  /**
   * Max inclusive blocks when address is omitted (unfiltered Transfer scan).
   * Defaults to `maxBlockSpan`.
   */
  maxRequestSpanWithoutAddress?: number;
  /** Whether eth_getLogs without a contract address is supported. */
  allowsUnfilteredLogs?: boolean;
};

/**
 * Provider limits keyed by plan tier.
 * Ankr freemium: https://www.ankr.com/docs/rpc-service/service-plans/
 */
const RPC_PROVIDER_LIMITS: Record<ProviderName, RpcProviderLimits | undefined> = {
  [ProviderName.ANKR]: {
    maxBlockSpan: 3_000,
    requestsPerMinute: 1_800,
    maxBatchSize: 100,
    maxRequestSpanWithoutAddress: 10,
    allowsUnfilteredLogs: true,
  },
  [ProviderName.ALCHEMY]: {
    // Alchemy tolerates wider ranges; keep RPC chunks small when scanning all contracts.
    maxBlockSpan: 10,
    requestsPerMinute: 1_000,
    maxBatchSize: 100,
    maxRequestSpanWithoutAddress: 10,
    allowsUnfilteredLogs: true,
  },
  [ProviderName.PUBLIC]: {
    maxBlockSpan: 2_000,
    requestsPerMinute: 60,
    maxBatchSize: 5,
    allowsUnfilteredLogs: false,
  },
};

/** Use ~95% of documented limits to stay under guaranteed quotas. */
const RATE_LIMIT_SAFETY_FACTOR = 0.95;

export function getRpcProviderLimits(
  provider: string | undefined,
): RpcProviderLimits {
  const limits =
    RPC_PROVIDER_LIMITS[provider as ProviderName] ??
    RPC_PROVIDER_LIMITS[ProviderName.PUBLIC]!;

  if (!limits.requestsPerMinute) {
    return limits;
  }

  return {
    ...limits,
    requestsPerMinute: Math.floor(
      limits.requestsPerMinute * RATE_LIMIT_SAFETY_FACTOR,
    ),
  };
}

/** Max inclusive blocks for unfiltered API requests (no contract address). */
export function getMaxApiBlockSpan(provider: string | undefined): number {
  const limits = getRpcProviderLimits(provider);
  return limits.maxRequestSpanWithoutAddress ?? limits.maxBlockSpan;
}

export function providerAllowsUnfilteredLogs(provider: string | undefined): boolean {
  const limits =
    RPC_PROVIDER_LIMITS[provider as ProviderName] ??
    RPC_PROVIDER_LIMITS[ProviderName.PUBLIC]!;

  return limits.allowsUnfilteredLogs ?? false;
}

export function getInclusiveBlockCount(fromBlock: bigint, toBlock: bigint): bigint {
  return toBlock - fromBlock + 1n;
}

export function shouldChunkBlockRange(
  fromBlock: bigint,
  toBlock: bigint,
  maxBlockSpan: number,
): boolean {
  return getInclusiveBlockCount(fromBlock, toBlock) > maxBlockSpan;
}

export function* iterateBlockChunks(
  fromBlock: bigint,
  toBlock: bigint,
  maxBlockSpan: number,
): Generator<{ fromBlock: bigint; toBlock: bigint }> {
  for (let start = fromBlock; start <= toBlock; start += BigInt(maxBlockSpan)) {
    yield {
      fromBlock: start,
      toBlock:
        start + BigInt(maxBlockSpan) - 1n < BigInt(toBlock)
          ? start + BigInt(maxBlockSpan) - 1n
          : BigInt(toBlock),
    };
  }
}
