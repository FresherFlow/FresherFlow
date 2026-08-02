export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const backoff = delayMs * Math.pow(2, attempt);
      await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new Error("Unreachable");
}
