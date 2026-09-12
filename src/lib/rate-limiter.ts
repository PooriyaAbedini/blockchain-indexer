/**
 * Sliding-window rate limiter for RPC providers with per-minute quotas.
 */
export class RateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      this.prune(now);

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0];
      if (oldest === undefined) {
        continue;
      }

      const waitMs = oldest + this.windowMs - now + 1;
      if (waitMs > 0) {
        await sleep(waitMs);
        continue;
      }

      this.prune(Date.now());
    }
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0) {
      const oldest = this.timestamps[0];
      if (oldest === undefined || oldest > cutoff) {
        break;
      }
      this.timestamps.shift();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
