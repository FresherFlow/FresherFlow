import { getQueue } from '@fresherflow/queue';

export class CircuitBreaker {
  private failures = new Map<string, number>();
  private readonly threshold = 3;

  public recordFailure(target: string) {
    const count = (this.failures.get(target) || 0) + 1;
    this.failures.set(target, count);
  }

  public recordSuccess(target: string) {
    this.failures.delete(target);
  }

  public isOpen(target: string): boolean {
    return (this.failures.get(target) || 0) >= this.threshold;
  }

  public list() {
    return Array.from(this.failures.entries()).map(([target, count]) => ({
      target,
      count,
      isOpen: count >= this.threshold,
    }));
  }
}

export const circuitBreaker = new CircuitBreaker();

export function bindCircuitBreakerMetrics() {
  console.log('[Metrics] Circuit breaker source bound. Current state:', circuitBreaker.list());
}
