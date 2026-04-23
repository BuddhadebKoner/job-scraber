/**
 * Tiny circuit breaker. Opens after `threshold` consecutive failures,
 * stays open for `cooldownMs`, then half-opens to allow a probe.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 60_000,
  ) {}

  canRun(): boolean {
    if (this.failures < this.threshold) return true;
    return Date.now() - this.openedAt > this.cooldownMs;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold && this.openedAt === 0) {
      this.openedAt = Date.now();
    }
  }

  state(): "closed" | "open" | "half-open" {
    if (this.failures < this.threshold) return "closed";
    return Date.now() - this.openedAt > this.cooldownMs ? "half-open" : "open";
  }
}
